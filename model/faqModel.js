const { promisePool } = require('../config/config');

const FaqModel = {
  // Get a single FAQ by id
  get: async (id) => {
    const [rows] = await promisePool.query('SELECT * FROM faqs WHERE id = ?', [id]);
    return rows[0];
  },

  // Get all FAQs (optionally filter by status/category)
  list: async (filter = {}) => {
    let sql = 'SELECT * FROM faqs';
    const values = [];
    const conditions = [];
    if (filter.status) {
      conditions.push('status = ?');
      values.push(filter.status);
    }
    if (filter.category) {
      conditions.push('category = ?');
      values.push(filter.category);
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY display_priority ASC, created_at DESC';
    const [rows] = await promisePool.query(sql, values);
    return rows;
  },

  create: async (data) => {
    const { question, answer, category, display_priority = 1, status = 'Active' } = data;
    const sql = `INSERT INTO faqs (question, answer, category, display_priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`;
    const [result] = await promisePool.execute(sql, [question, answer, category, display_priority, status]);
    return { id: result.insertId, ...data };
  },

  update: async (id, data) => {
    const fields = [];
    const values = [];
    for (const key in data) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
    values.push(id);
    const sql = `UPDATE faqs SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await promisePool.execute(sql, values);
    return result;
  },

  delete: async (id) => {
    const sql = 'DELETE FROM faqs WHERE id = ?';
    const [result] = await promisePool.execute(sql, [id]);
    return result;
  }
};

module.exports = FaqModel;
