const express = require('express');
const router = express.Router();
const pendingBookingController = require('../controller/pendingBookingController');

// POST /api/pending-bookings/create - Create a pending booking
router.post('/create', pendingBookingController.create);

// POST /api/pending-bookings/get - Get pending booking by transaction ID
router.post('/get', pendingBookingController.getByTransactionId);

// POST /api/pending-bookings/delete - Delete a pending booking
router.post('/delete', pendingBookingController.delete);

// POST /api/pending-bookings/update-status - Update pending booking status
router.post('/update-status', pendingBookingController.updateStatus);

module.exports = router;
