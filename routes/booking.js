const express = require('express');
const router = express.Router();
const bookingController = require('../controller/bookingController');

// GET /api/bookings/all - Get all bookings (past and upcoming events)
router.get('/all', bookingController.getAllBookingsComplete);

// GET /api/bookings - Get all bookings with complete details (upcoming events only)
router.get('/', bookingController.getAllBookings);

// POST /api/bookings - Create a new booking with parent, children, and games/slots
router.post('/', bookingController.createBooking);

// GET /api/bookings/user/:userId - Get user profile with all booking details
router.get('/user/:userId', bookingController.getUserProfileWithBookings);

// GET /api/bookings/:id - Get single booking details by ID
router.get('/:id', bookingController.getBookingById);

// PATCH /api/bookings/:id - Edit a booking
router.patch('/:id', bookingController.updateBooking);

// DELETE /api/bookings/:id - Delete a booking
router.delete('/:id', bookingController.deleteBooking);

module.exports = router;
