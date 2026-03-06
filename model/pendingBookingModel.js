const { promisePool: db } = require('../config/config');

const PendingBooking = {
  // Create a pending booking
  async create(data) {
    const [result] = await db.query(
      `INSERT INTO pending_bookings (transaction_id, user_id, booking_data, status, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [data.transaction_id, data.user_id, data.booking_data, data.status || 'pending', data.expires_at]
    );
    return { id: result.insertId, ...data };
  },

  // Get by transaction ID
  async getByTransactionId(transactionId) {
    const [rows] = await db.query(
      'SELECT * FROM pending_bookings WHERE transaction_id = ?',
      [transactionId]
    );
    return rows[0];
  },

  // Update status
  async updateStatus(transactionId, status) {
    await db.query(
      'UPDATE pending_bookings SET status = ? WHERE transaction_id = ?',
      [status, transactionId]
    );
  },

  // Delete by transaction ID
  async delete(transactionId) {
    await db.query('DELETE FROM pending_bookings WHERE transaction_id = ?', [transactionId]);
  },

  // Clean up expired bookings
  async cleanupExpired() {
    const [result] = await db.query(
      "DELETE FROM pending_bookings WHERE expires_at < NOW() AND status = 'pending'"
    );
    return result.affectedRows;
  }
};

module.exports = PendingBooking;
