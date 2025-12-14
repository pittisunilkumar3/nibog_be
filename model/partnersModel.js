const { promisePool } = require('../config/config');

const PartnersModel = {
  async list() {
    const [rows] = await promisePool.query('SELECT * FROM partners ORDER BY display_priority ASC, id ASC');
    return rows;
  },
  async get(id) {
    const [rows] = await promisePool.query('SELECT * FROM partners WHERE id = ?', [id]);
    return rows[0] || null;
  },
  async create(data) {
    const { partner_name, image_url, display_priority = 1, status = 'Active' } = data;
    const [result] = await promisePool.query(
      'INSERT INTO partners (partner_name, image_url, display_priority, status) VALUES (?, ?, ?, ?)',
      [partner_name, image_url, display_priority, status]
    );
    return { id: result.insertId, ...data };
  },
  async update(id, data) {
    const fields = [];
    const values = [];
    if (data.partner_name !== undefined) { fields.push('partner_name = ?'); values.push(data.partner_name); }
    if (data.image_url !== undefined) { fields.push('image_url = ?'); values.push(data.image_url); }
    if (data.display_priority !== undefined) { fields.push('display_priority = ?'); values.push(data.display_priority); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (!fields.length) return false;
    values.push(id);
    const [result] = await promisePool.query(
      `UPDATE partners SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  },
  async remove(id) {
    const [result] = await promisePool.query('DELETE FROM partners WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = PartnersModel;
