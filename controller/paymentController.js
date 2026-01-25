const PaymentModel = require('../model/paymentModel');

/**
 * Get all payments with filters
 * GET /api/payments
 */
exports.getAllPayments = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      city_id: req.query.city_id ? parseInt(req.query.city_id) : undefined,
      event_id: req.query.event_id ? parseInt(req.query.event_id) : undefined,
      search: req.query.search
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => 
      filters[key] === undefined && delete filters[key]
    );

    const payments = await PaymentModel.getAllPayments(filters);
    
    res.status(200).json({
      success: true,
      data: payments,
      count: payments.length
    });
  } catch (error) {
    console.error('Error in getAllPayments controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message
    });
  }
};

/**
 * Get payment by ID
 * GET /api/payments/:id
 */
exports.getPaymentById = async (req, res) => {
  try {
    const paymentId = req.params.id;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }

    const payment = await PaymentModel.getPaymentById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error in getPaymentById controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment',
      error: error.message
    });
  }
};

/**
 * Create a new payment
 * POST /api/payments
 */
exports.createPayment = async (req, res) => {
  try {
    const paymentData = req.body;

    // Validate required fields
    if (!paymentData.booking_id || !paymentData.amount) {
      return res.status(400).json({
        success: false,
        message: 'booking_id and amount are required'
      });
    }

    const payment = await PaymentModel.createPayment(paymentData);

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error in createPayment controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment',
      error: error.message
    });
  }
};

/**
 * Update payment
 * PATCH /api/payments/:id
 */
exports.updatePayment = async (req, res) => {
  try {
    const paymentId = req.params.id;
    const updateData = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data provided for update'
      });
    }

    const payment = await PaymentModel.updatePayment(paymentId, updateData);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error in updatePayment controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment',
      error: error.message
    });
  }
};

/**
 * Delete payment
 * DELETE /api/payments/:id
 */
exports.deletePayment = async (req, res) => {
  try {
    const paymentId = req.params.id;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }

    const success = await PaymentModel.deletePayment(paymentId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or already deleted'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Error in deletePayment controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment',
      error: error.message
    });
  }
};

/**
 * Get payment analytics
 * GET /api/payments/analytics
 */
exports.getPaymentAnalytics = async (req, res) => {
  try {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      city_id: req.query.city_id ? parseInt(req.query.city_id) : undefined,
      event_id: req.query.event_id ? parseInt(req.query.event_id) : undefined
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => 
      filters[key] === undefined && delete filters[key]
    );

    const analytics = await PaymentModel.getPaymentAnalytics(filters);

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error in getPaymentAnalytics controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment analytics',
      error: error.message
    });
  }
};

/**
 * Update payment status (for refunds, etc.)
 * PATCH /api/payments/:id/status
 */
exports.updatePaymentStatus = async (req, res) => {
  try {
    const paymentId = req.params.id;
    const { payment_status, refund_amount, refund_reason, admin_notes } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }

    if (!payment_status) {
      return res.status(400).json({
        success: false,
        message: 'payment_status is required'
      });
    }

    // Validate status value
    const validStatuses = ['successful', 'pending', 'failed', 'refunded'];
    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updateData = {
      payment_status
    };

    // Add refund fields if status is refunded
    if (payment_status === 'refunded') {
      if (!refund_amount) {
        return res.status(400).json({
          success: false,
          message: 'refund_amount is required when status is refunded'
        });
      }
      updateData.refund_amount = refund_amount;
      updateData.refund_date = new Date();
      if (refund_reason) updateData.refund_reason = refund_reason;
    }

    if (admin_notes) {
      updateData.admin_notes = admin_notes;
    }

    const payment = await PaymentModel.updatePayment(paymentId, updateData);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Payment status updated to ${payment_status}`,
      data: payment
    });
  } catch (error) {
    console.error('Error in updatePaymentStatus controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message
    });
  }
};

module.exports = exports;
