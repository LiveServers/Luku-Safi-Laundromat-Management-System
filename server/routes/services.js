const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is owner
const requireOwner = (req, res, next) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Access denied. Owner role required.' });
  }
  next();
};

// Get all active services (accessible to all authenticated users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM services WHERE is_active = true ORDER BY display_name'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all services including inactive (owner only)
router.get('/all', authenticateToken, requireOwner, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM services ORDER BY display_name'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get all services error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new service (owner only)
router.post('/', authenticateToken, requireOwner, async (req, res) => {
  try {
    const {
      display_name,
      base_price,
      price_per_item,
      price_per_kg,
      requires_weight,
      requires_items
    } = req.body;

    if (!display_name) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    const name = display_name.toLowerCase().replace(/\s+/g, '-');

    const result = await db.query(`
      INSERT INTO services (
        name, display_name, base_price, price_per_item, price_per_kg, 
        requires_weight, requires_items
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      name,
      display_name,
      parseFloat(base_price) || 0,
      price_per_item ? parseFloat(price_per_item) : null,
      price_per_kg ? parseFloat(price_per_kg) : null,
      requires_weight || false,
      requires_items !== false
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update service (owner only)
router.put('/:id', authenticateToken, requireOwner, async (req, res) => {
  try {
    const {
      display_name,
      base_price,
      price_per_item,
      price_per_kg,
      requires_weight,
      requires_items
    } = req.body;

    const result = await db.query(`
      UPDATE services SET 
        display_name = $1,
        base_price = $2,
        price_per_item = $3,
        price_per_kg = $4,
        requires_weight = $5,
        requires_items = $6
      WHERE id = $7
      RETURNING *
    `, [
      display_name,
      parseFloat(base_price) || 0,
      price_per_item ? parseFloat(price_per_item) : null,
      price_per_kg ? parseFloat(price_per_kg) : null,
      requires_weight || false,
      requires_items !== false,
      req.params.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle service active status (owner only)
router.patch('/:id/toggle', authenticateToken, requireOwner, async (req, res) => {
  try {
    const currentResult = await db.query(
      'SELECT is_active FROM services WHERE id = $1',
      [req.params.id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const result = await db.query(
      'UPDATE services SET is_active = $1 WHERE id = $2 RETURNING *',
      [!currentResult.rows[0].is_active, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Toggle service error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;