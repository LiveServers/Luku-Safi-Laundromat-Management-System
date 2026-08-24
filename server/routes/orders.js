const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireOwner } = require('../middleware');

const router = express.Router();

function mapOrderRow(row) {
  return {
    id: row.id,
    customer_id: row.customer_id,
    service_type: row.service_type,
    order_date: row.order_date,
    weight: parseFloat(row.weight),
    items: row.items,
    subtotal: parseFloat(row.subtotal),
    discount_amount: parseFloat(row.discount_amount),
    discount_reason: row.discount_reason,
    total_amount: parseFloat(row.total_amount),
    payment_status: row.payment_status,
    status: row.status,
    transaction_code: row.transaction_code,
    notes: row.notes,
    created_at: row.created_at,
    completed_at: row.completed_at,
    updated_at: row.updated_at,
    membership_id: row.membership_id || null,
    membership_kg_used: parseFloat(row.membership_kg_used) || 0,
    purchased_membership_id: row.purchased_membership_id || null,
    customers: row.customer_name ? {
      id: row.customer_id,
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone
    } : null,
    location: row.location_name ? {
      id: row.location_id,
      name: row.location_name
    } : null,
    updated_by_user: row.updated_by_user_name ? {
      id: row.updated_by_user_id,
      name: row.updated_by_user_name
    } : null
  };
}

async function debitMembershipKg(client, customerId, kgNeeded) {
  if (!kgNeeded || kgNeeded <= 0) {
    return { kgUsed: 0, membershipId: null };
  }

  const memberships = await client.query(
    `SELECT * FROM customer_memberships
     WHERE customer_id = $1 AND status = 'active' AND kg_remaining > 0
     ORDER BY created_at ASC`,
    [customerId]
  );

  let remaining = kgNeeded;
  let membershipId = null;

  for (const membership of memberships.rows) {
    if (remaining <= 0) break;
    const available = parseFloat(membership.kg_remaining);
    const take = Math.min(remaining, available);
    const nextRemaining = available - take;

    await client.query(
      `UPDATE customer_memberships
       SET kg_remaining = $1, status = $2
       WHERE id = $3`,
      [nextRemaining, nextRemaining <= 0 ? 'depleted' : 'active', membership.id]
    );

    if (!membershipId) membershipId = membership.id;
    remaining -= take;
  }

  return { kgUsed: kgNeeded - remaining, membershipId };
}

const ORDER_SELECT = `
  SELECT
    o.*,
    c.id as customer_id,
    c.name as customer_name,
    c.email as customer_email,
    c.phone as customer_phone,
    l.id as location_id,
    l.display_name as location_name,
    u.id as updated_by_user_id,
    u.name as updated_by_user_name
  FROM orders o
  LEFT JOIN customers c ON o.customer_id = c.id
  LEFT JOIN locations l ON o.location_id = l.id
  LEFT JOIN users u ON o.updated_by = u.id
`;

