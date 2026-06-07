const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { generateReceiptAsync } = require('../workers/receiptWorker');

const router = express.Router();

// Generate receipt for orders
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Get the order with customer and location details
    const orderResult = await db.query(`
      SELECT 
        o.*,
        c.id as customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        l.id as location_id,
        l.display_name as location_name,
        l.address as location_address,
        l.phone as location_phone,
        l.paybill_number,
        l.account_number
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN locations l ON o.location_id = l.id
      WHERE o.id = $1
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Find all orders for the same customer on the same date
    const allOrdersResult = await db.query(`
      SELECT 
        o.*,
        c.id as customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        l.id as location_id,
        l.display_name as location_name,
        l.address as location_address,
        l.phone as location_phone,
        l.paybill_number,
        l.account_number
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN locations l ON o.location_id = l.id
      WHERE o.customer_id = $1 
        AND o.order_date = $2
        AND o.location_id = $3
      ORDER BY o.created_at ASC
    `, [order.customer_id, order.order_date, order.location_id]);

    const orders = allOrdersResult.rows;

    // Calculate totals
    const totalAmount = orders.reduce((sum, o) => sum + parseFloat(o.subtotal), 0);
    const totalDiscount = orders.reduce((sum, o) => sum + parseFloat(o.discount_amount || 0), 0);
    const grandTotal = orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}-${order.customer_id.slice(-4).toUpperCase()}`;

    // Prepare receipt data
    const receiptData = {
      customer: {
        id: order.customer_id,
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
        address: order.customer_address
      },
      location: {
        id: order.location_id,
        display_name: order.location_name,
        address: order.location_address,
        phone: order.location_phone,
        paybill_number: order.paybill_number,
        account_number: order.account_number
      },
      orders: orders.map(o => ({
        id: o.id,
        service_type: o.service_type,
        weight: parseFloat(o.weight),
        items: parseInt(o.items),
        subtotal: parseFloat(o.subtotal),
        discount_amount: parseFloat(o.discount_amount),
        total_amount: parseFloat(o.total_amount),
        discount_reason: o.discount_reason,
        transaction_code: o.transaction_code,
        notes: o.notes,
        status: o.status,
        payment_status: o.payment_status,
        created_at: o.created_at
      })),
      receiptDate: new Date().toISOString(),
      receiptNumber,
      totalAmount,
      totalDiscount,
      grandTotal
    };

    // Generate PDF in worker thread
    const result = await generateReceiptAsync(receiptData);

    if (result.success) {
      res.json({
        success: true,
        message: `Receipt generated successfully for ${orders.length} order(s)`,
        receiptNumber: result.receiptNumber,
        filename: result.filename,
        downloadUrl: `/api/receipts/download/${result.filename}`,
        orderCount: orders.length,
        totalAmount: grandTotal
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
      return res.status(404).json({ error: 'Receipt file not found' });
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