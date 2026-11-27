const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticateToken, requireOwner } = require('../middleware');

const { createUser } = require('../services/users/user-accounts');
const { createStaffAccountSchema } = require('../../shared/schemas/staff-account-schema');
const { z } = require('zod');
const { FOREIGN_KEY_VIOLATION, UNIQUE_VIOLATION } = require('../db/sqlstate');

const staffAccountSchema = createStaffAccountSchema(z);

const router = express.Router();

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
  const account = staffAccountSchema.safeParse(req.body);
  if (!account.success) {
    return res.status(400).json({ error: `Invalid account details: ${account.error.issues.map(issue => issue.path.join('.') || 'body').join(', ')}` });
  }

  try {
    const user = await createUser(db.pool, account.data);
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    if (error.code === UNIQUE_VIOLATION) return res.status(400).json({ error: 'User already exists' });
    if (error.code === FOREIGN_KEY_VIOLATION) return res.status(400).json({ error: 'Choose an existing location' });
    console.error('Add user failed:', error.code || error.name);
    res.status(500).json({ error: 'Could not create user' });
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
