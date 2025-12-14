const { promisePool } = require('../config/config');

const VenueModel = {
  async list() {
    const [rows] = await promisePool.query(`
      SELECT v.*, c.city_name, c.state
      FROM venues v
      LEFT JOIN cities c ON v.city_id = c.id
      ORDER BY v.venue_name ASC
    `);
    return rows;
  },
  async get(id) {
    const [rows] = await promisePool.query(`
      SELECT v.*, c.city_name, c.state
      FROM venues v
      LEFT JOIN cities c ON v.city_id = c.id
      WHERE v.id = ?
    `, [id]);
    return rows[0];
  },
  async create(data) {
    const sql = 'INSERT INTO venues (venue_name, address, city_id, capacity, is_active) VALUES (?, ?, ?, ?, ?)';
    const [result] = await promisePool.execute(sql, [data.venue_name, data.address, data.city_id, data.capacity ?? null, data.is_active ?? 1]);
    return result;
  },
  async update(id, data) {
    const fields = [];
    const values = [];
    for (const key in data) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
    values.push(id);
    const sql = `UPDATE venues SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await promisePool.execute(sql, values);
    return result;
  },
  async delete(id) {
    const sql = 'DELETE FROM venues WHERE id = ?';
    const [result] = await promisePool.execute(sql, [id]);
    return result;
  }
};

module.exports = VenueModel;
