const { promisePool } = require('../config/config');
const crypto = require('crypto');

const PasswordResetModel = {
  /**
   * Create a password reset token for a user
   * @param {number} user_id - The user ID
   * @returns {Object} - Token details including the token string
   */
  async createResetToken(user_id) {
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    
    const [result] = await promisePool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user_id, token, expiresAt]
    );
    
    return {
      token_id: result.insertId,
      token,
      expires_at: expiresAt
    };
  },

  /**
   * Find a valid (unused and not expired) reset token
   * @param {string} token - The reset token
   * @returns {Object|null} - Token details with user info or null
   */
  async findValidToken(token) {
    const [rows] = await promisePool.query(`
      SELECT prt.*, u.email, u.full_name
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.user_id
      WHERE prt.token = ? 
        AND prt.used = 0 
        AND prt.expires_at > NOW()
    `, [token]);
    
    return rows[0] || null;
  },

  /**
   * Mark a token as used
   * @param {string} token - The reset token
   * @returns {number} - Number of affected rows
   */
  async markTokenAsUsed(token) {
    const [result] = await promisePool.query(
      'UPDATE password_reset_tokens SET used = 1 WHERE token = ?',
      [token]
    );
    
    return result.affectedRows;
  },

  /**
   * Delete expired or used tokens (cleanup)
   * @returns {number} - Number of deleted rows
   */
  async cleanupExpiredTokens() {
    const [result] = await promisePool.query(
      'DELETE FROM password_reset_tokens WHERE used = 1 OR expires_at < NOW()'
    );
    
    return result.affectedRows;
  },

  /**
   * Delete all reset tokens for a user
   * @param {number} user_id - The user ID
   * @returns {number} - Number of deleted rows
   */
  async deleteUserTokens(user_id) {
    const [result] = await promisePool.query(
      'DELETE FROM password_reset_tokens WHERE user_id = ?',
      [user_id]
    );
    
    return result.affectedRows;
  }
};

module.exports = PasswordResetModel;
