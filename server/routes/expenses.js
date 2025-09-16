const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all expenses
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        e.*,
        u.id as updated_by_user_id,
        u.name as updated_by_user_name
      FROM expenses e
      LEFT JOIN users u ON e.updated_by = u.id
      ORDER BY e.date DESC, e.created_at DESC
    `);

    // Transform the result to match the expected structure
    const expenses = result.rows.map(row => ({
      id: row.id,
      category: row.category,
      description: row.description,
      amount: parseFloat(row.amount),
      date: row.date,
      transaction_code: row.transaction_code,
      created_at: row.created_at,
      updated_at: row.updated_at,
      updated_by_user: row.updated_by_user_name ? {
        id: row.updated_by_user_id,
        name: row.updated_by_user_name
      } : null
    }));

    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create expense
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { category, description, amount, date, transaction_code } = req.body;

    const result = await db.query(
      'INSERT INTO expenses (category, description, amount, date, transaction_code) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [category, description, parseFloat(amount), date || new Date().toISOString().split('T')[0], transaction_code]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update expense
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { category, description, amount, date, transaction_code } = req.body;

    const result = await db.query(`
      UPDATE expenses SET 
        category = $1,
        description = $2,
        amount = $3,
        date = $4,
        transaction_code = $5,
        updated_by = $6
      WHERE id = $7
      RETURNING *
    `, [category, description, parseFloat(amount), date, transaction_code, req.user.id, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Get the updated expense with user details
    const expenseResult = await db.query(`
      SELECT 
        e.*,
        u.id as updated_by_user_id,
        u.name as updated_by_user_name
      FROM expenses e
      LEFT JOIN users u ON e.updated_by = u.id
      WHERE e.id = $1
    `, [req.params.id]);

    const row = expenseResult.rows[0];
    const expense = {
      id: row.id,
      category: row.category,
      description: row.description,
      amount: parseFloat(row.amount),
      date: row.date,
      transaction_code: row.transaction_code,
      created_at: row.created_at,
      updated_at: row.updated_at,
      updated_by_user: row.updated_by_user_name ? {
        id: row.updated_by_user_id,
        name: row.updated_by_user_name
      } : null
    };

    res.json(expense);
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete expense
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;