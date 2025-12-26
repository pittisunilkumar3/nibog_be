const { promisePool } = require('../config/config');

const UserModel = {
  async listAllWithCity() {
    const [rows] = await promisePool.query(`
      SELECT u.*, c.city_name, c.state
      FROM users u
      LEFT JOIN cities c ON u.city_id = c.id
      ORDER BY u.user_id ASC
    `);
    return rows;
  },
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
  async updateUserById(user_id, data) {
    const fields = [];
    const values = [];
    for (const key in data) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
    if (!fields.length) return 0;
    values.push(user_id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`;
    const [result] = await promisePool.execute(sql, values);
    return result.affectedRows;
  },
  async updateLastLogin(user_id) {
    await promisePool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?', [user_id]);
  },
  async getByGoogleId(google_id) {
    const [rows] = await promisePool.query(`
      SELECT u.*, c.city_name, c.state
      FROM users u
      LEFT JOIN cities c ON u.city_id = c.id
      WHERE u.google_id = ?
    `, [google_id]);
    return rows[0] || null;
  },
  async createGoogleUser(userData) {
    const { full_name, email, google_id, phone, city_id, email_verified } = userData;
    const [result] = await promisePool.query(
      'INSERT INTO users (full_name, email, google_id, auth_provider, phone, city_id, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [full_name, email, google_id, 'google', phone || '', city_id || null, email_verified ? 1 : 0]
    );
    return this.getById(result.insertId);
  },
  async updateGoogleUser(user_id, userData) {
    const { full_name, email, email_verified } = userData;
    const fields = [];
    const values = [];
    
    if (full_name) {
      fields.push('full_name = ?');
      values.push(full_name);
    }
    if (email) {
      fields.push('email = ?');
      values.push(email);
    }
    if (email_verified !== undefined) {
      fields.push('email_verified = ?');
      values.push(email_verified ? 1 : 0);
    }
    
    if (fields.length === 0) return 0;
    
    values.push(user_id);
    const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`;
    const [result] = await promisePool.execute(sql, values);
    return result.affectedRows;
  }
};

module.exports = UserModel;
