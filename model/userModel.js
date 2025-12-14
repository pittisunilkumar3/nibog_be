const { promisePool } = require('../config/config');

const UserModel = {
  async getByEmail(email) {
    const [rows] = await promisePool.query(`
      SELECT u.*, c.city_name, c.state
      FROM users u
      LEFT JOIN cities c ON u.city_id = c.id
      WHERE u.email = ?
    `, [email]);
    return rows[0] || null;
  },
  async getById(user_id) {
    const [rows] = await promisePool.query(`
      SELECT u.*, c.city_name, c.state
      FROM users u
      LEFT JOIN cities c ON u.city_id = c.id
      WHERE u.user_id = ?
    `, [user_id]);
    return rows[0] || null;
  },
  async create(user) {
    const { full_name, email, password_hash, phone, city_id } = user;
    const [result] = await promisePool.query(
      'INSERT INTO users (full_name, email, password_hash, phone, city_id) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, password_hash, phone, city_id]
    );
    return this.getById(result.insertId);
  },
  async updateLastLogin(user_id) {
    await promisePool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?', [user_id]);
  }
};

module.exports = UserModel;
