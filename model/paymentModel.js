const { promisePool } = require('../config/config');

/**
 * Payment Model - Handles all payment-related database operations
 */

/**
 * Get all payments with filters and joins
 * @param {Object} filters - Optional filters for the query
 * @returns {Promise<Array>} Array of payment objects with joined data
 */
exports.getAllPayments = async (filters = {}) => {
  try {
    let query = `
      SELECT 
        p.id as payment_id,
        p.booking_id,
        p.transaction_id,
        p.amount,
        p.payment_method,
        p.payment_status,
        p.created_at,
        p.updated_at,
        b.id as booking_id,
        b.event_id,
        b.booking_ref,
        b.status as booking_status,
        b.total_amount as booking_total_amount,
        pa.parent_name as user_name,
        pa.email as user_email,
        pa.phone as user_phone,
        e.title as event_title,
        e.event_date,
        e.description as event_description,
        c.city_name,
        v.venue_name,
        v.address as venue_address,
        ch.full_name as child_name,
        ch.date_of_birth as child_dob,
        bg.game_price
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN parents pa ON b.parent_id = pa.id
      LEFT JOIN events e ON b.event_id = e.id
      LEFT JOIN cities c ON e.city_id = c.id
      LEFT JOIN venues v ON e.venue_id = v.id
      LEFT JOIN children ch ON ch.parent_id = pa.id
      LEFT JOIN booking_games bg ON bg.booking_id = b.id AND bg.child_id = ch.id
      WHERE 1=1
    `;

    const params = [];

    // Add filters
    if (filters.status) {
      query += ` AND p.payment_status = ?`;
      params.push(filters.status);
    }

    if (filters.start_date) {
      query += ` AND DATE(p.created_at) >= ?`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ` AND DATE(p.created_at) <= ?`;
      params.push(filters.end_date);
    }

    if (filters.event_id) {
      query += ` AND b.event_id = ?`;
      params.push(filters.event_id);
    }

    if (filters.city_id) {
      query += ` AND e.city_id = ?`;
      params.push(filters.city_id);
    }

    if (filters.search) {
      query += ` AND (
        p.transaction_id LIKE ? OR
        u.name LIKE ? OR
        u.email LIKE ? OR
        u.phone LIKE ? OR
        e.event_title LIKE ?
      )`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY p.created_at DESC`;

    const [rows] = await promisePool.query(query, params);
    
    // Group results by payment_id to handle multiple children/games
    const paymentsMap = new Map();
    
    rows.forEach(row => {
      if (!paymentsMap.has(row.payment_id)) {
        paymentsMap.set(row.payment_id, {
          payment_id: row.payment_id,
          booking_id: row.booking_id,
          transaction_id: row.transaction_id,
          phonepe_transaction_id: row.phonepe_transaction_id,
          amount: row.amount,
          payment_method: row.payment_method,
          payment_status: row.payment_status,
          payment_date: row.payment_date,
          created_at: row.created_at,
          updated_at: row.updated_at,
          gateway_response: row.gateway_response,
          refund_amount: row.refund_amount,
          refund_date: row.refund_date,
          refund_reason: row.refund_reason,
          admin_notes: row.admin_notes,
          user_name: row.user_name,
          user_email: row.user_email,
          user_phone: row.user_phone,
          event_title: row.event_title,
          event_date: row.event_date,
          event_description: row.event_description,
          city_name: row.city_name,
          venue_name: row.venue_name,
          venue_address: row.venue_address,
          booking_ref: row.booking_ref,
          booking_status: row.booking_status,
          booking_total_amount: row.booking_total_amount,
          child_name: row.child_name,
          child_age: row.child_age,
          game_name: row.game_name,
          game_price: row.game_price
        });
      }
    });

    return Array.from(paymentsMap.values());
  } catch (error) {
    console.error('Error in getAllPayments:', error);
    throw error;
  }
};

/**
 * Get payment by ID with all joined data
 * @param {number} paymentId - Payment ID
 * @returns {Promise<Object>} Payment object with joined data
 */
exports.getPaymentById = async (paymentId) => {
  try {
    const query = `
      SELECT 
        p.id as payment_id,
        p.booking_id,
        p.transaction_id,
        p.amount,
        p.payment_method,
        p.payment_status,
        p.created_at,
        p.updated_at,
        b.id as booking_id,
        b.event_id,
        b.booking_ref,
        b.status as booking_status,
        b.total_amount as booking_total_amount,
        pa.parent_name as user_name,
        pa.email as user_email,
        pa.phone as user_phone,
        e.title as event_title,
        e.event_date,
        e.description as event_description,
        c.city_name,
        v.venue_name,
        v.address as venue_address
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN parents pa ON b.parent_id = pa.id
      LEFT JOIN events e ON b.event_id = e.id
      LEFT JOIN cities c ON e.city_id = c.id
      LEFT JOIN venues v ON e.venue_id = v.id
      WHERE p.id = ?
    `;

    const [rows] = await promisePool.query(query, [paymentId]);
    
    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  } catch (error) {
    console.error('Error in getPaymentById:', error);
    throw error;
  }
};

/**
 * Create a new payment
 * @param {Object} paymentData - Payment data
 * @returns {Promise<Object>} Created payment with ID
 */
exports.createPayment = async (paymentData) => {
  try {
    const query = `
      INSERT INTO payments (
        booking_id,
        transaction_id,
        phonepe_transaction_id,
        amount,
        payment_method,
        payment_status,
        payment_date,
        gateway_response
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      paymentData.booking_id,
      paymentData.transaction_id,
      paymentData.phonepe_transaction_id || null,
      paymentData.amount,
      paymentData.payment_method || 'PhonePe',
      paymentData.payment_status || 'Paid',
      paymentData.payment_date || new Date(),
      paymentData.gateway_response ? JSON.stringify(paymentData.gateway_response) : null
    ];

    const [result] = await promisePool.query(query, params);
    
    return {
      payment_id: result.insertId,
      ...paymentData
    };
  } catch (error) {
    console.error('Error in createPayment:', error);
    throw error;
  }
};

/**
 * Update payment status and details
 * @param {number} paymentId - Payment ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated payment
 */
exports.updatePayment = async (paymentId, updateData) => {
  try {
    const fields = [];
    const params = [];

    // Dynamically build UPDATE query based on provided fields
    if (updateData.payment_status !== undefined) {
      fields.push('payment_status = ?');
      params.push(updateData.payment_status);
    }
    if (updateData.payment_method !== undefined) {
      fields.push('payment_method = ?');
      params.push(updateData.payment_method);
    }
    if (updateData.amount !== undefined) {
      fields.push('amount = ?');
      params.push(updateData.amount);
    }
    if (updateData.refund_amount !== undefined) {
      fields.push('refund_amount = ?');
      params.push(updateData.refund_amount);
    }
    if (updateData.refund_date !== undefined) {
      fields.push('refund_date = ?');
      params.push(updateData.refund_date);
    }
    if (updateData.refund_reason !== undefined) {
      fields.push('refund_reason = ?');
      params.push(updateData.refund_reason);
    }
    if (updateData.admin_notes !== undefined) {
      fields.push('admin_notes = ?');
      params.push(updateData.admin_notes);
    }
    if (updateData.gateway_response !== undefined) {
      fields.push('gateway_response = ?');
      params.push(JSON.stringify(updateData.gateway_response));
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push('updated_at = NOW()');
    params.push(paymentId);

    const query = `UPDATE payments SET ${fields.join(', ')} WHERE id = ?`;

    await promisePool.query(query, params);

    // Return updated payment
    return await exports.getPaymentById(paymentId);
  } catch (error) {
    console.error('Error in updatePayment:', error);
    throw error;
  }
};

/**
 * Delete a payment (CASCADE will handle related records)
 * @param {number} paymentId - Payment ID
 * @returns {Promise<boolean>} Success status
 */
exports.deletePayment = async (paymentId) => {
  try {
    // First check if payment exists
    const payment = await exports.getPaymentById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Delete payment - this will cascade if foreign keys are set up
    const query = `DELETE FROM payments WHERE id = ?`;
    const [result] = await promisePool.query(query, [paymentId]);

    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error in deletePayment:', error);
    throw error;
  }
};

/**
 * Get payment analytics
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} Analytics data
 */
exports.getPaymentAnalytics = async (filters = {}) => {
  try {
    // Summary stats
    const summaryQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN payment_status = 'successful' THEN amount ELSE 0 END), 0) as total_revenue,
        COUNT(*) as total_payments,
        SUM(CASE WHEN payment_status = 'successful' THEN 1 ELSE 0 END) as successful_payments,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_payments,
        SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) as failed_payments,
        SUM(CASE WHEN payment_status = 'refunded' THEN 1 ELSE 0 END) as refunded_payments,
        COALESCE(SUM(refund_amount), 0) as refund_amount,
        COALESCE(AVG(CASE WHEN payment_status = 'successful' THEN amount END), 0) as average_transaction
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.booking_id
      LEFT JOIN events e ON b.event_id = e.event_id
      WHERE 1=1
    `;

    const params = [];
    let filterClause = '';

    if (filters.start_date) {
      filterClause += ` AND DATE(p.created_at) >= ?`;
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      filterClause += ` AND DATE(p.created_at) <= ?`;
      params.push(filters.end_date);
    }
    if (filters.event_id) {
      filterClause += ` AND b.event_id = ?`;
      params.push(filters.event_id);
    }
    if (filters.city_id) {
      filterClause += ` AND e.city_id = ?`;
      params.push(filters.city_id);
    }

    const [summaryRows] = await promisePool.query(summaryQuery + filterClause, params);

    return {
      summary: summaryRows[0]
    };
  } catch (error) {
    console.error('Error in getPaymentAnalytics:', error);
    throw error;
  }
};

module.exports = exports;
