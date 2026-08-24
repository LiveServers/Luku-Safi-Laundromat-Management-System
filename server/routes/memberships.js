const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/plans', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM membership_plans WHERE is_active = true ORDER BY kg_allowance'
    );
    res.json(result.rows.map(row => ({
      ...row,
      kg_allowance: parseFloat(row.kg_allowance),
      price: parseFloat(row.price)
    })));
  } catch (error) {
    console.error('Get membership plans error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/customer/:customerId', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        cm.*,
        mp.display_name as plan_name,
        mp.kg_allowance as plan_kg,
        mp.price as plan_price
      FROM customer_memberships cm
      LEFT JOIN membership_plans mp ON cm.plan_id = mp.id
      WHERE cm.customer_id = $1 AND cm.status = 'active' AND cm.kg_remaining > 0
      ORDER BY cm.created_at ASC
    `, [req.params.customerId]);

    const memberships = result.rows.map(row => ({
      id: row.id,
      customer_id: row.customer_id,
      plan_id: row.plan_id,
      plan_name: row.plan_name,
      kg_total: parseFloat(row.kg_total),
      kg_remaining: parseFloat(row.kg_remaining),
      status: row.status,
      created_at: row.created_at
    }));

    const kgRemaining = memberships.reduce((sum, item) => sum + item.kg_remaining, 0);

    res.json({ memberships, kgRemaining });
  } catch (error) {
    console.error('Get customer memberships error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
