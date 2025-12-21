const express = require('express');
const router = express.Router();
const bookingController = require('../controller/bookingController');

// POST /api/bookings - Create a new booking with parent, children, and games/slots
router.post('/', bookingController.createBooking);

// GET /api/bookings/user/:userId - Get user profile with all booking details
router.get('/user/:userId', bookingController.getUserProfileWithBookings);

module.exports = router;
