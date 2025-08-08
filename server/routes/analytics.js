const express = require('express');
const supabase = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get dashboard analytics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get total revenue
    const { data: revenueData } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'paid');

    const totalRevenue = revenueData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

    // Get total expenses
    const { data: expenseData } = await supabase
      .from('expenses')
      .select('amount');

    const totalExpenses = expenseData?.reduce((sum, expense) => sum + expense.amount, 0) || 0;

    // Get orders count
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // Get customers count
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    // Get pending orders
    const { count: pendingOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['received', 'processing']);

    // Get recent orders
    const { data: recentOrders } = await supabase
      .from('orders')
      .select(`
        *,
        customers (name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    res.json({
      totalRevenue,
      totalExpenses,
      profit: totalRevenue - totalExpenses,
      totalOrders: totalOrders || 0,
      totalCustomers: totalCustomers || 0,
      pendingOrders: pendingOrders || 0,
      recentOrders: recentOrders || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get revenue chart data
router.get('/revenue-chart', authenticateToken, async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Group by month
    const monthlyRevenue = {};
    orders.forEach(order => {
      const month = new Date(order.created_at).toISOString().slice(0, 7);
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + order.total_amount;
    });

    const chartData = Object.entries(monthlyRevenue).map(([month, revenue]) => ({
      month,
      revenue
    }));

    res.json(chartData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get expenses chart data
router.get('/expenses-chart', authenticateToken, async (req, res) => {
  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('amount, category, date')
      .order('date', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Group by category
    const categoryExpenses = {};
    expenses.forEach(expense => {
      categoryExpenses[expense.category] = (categoryExpenses[expense.category] || 0) + expense.amount;
    });

    const chartData = Object.entries(categoryExpenses).map(([category, amount]) => ({
      category,
      amount
    }));

    res.json(chartData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get monthly reports
router.get('/monthly-report', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    // Get orders for the month
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        *,
        customers (id, name, created_at)
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59');

    // Get expenses for the month
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    // Calculate revenue
    const revenue = orders?.filter(o => o.payment_status === 'paid')
      .reduce((sum, order) => sum + order.total_amount, 0) || 0;

    // Calculate total expenses
    const totalExpenses = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;

    // Get new vs returning customers
    const customerIds = [...new Set(orders?.map(o => o.customer_id))];
    const newCustomers = [];
    const returningCustomers = [];

    for (const customerId of customerIds) {
      const customer = orders?.find(o => o.customer_id === customerId)?.customers;
      if (customer) {
        const customerCreatedMonth = new Date(customer.created_at).getMonth() + 1;
        const customerCreatedYear = new Date(customer.created_at).getFullYear();
        
        if (customerCreatedMonth == month && customerCreatedYear == year) {
          newCustomers.push(customer);
        } else {
          returningCustomers.push(customer);
        }
      }
    }

    // Customer frequency
    const customerFrequency = {};
    orders?.forEach(order => {
      const customerId = order.customer_id;
      customerFrequency[customerId] = (customerFrequency[customerId] || 0) + 1;
    });

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
      totalOrders: orders?.length || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;