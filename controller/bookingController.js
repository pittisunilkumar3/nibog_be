
const BookingModel = require('../model/bookingModel');


/**
 * Update an existing booking and its related data
 * PATCH /api/bookings/:id
 */
exports.updateBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }
    // Validate input (at least one field to update)
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'No data provided for update' });
    }
    await BookingModel.updateBooking(bookingId, req.body);
    // Optionally, return the updated booking
    const updatedBooking = await BookingModel.getBookingById(bookingId);
    res.status(200).json({
      message: 'Booking updated successfully',
      data: updatedBooking
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


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

/**
 * Get all bookings with complete details (upcoming events only)
 * Returns list of bookings for events that haven't passed
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * GET /api/bookings
 */
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await BookingModel.getAllBookings();
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get all bookings including past and upcoming events
 * Returns complete list of all bookings regardless of event date
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * GET /api/bookings/all
 */
exports.getAllBookingsComplete = async (req, res) => {
  try {
    const bookings = await BookingModel.getAllBookingsComplete();
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get single booking details by booking ID
 * Returns complete booking info with parent, event, children, games, and payments
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * GET /api/bookings/:id
 */
exports.getBookingById = async (req, res) => {
  try {
    const bookingId = req.params.id;
    
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    const booking = await BookingModel.getBookingById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete a booking and all related data
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * DELETE /api/bookings/:id
 */
exports.deleteBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    const result = await BookingModel.deleteBooking(bookingId);
    
    if (result === null) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
