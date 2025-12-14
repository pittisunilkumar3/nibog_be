const { promisePool } = require('../config/config');

const HomepageSectionsModel = {
  async list() {
    const [rows] = await promisePool.query('SELECT * FROM homepage_sections ORDER BY priority ASC, id ASC');
    return rows;
  },
  async get(id) {
    const [rows] = await promisePool.query('SELECT * FROM homepage_sections WHERE id = ?', [id]);
    return rows[0] || null;
  },
  async create(data) {
    const { image_path, priority = 1, status = 'active' } = data;
    const [result] = await promisePool.query(
      'INSERT INTO homepage_sections (image_path, priority, status) VALUES (?, ?, ?)',
      [image_path, priority, status]
    );
    return { id: result.insertId, ...data };
  },
  async update(id, data) {
    const fields = [];
    const values = [];
    if (data.image_path !== undefined) { fields.push('image_path = ?'); values.push(data.image_path); }
    if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (!fields.length) return false;
    values.push(id);
    const [result] = await promisePool.query(
      `UPDATE homepage_sections SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  },
  async remove(id) {
    const [result] = await promisePool.query('DELETE FROM homepage_sections WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = HomepageSectionsModel;
