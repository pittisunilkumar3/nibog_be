const BookingModel = require('../model/bookingModel');

/**
 * Create a new booking with parent, children, and games/slots
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * POST /api/bookings
 */
exports.createBooking = async (req, res) => {
  try {
    const result = await BookingModel.createBooking(req.body);
    res.status(201).json({
      message: 'Booking created successfully',
      booking_id: result.booking_id,
      payment_id: result.payment_id || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
