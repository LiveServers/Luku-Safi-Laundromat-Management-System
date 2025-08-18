const express = require('express');
const supabase = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all expenses
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select(`
        *,
        updated_by_user:users!updated_by (
          id,
          name
        )
      `)
      .order('date', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create expense
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { category, description, amount, date, transaction_code } = req.body;

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert([
        {
          category,
          description,
          amount: parseFloat(amount),
          date: date || new Date().toISOString().split('T')[0],
          transaction_code
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update expense
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Add updated_by field
    const updateData = {
      ...req.body,
      updated_by: req.user.id
    };

    const { data: expense, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', req.params.id)
      .select(`
        *,
        updated_by_user:users!updated_by (
          id,
          name
        )
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete expense
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;