const express = require('express');
const supabase = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone
        ),
        updated_by_user:users!updated_by (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single order
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone
        ),
        updated_by_user:users!updated_by (
          id,
          name
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
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
      transaction_code,
      notes
    } = req.body;

    const { data: order, error } = await supabase
      .from('orders')
      .insert([
        {
          customer_id,
          service_type,
          order_date: order_date || new Date().toISOString().split('T')[0],
          weight: parseFloat(weight),
          items: parseInt(items),
          subtotal: parseFloat(subtotal),
          discount_amount: parseFloat(discount_amount) || 0,
          discount_reason,
          total_amount: parseFloat(total_amount),
          payment_status: payment_status || 'pending',
          status: 'received',
          transaction_code,
          notes
        }
      ])
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone
        )
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Add updated_by field
    const updateData = {
      ...req.body,
      updated_by: req.user.id
    };

    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', req.params.id)
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone
        ),
        updated_by_user:users!updated_by (
          id,
          name
        )
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete order
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;