// Get all orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const paymentStatus = req.query.paymentStatus || '';

    // Build WHERE clause
    let whereClause = '';
    let queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` WHERE (c.name ILIKE $${paramCount} OR o.service_type ILIKE $${paramCount} OR o.transaction_code ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (status === 'incomplete') {
      whereClause += whereClause
        ? ` AND o.status NOT IN ('completed', 'cancelled')`
        : ` WHERE o.status NOT IN ('completed', 'cancelled')`;
    } else if (status) {
      paramCount++;
      whereClause += whereClause ? ` AND o.status = $${paramCount}` : ` WHERE o.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (paymentStatus) {
      paramCount++;
      whereClause += whereClause ? ` AND o.payment_status = $${paramCount}` : ` WHERE o.payment_status = $${paramCount}`;
      queryParams.push(paymentStatus);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    const result = await db.query(`
      ${ORDER_SELECT}
      ${whereClause}
      ORDER BY
        CASE WHEN o.status IN ('completed', 'cancelled') THEN 1 ELSE 0 END,
        o.order_date DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...queryParams, limit, offset]);

    const totalPages = Math.ceil(total / limit);
    const orders = result.rows.map(mapOrderRow);

    res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single order
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`${ORDER_SELECT} WHERE o.id = $1`, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(mapOrderRow(result.rows[0]));
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create order
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      customer_id,
      location_id,
      service_type,
      order_date,
      weight,
      items,
      subtotal,
      discount_amount,
      discount_reason,
      total_amount,
      payment_status,
      status,
      transaction_code,
      notes,
      purchase_plan_id,
      use_membership
    } = req.body;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      let purchasedMembershipId = null;
      if (purchase_plan_id) {
        const planResult = await client.query(
          'SELECT * FROM membership_plans WHERE id = $1 AND is_active = true',
          [purchase_plan_id]
        );
        if (planResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Membership plan not found' });
        }
        const plan = planResult.rows[0];
        const membershipResult = await client.query(
          `INSERT INTO customer_memberships (customer_id, plan_id, kg_total, kg_remaining, status)
           VALUES ($1, $2, $3, $3, 'active') RETURNING *`,
          [customer_id, plan.id, parseFloat(plan.kg_allowance)]
        );
        purchasedMembershipId = membershipResult.rows[0].id;
      }

      let membershipId = null;
      let membershipKgUsed = 0;
      if (use_membership || purchase_plan_id) {
        const debit = await debitMembershipKg(client, customer_id, parseFloat(weight) || 0);
        membershipId = debit.membershipId;
        membershipKgUsed = debit.kgUsed;
      }

      const result = await client.query(`
        INSERT INTO orders (
          customer_id, location_id, service_type, order_date, weight, items,
          subtotal, discount_amount, discount_reason, total_amount,
          payment_status, status, transaction_code, notes,
          membership_id, membership_kg_used, purchased_membership_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `, [
        customer_id,
        location_id,
        service_type,
        order_date || new Date().toISOString().split('T')[0],
        parseFloat(weight) || 0,
        parseInt(items) || 0,
        parseFloat(subtotal) || 0,
        parseFloat(discount_amount) || 0,
        discount_reason,
        parseFloat(total_amount),
        payment_status || 'pending',
        status || 'received',
        transaction_code,
        notes,
        membershipId,
        membershipKgUsed,
        purchasedMembershipId
      ]);

      await client.query('COMMIT');

      const orderResult = await db.query(`${ORDER_SELECT} WHERE o.id = $1`, [result.rows[0].id]);
      res.status(201).json(mapOrderRow(orderResult.rows[0]));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update order
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      customer_id,
      location_id,
      service_type,
      order_date,
      weight,
      items,
      subtotal,
      discount_amount,
      discount_reason,
      total_amount,
      payment_status,
      status,
      transaction_code,
      notes
    } = req.body;

    const result = await db.query(`
      UPDATE orders SET 
        customer_id = $1,
        location_id = $2,
        service_type = $3,
        order_date = $4,
        weight = $5,
        items = $6,
        subtotal = $7,
        discount_amount = $8,
        discount_reason = $9,
        total_amount = $10,
        payment_status = $11,
        status = $12,
        transaction_code = $13,
        notes = $14,
        updated_by = $15
      WHERE id = $16
      RETURNING *
    `, [
      customer_id,
      location_id,
      service_type,
      order_date,
      parseFloat(weight) || 0,
      parseInt(items) || 0,
      parseFloat(subtotal) || 0,
      parseFloat(discount_amount) || 0,
      discount_reason,
      parseFloat(total_amount),
      payment_status,
      status,
      transaction_code,
      notes,
      req.user.id,
      req.params.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderResult = await db.query(`${ORDER_SELECT} WHERE o.id = $1`, [req.params.id]);
    res.json(mapOrderRow(orderResult.rows[0]));
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete order
router.delete('/:id', authenticateToken, requireOwner, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM orders WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;