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
    // Validate required fields
    if (!req.body.children || req.body.children.length === 0) {
      return res.status(400).json({ error: 'At least one child is required' });
    }
    if (!req.body.booking_games || req.body.booking_games.length === 0) {
      return res.status(400).json({ error: 'At least one booking game is required' });
    }
    if (!req.body.event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }
    if (!req.body.parent_name || !req.body.email || !req.body.phone) {
      return res.status(400).json({ error: 'Parent information (parent_name, email, phone) is required' });
    }
    
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
