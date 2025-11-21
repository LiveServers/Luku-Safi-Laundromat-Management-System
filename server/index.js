const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const ordersRoutes = require('./routes/orders');
const expensesRoutes = require('./routes/expenses');
const customersRoutes = require('./routes/customers');
const analyticsRoutes = require('./routes/analytics');
const servicesRoutes = require('./routes/services');
const receiptsRoutes = require('./routes/receipts');

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(helmet());
app.use(cors({
  origin: "*",
}));

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/receipts', receiptsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen('5000', () => {
  console.log(`Server running on port 5000`);
});

module.exports = app;