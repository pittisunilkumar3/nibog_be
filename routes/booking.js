const express = require('express');
const router = express.Router();
const bookingController = require('../controller/bookingController');

// POST /api/bookings - Create a new booking with parent, children, and games/slots
router.post('/', bookingController.createBooking);

module.exports = router;
