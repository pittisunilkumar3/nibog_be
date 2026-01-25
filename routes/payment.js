const express = require('express');
const router = express.Router();
const paymentController = require('../controller/paymentController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// Public routes (for PhonePe callbacks, etc.)
// POST /api/payments - Create payment
router.post('/', paymentController.createPayment);

// Protected routes (require authentication)
// GET /api/payments - Get all payments with filters
router.get('/', authenticateEmployee, paymentController.getAllPayments);

// GET /api/payments/analytics - Get payment analytics
router.get('/analytics', authenticateEmployee, paymentController.getPaymentAnalytics);

// GET /api/payments/:id - Get payment by ID
router.get('/:id', authenticateEmployee, paymentController.getPaymentById);

// PATCH /api/payments/:id - Update payment
router.patch('/:id', authenticateEmployee, paymentController.updatePayment);

// PATCH /api/payments/:id/status - Update payment status (refunds, etc.)
router.patch('/:id/status', authenticateEmployee, paymentController.updatePaymentStatus);

// DELETE /api/payments/:id - Delete payment
router.delete('/:id', authenticateEmployee, paymentController.deletePayment);

module.exports = router;
