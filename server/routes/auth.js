const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticateToken, requireOwner } = require('../middleware');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role = 'owner', location_id } = req.body;

    if (!email || !password || !name || !location_id) {
      return res.status(400).json({ error: 'All fields including location are required' });
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.query(
      'INSERT INTO users (email, password, name, role, location_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, location_id',
      [email, hashedPassword, name, role, location_id]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add user (owner only)
router.post('/add-user', authenticateToken, requireOwner, async (req, res) => {
  try {
    const { email, password, name, role, location_id } = req.body;

    if (!email || !password || !name || !role || !location_id) {
      return res.status(400).json({ error: 'All fields including location are required' });
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.query(
      'INSERT INTO users (email, password, name, role, location_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, location_id, created_at',
      [email, hashedPassword, name, role, location_id]
    );

    const user = result.rows[0];

    res.status(201).json({
      message: 'User created successfully',
      user
    });
  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users (owner only)
router.get('/users', authenticateToken, requireOwner, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.name, u.role, u.created_at, l.id as location_id, l.display_name as location_name
       FROM users u 
       LEFT JOIN locations l ON u.location_id = l.id 
       ORDER BY u.created_at DESC`
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      created_at: row.created_at,
      location: row.location_name ? {
        id: row.location_id,
        name: row.location_name
      } : null
    })));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;