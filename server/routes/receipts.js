const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { generateReceiptAsync } = require('../workers/receiptWorker');

const router = express.Router();

// Generate receipt for customer orders on a specific date
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { customer_id, order_date } = req.body;

    if (!customer_id || !order_date) {
      return res.status(400).json({ 
        error: 'Customer ID and order date are required' 
      });
    }

    // Get customer details
    const customerResult = await db.query(
      'SELECT * FROM customers WHERE id = $1',
      [customer_id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerResult.rows[0];

    // Get all orders for this customer on the specified date
    const ordersResult = await db.query(`
      SELECT * FROM orders 
      WHERE customer_id = $1 AND order_date = $2
      ORDER BY created_at ASC
    `, [customer_id, order_date]);

    if (ordersResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No orders found for this customer on the specified date' 
      });
    }

    const orders = ordersResult.rows;

    // Calculate totals
    const totalAmount = orders.reduce((sum, order) => sum + parseFloat(order.subtotal), 0);
    const totalDiscount = orders.reduce((sum, order) => sum + parseFloat(order.discount_amount), 0);
    const grandTotal = orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);

    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}-${customer_id.slice(-4).toUpperCase()}`;

    // Prepare receipt data
    const receiptData = {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address
      },
      orders: orders.map(order => ({
        id: order.id,
        service_type: order.service_type,
        weight: parseFloat(order.weight),
        items: order.items,
        subtotal: parseFloat(order.subtotal),
        discount_amount: parseFloat(order.discount_amount),
        discount_reason: order.discount_reason,
        total_amount: parseFloat(order.total_amount),
        transaction_code: order.transaction_code,
        notes: order.notes,
        created_at: order.created_at
      })),
      receiptDate: new Date().toISOString(),
      receiptNumber,
      totalAmount,
      totalDiscount,
      grandTotal
    };

    // Generate receipt in worker thread (non-blocking)
    const result = await generateReceiptAsync(receiptData);

    if (result.success) {
      res.json({
        success: true,
        receiptNumber: result.receiptNumber,
        filename: result.filename,
        downloadUrl: `/api/receipts/download/${result.filename}`,
        totalAmount: grandTotal,
        orderCount: orders.length
      });
    } else {
      res.status(500).json({ error: 'Failed to generate receipt' });
    }

  } catch (error) {
    console.error('Generate receipt error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download receipt file
router.get('/download/:filename', authenticateToken, (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, '../receipts', filename);

    // Security check - ensure filename is safe
    if (!filename.match(/^receipt_[A-Za-z0-9\-_]+\.pdf$/)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Stream file to response
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error downloading receipt' });
      }
    });

  } catch (error) {
    console.error('Download receipt error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get receipt history for a customer
router.get('/history/:customer_id', authenticateToken, async (req, res) => {
  try {
    const customerId = req.params.customer_id;
    
    // Get distinct order dates for this customer
    const datesResult = await db.query(`
      SELECT DISTINCT order_date, COUNT(*) as order_count,
             SUM(total_amount) as total_amount
      FROM orders 
      WHERE customer_id = $1
      GROUP BY order_date
      ORDER BY order_date DESC
    `, [customerId]);

    res.json(datesResult.rows.map(row => ({
      order_date: row.order_date,
      order_count: parseInt(row.order_count),
      total_amount: parseFloat(row.total_amount)
    })));

  } catch (error) {
    console.error('Get receipt history error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;