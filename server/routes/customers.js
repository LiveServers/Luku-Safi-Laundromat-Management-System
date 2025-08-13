const express = require('express');
const supabase = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all customers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer history and analytics
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const customerId = req.params.id;
    
    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get all orders for this customer
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      return res.status(400).json({ error: ordersError.message });
    }

    // Calculate analytics
    const totalSpent = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
    const totalOrders = orders?.length || 0;
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    
    // Calculate monthly spending
    const monthlySpending = {};
    const weeklyVisits = {};
    
    orders?.forEach(order => {
      const orderDate = new Date(order.created_at);
      const monthKey = `${orderDate.getFullYear()}-${(orderDate.getMonth() + 1).toString().padStart(2, '0')}`;
      const weekKey = getWeekKey(orderDate);
      
      monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + order.total_amount;
      weeklyVisits[weekKey] = (weeklyVisits[weekKey] || 0) + 1;
    });

    // Calculate frequency (visits per month)
    const firstVisit = orders?.length > 0 ? new Date(orders[orders.length - 1].created_at) : new Date();
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
        lastVisit: orders?.length > 0 ? orders[0].created_at : null,
        monthlySpending,
        weeklyVisits
      }
    });
  } catch (error) {
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

    const { data: customer, error } = await supabase
      .from('customers')
      .insert([{ name, email, phone, address }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;