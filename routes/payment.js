const express = require('express');
const router = express.Router();
const paymentController = require('../controller/paymentController');
const { authenticateEmployee } = require('../controller/authMiddleware');
const requireSuperadminSession = require('../controller/requireSuperadminSession');

// POST /api/payments - Create a manual payment
router.post('/', requireSuperadminSession, paymentController.createPayment);

// POST /api/payments/notify-failed - payment failed / retry email
router.post('/notify-failed', paymentController.notifyPaymentFailed);

// Protected routes (require authentication)
// GET /api/payments - Get all payments with filters
router.get('/', authenticateEmployee, paymentController.getAllPayments);

// GET /api/payments/analytics - Get payment analytics
router.get('/analytics', authenticateEmployee, paymentController.getPaymentAnalytics);

// GET /api/payments/:id - Get payment by ID
router.get('/:id', authenticateEmployee, paymentController.getPaymentById);

// PATCH /api/payments/:id - Update payment
router.patch('/:id', requireSuperadminSession, paymentController.updatePayment);

// PATCH /api/payments/:id/status - Update payment status (refunds, etc.)
router.patch('/:id/status', requireSuperadminSession, paymentController.updatePaymentStatus);

// DELETE /api/payments/:id - Delete payment
router.delete('/:id', requireSuperadminSession, paymentController.deletePayment);

module.exports = router;
