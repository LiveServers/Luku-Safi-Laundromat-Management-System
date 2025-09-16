const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        o.*,
        c.id as customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        u.id as updated_by_user_id,
        u.name as updated_by_user_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.updated_by = u.id
      ORDER BY o.created_at DESC
    `);

    if(result.rows.length === 0) {
      return res.status(404).json({ error: 'No orders found' });
    }
    // Transform the result to match the expected structure
    const orders = result.rows.map(row => ({
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
      customers: row.customer_name ? {
        id: row.customer_id,
        name: row.customer_name,
        email: row.customer_email,
        phone: row.customer_phone
      } : null,
      updated_by_user: row.updated_by_user_name ? {
        id: row.updated_by_user_id,
        name: row.updated_by_user_name
      } : null
    }));

    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single order
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        o.*,
        c.id as customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        u.id as updated_by_user_id,
        u.name as updated_by_user_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.updated_by = u.id
      WHERE o.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const row = result.rows[0];
    const order = {
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
      customers: row.customer_name ? {
        id: row.customer_id,
        name: row.customer_name,
        email: row.customer_email,
        phone: row.customer_phone
      } : null,
      updated_by_user: row.updated_by_user_name ? {
        id: row.updated_by_user_id,
        name: row.updated_by_user_name
      } : null
    };

    res.json(order);
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
      INSERT INTO orders (
        customer_id, service_type, order_date, weight, items, 
        subtotal, discount_amount, discount_reason, total_amount, 
        payment_status, status, transaction_code, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      customer_id,
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
      notes
    ]);

    // Get the created order with customer details
    const orderResult = await db.query(`
      SELECT 
        o.*,
        c.id as customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `, [result.rows[0].id]);

    const row = orderResult.rows[0];
    const order = {
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
      customers: row.customer_name ? {
        id: row.customer_id,
        name: row.customer_name,
        email: row.customer_email,
        phone: row.customer_phone
      } : null
    };

    res.status(201).json(order);
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
        service_type = $2,
        order_date = $3,
        weight = $4,
        items = $5,
        subtotal = $6,
        discount_amount = $7,
        discount_reason = $8,
        total_amount = $9,
        payment_status = $10,
        status = $11,
        transaction_code = $12,
        notes = $13,
        updated_by = $14
      WHERE id = $15
      RETURNING *
    `, [
      customer_id,
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

    // Get the updated order with customer details
    const orderResult = await db.query(`
      SELECT 
        o.*,
        c.id as customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        u.id as updated_by_user_id,
        u.name as updated_by_user_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.updated_by = u.id
      WHERE o.id = $1
    `, [req.params.id]);

    const row = orderResult.rows[0];
    const order = {
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
      customers: row.customer_name ? {
        id: row.customer_id,
        name: row.customer_name,
        email: row.customer_email,
        phone: row.customer_phone
      } : null,
      updated_by_user: row.updated_by_user_name ? {
        id: row.updated_by_user_id,
        name: row.updated_by_user_name
      } : null
    };

    res.json(order);
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete order
router.delete('/:id', authenticateToken, async (req, res) => {
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