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
    
    // Validate that at least one child has booking_games
    const hasBookingGames = req.body.children.some(child => 
      child.booking_games && Array.isArray(child.booking_games) && child.booking_games.length > 0
    );
    
    if (!hasBookingGames) {
      return res.status(400).json({ error: 'At least one child must have booking_games' });
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

/**
 * Get user profile with all booking details by user_id
 * Returns user info, parent info, bookings with children, games, and payments
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * GET /api/bookings/user/:userId
 */
exports.getUserProfileWithBookings = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await BookingModel.getUserProfileWithBookings(userId);
    
    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
