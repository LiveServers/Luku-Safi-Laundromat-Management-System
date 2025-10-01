const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { customerFrequencyCalculator } = require('../utils/customerFrequencyCalculator');

const router = express.Router();

// Get dashboard analytics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get total revenue
    const revenueResult = await db.query(
      "SELECT SUM(total_amount) as total_revenue FROM orders WHERE payment_status = 'paid'"
    );
    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue) || 0;

    // Get total expenses
    const expenseResult = await db.query(
      'SELECT SUM(amount) as total_expenses FROM expenses'
    );
    const totalExpenses = parseFloat(expenseResult.rows[0].total_expenses) || 0;

    // Get orders count
    const ordersCountResult = await db.query('SELECT * FROM orders');
    const orderFrequency = customerFrequencyCalculator(ordersCountResult.rows);
    let totalOrders = 0;
    for([key, value] of Object.entries(orderFrequency)) {
      totalOrders += value.customerFrequency;
    }

    // Get customers count
    const customersCountResult = await db.query('SELECT COUNT(*) as count FROM customers');
    const totalCustomers = parseInt(customersCountResult.rows[0].count) || 0;

    // Get pending orders
    const pendingOrdersResult = await db.query(
      "SELECT COUNT(*) as count FROM orders WHERE status IN ('received', 'processing')"
    );
    const pendingOrders = parseInt(pendingOrdersResult.rows[0].count) || 0;

    // Get recent orders
    const recentOrdersResult = await db.query(`
      SELECT 
        o.*,
        c.name as customer_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    const recentOrders = recentOrdersResult.rows.map(row => ({
      id: row.id,
      customer_id: row.customer_id,
      service_type: row.service_type,
      total_amount: parseFloat(row.total_amount),
      discount_amount: parseFloat(row.discount_amount),
      payment_status: row.payment_status,
      status: row.status,
      created_at: row.created_at,
      customers: row.customer_name ? { name: row.customer_name } : null
    }));

    res.json({
      totalRevenue,
      totalExpenses,
      profit: totalRevenue - totalExpenses,
      totalOrders,
      totalCustomers,
      pendingOrders,
      recentOrders
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get revenue chart data
router.get('/revenue-chart', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        SUM(total_amount) as revenue
      FROM orders 
      WHERE payment_status = 'paid'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `);

    const chartData = result.rows.map(row => ({
      month: row.month.toISOString().slice(0, 7),
      revenue: parseFloat(row.revenue)
    }));

    res.json(chartData);
  } catch (error) {
    console.error('Revenue chart error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get expenses chart data
router.get('/expenses-chart', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        category,
        SUM(amount) as amount
      FROM expenses
      GROUP BY category
      ORDER BY amount DESC
    `);

    const chartData = result.rows.map(row => ({
      category: row.category,
      amount: parseFloat(row.amount)
    }));

    res.json(chartData);
  } catch (error) {
    console.error('Expenses chart error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get monthly reports
router.get('/monthly-report', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 1).toISOString().split('T')[0];

    // Get orders for the month
    const ordersResult = await db.query(`
      SELECT 
        o.*,
        c.id as customer_id,
        c.name as customer_name,
        c.created_at as customer_created_at
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.created_at >= $1 AND o.created_at <= $2
    `, [startDate, endDate + 'T23:59:59']);

    // Get expenses for the month
    const expensesResult = await db.query(
      'SELECT * FROM expenses WHERE date >= $1 AND date <= $2',
      [startDate, endDate]
    );

    const orders = ordersResult.rows;
    const expenses = expensesResult.rows;

    // Calculate revenue
    const revenue = orders
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, order) => sum + parseFloat(order.total_amount), 0);

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    // Get new vs returning customers
    const customerIds = [...new Set(orders.map(o => o.customer_id))];
    const newCustomers = [];
    const returningCustomers = [];

    for (const customerId of customerIds) {
      const customer = orders.find(o => o.customer_id === customerId);
      if (customer && customer.customer_created_at) {
        const customerCreatedMonth = new Date(customer.customer_created_at).getMonth() + 1;
        const customerCreatedYear = new Date(customer.customer_created_at).getFullYear();
        
        if (customerCreatedMonth == month && customerCreatedYear == year) {
          newCustomers.push({ id: customerId, name: customer.customer_name });
        } else {
          returningCustomers.push({ id: customerId, name: customer.customer_name });
        }
      }
    }
    // Calculate customer frequency
    const customerFrequency = customerFrequencyCalculator(orders);

    res.json({
      month: `${year}-${month.padStart(2, '0')}`,
      orders: orders || [],
      expenses: expenses || [],
      revenue,
      totalExpenses,
      profit: revenue - totalExpenses,
      newCustomers: newCustomers.length,
      returningCustomers: returningCustomers.length,
      customerFrequency,
      totalOrders: orders.length
    });
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;