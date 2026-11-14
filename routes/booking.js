const express = require('express');
const router = express.Router();
const bookingController = require('../controller/bookingController');
const requireSuperadminSession = require('../controller/requireSuperadminSession');

function requireSuperadminForManualPaid(req, res, next) {
  const paymentStatus = req.body?.payment?.payment_status || req.body?.booking?.payment_status || req.body?.payment_status;
  const paymentMethod = req.body?.payment?.payment_method || req.body?.booking?.payment_method || req.body?.payment_method;
  const isPaid = ['paid', 'success', 'successful', 'completed', 'confirmed'].includes(String(paymentStatus || '').toLowerCase());
  const isPhonePe = String(paymentMethod || '').toLowerCase() === 'phonepe';

  if (isPaid && !isPhonePe) return requireSuperadminSession(req, res, next);
  return next();
}

router.post('/:id/resend-email', requireSuperadminSession, bookingController.resendConfirmationEmail);

// GET /api/bookings/check - Check booking by reference
router.get('/check', bookingController.checkBookingByReference);

// GET /api/bookings/all - Get all bookings (past and upcoming events)
router.get('/all', bookingController.getAllBookingsComplete);

// GET /api/bookings - Get all bookings with complete details (upcoming events only)
router.get('/', bookingController.getAllBookings);

// POST /api/bookings - Create a new booking with parent, children, and games/slots
router.post('/', requireSuperadminForManualPaid, bookingController.createBooking);

// GET /api/bookings/user/:userId - Get user profile with all booking details
router.get('/user/:userId', bookingController.getUserProfileWithBookings);

// ==== Ticket scanning (Flutter scanner app) ====
// GET /api/bookings/ticket/verify/:id - validate only
router.get('/ticket/verify/:id', bookingController.verifyTicket);
// POST /api/bookings/ticket/checkin/:id - validate + check in (QR expires)
router.post('/ticket/checkin/:id', bookingController.checkinTicket);

// GET /api/bookings/:id - Get single booking details by ID
router.get('/:id', bookingController.getBookingById);

// PATCH /api/bookings/:id - Edit a booking
router.patch('/:id', bookingController.updateBooking);

// DELETE /api/bookings/:id - Delete a booking
router.delete('/:id', bookingController.deleteBooking);

module.exports = router;
