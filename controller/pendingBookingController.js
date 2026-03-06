const PendingBookingModel = require('../model/pendingBookingModel');

// Create a pending booking
const create = async (req, res) => {
  try {
    const { transaction_id, user_id, booking_data, expires_at, status } = req.body;

    if (!transaction_id || !user_id || !booking_data || !expires_at) {
      return res.status(400).json({ 
        success: false,
        error: 'transaction_id, user_id, booking_data, and expires_at are required' 
      });
    }

    const pendingBooking = await PendingBookingModel.create({
      transaction_id,
      user_id,
      booking_data: typeof booking_data === 'string' ? booking_data : JSON.stringify(booking_data),
      status: status || 'pending',
      expires_at
    });

    res.status(201).json({
      success: true,
      id: pendingBooking.id,
      transaction_id: pendingBooking.transaction_id,
      expires_at: pendingBooking.expires_at
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'Transaction ID already exists' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get a pending booking by transaction ID
const getByTransactionId = async (req, res) => {
  try {
    const { transaction_id } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ success: false, error: 'transaction_id is required' });
    }

    const pendingBooking = await PendingBookingModel.getByTransactionId(transaction_id);

    if (!pendingBooking) {
      return res.status(404).json({ 
        success: false, 
        error: 'Pending booking not found' 
      });
    }

    // Check if expired
    if (new Date(pendingBooking.expires_at) < new Date()) {
      await PendingBookingModel.updateStatus(transaction_id, 'expired');
      return res.status(410).json({ 
        success: false, 
        error: 'Pending booking has expired' 
      });
    }

    // Parse booking data
    let bookingData;
    try {
      bookingData = typeof pendingBooking.booking_data === 'string' 
        ? JSON.parse(pendingBooking.booking_data) 
        : pendingBooking.booking_data;
    } catch (e) {
      bookingData = pendingBooking.booking_data;
    }

    res.json({
      success: true,
      bookingData,
      status: pendingBooking.status,
      expires_at: pendingBooking.expires_at
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete a pending booking
const deletePending = async (req, res) => {
  try {
    const { transaction_id } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ success: false, error: 'transaction_id is required' });
    }

    await PendingBookingModel.delete(transaction_id);
    res.json({ success: true, message: 'Pending booking deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update status (for marking as completed after payment)
const updateStatus = async (req, res) => {
  try {
    const { transaction_id, status } = req.body;

    if (!transaction_id || !status) {
      return res.status(400).json({ success: false, error: 'transaction_id and status are required' });
    }

    await PendingBookingModel.updateStatus(transaction_id, status);
    res.json({ success: true, message: 'Status updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  create,
  getByTransactionId,
  delete: deletePending,
  updateStatus
};
