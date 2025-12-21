const express = require('express');
const router = express.Router();
const bookingController = require('../controller/bookingController');

// GET /api/bookings - Get all bookings with complete details
router.get('/', bookingController.getAllBookings);

// POST /api/bookings - Create a new booking with parent, children, and games/slots
router.post('/', bookingController.createBooking);

// GET /api/bookings/user/:userId - Get user profile with all booking details
router.get('/user/:userId', bookingController.getUserProfileWithBookings);

// GET /api/bookings/:id - Get single booking details by ID
router.get('/:id', bookingController.getBookingById);

module.exports = router;
