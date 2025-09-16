const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all customers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM customers ORDER BY name'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get customer history and analytics
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const customerId = req.params.id;
    
    // Get customer details
    const customerResult = await db.query(
      'SELECT * FROM customers WHERE id = $1',
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerResult.rows[0];

    // Get all orders for this customer
    const ordersResult = await db.query(
      'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId]
    );

    const orders = ordersResult.rows;

    // Calculate analytics
    const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    
    // Calculate monthly spending
    const monthlySpending = {};
    const weeklyVisits = {};
    
    orders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const monthKey = `${orderDate.getFullYear()}-${(orderDate.getMonth() + 1).toString().padStart(2, '0')}`;
      const weekKey = getWeekKey(orderDate);
      
      monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + parseFloat(order.total_amount);
      weeklyVisits[weekKey] = (weeklyVisits[weekKey] || 0) + 1;
    });

    // Calculate frequency (visits per month)
    const firstVisit = orders.length > 0 ? new Date(orders[orders.length - 1].created_at) : new Date();
    const monthsSinceFirst = Math.max(1, Math.ceil((new Date() - firstVisit) / (1000 * 60 * 60 * 24 * 30)));
    const visitFrequency = totalOrders / monthsSinceFirst;

    res.json({
      customer,
      orders: orders || [],
      analytics: {
        totalSpent,
        totalOrders,
        averageOrderValue,
        visitFrequency: Math.round(visitFrequency * 10) / 10, // Round to 1 decimal
        firstVisit: firstVisit.toISOString(),
        lastVisit: orders.length > 0 ? orders[0].created_at : null,
        monthlySpending,
        weeklyVisits
      }
    });
  } catch (error) {
    console.error('Get customer history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to get week key
function getWeekKey(date) {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Create customer
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    const result = await db.query(
      'INSERT INTO customers (name, email, phone, address) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, phone, address]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update customer
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    const result = await db.query(
      'UPDATE customers SET name = $1, email = $2, phone = $3, address = $4 WHERE id = $5 RETURNING *',
      [name, email, phone, address, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;