const express = require('express');
const supabase = require('../config/database');
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
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('display_name');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all services including inactive (owner only)
router.get('/all', authenticateToken, requireOwner, async (req, res) => {
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .order('display_name');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new service (owner only)
router.post('/', authenticateToken, requireOwner, async (req, res) => {
  try {
    const {
      name,
      display_name,
      base_price,
      price_per_item,
      price_per_kg,
      requires_weight,
      requires_items
    } = req.body;

    if (!name || !display_name) {
      return res.status(400).json({ error: 'Name and display name are required' });
    }

    const { data: service, error } = await supabase
      .from('services')
      .insert([
        {
          name: name.toLowerCase().replace(/\s+/g, '-'),
          display_name,
          base_price: parseFloat(base_price) || 0,
          price_per_item: price_per_item ? parseFloat(price_per_item) : null,
          price_per_kg: price_per_kg ? parseFloat(price_per_kg) : null,
          requires_weight: requires_weight || false,
          requires_items: requires_items !== false
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update service (owner only)
router.put('/:id', authenticateToken, requireOwner, async (req, res) => {
  try {
    const { data: service, error } = await supabase
      .from('services')
      .update({
        display_name: req.body.display_name ?? '',
        base_price: parseFloat(req.body.base_price) || 0,
        price_per_item: req.body.price_per_item ? parseFloat(req.body.price_per_item) : null,
        price_per_kg: req.body.price_per_kg ? parseFloat(req.body.price_per_kg) : null,
        requires_weight: req.body.requires_weight || false,
        requires_items: req.body.requires_items !== false,
        name: req.body.name ?? ''
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle service active status (owner only)
router.patch('/:id/toggle', authenticateToken, requireOwner, async (req, res) => {
  try {
    const { data: currentService } = await supabase
      .from('services')
      .select('is_active')
      .eq('id', req.params.id)
      .single();

    if (!currentService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const { data: service, error } = await supabase
      .from('services')
      .update({ is_active: !currentService.is_active })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;