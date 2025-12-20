const { promisePool } = require('../config/config');

const TestimonialsModel = {
  async list(filters = {}) {
    const conditions = [];
    const values = [];
    if (filters.event_id) { conditions.push('t.event_id = ?'); values.push(filters.event_id); }
    if (filters.city_id) { conditions.push('t.city_id = ?'); values.push(filters.city_id); }
    if (filters.status) { conditions.push('t.status = ?'); values.push(filters.status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT t.*, c.city_name, e.title AS event_name
      FROM testimonials t
      LEFT JOIN cities c ON t.city_id = c.id
      LEFT JOIN events e ON t.event_id = e.id
      ${where}
      ORDER BY t.priority DESC, t.submitted_at DESC
    `;
    const [rows] = await promisePool.query(sql, values);
    return rows;
  },

  async get(id) {
    const sql = `
      SELECT t.*, c.city_name, e.title AS event_name
      FROM testimonials t
      LEFT JOIN cities c ON t.city_id = c.id
      LEFT JOIN events e ON t.event_id = e.id
      WHERE t.id = ?
    `;
    const [rows] = await promisePool.query(sql, [id]);
    return rows[0] || null;
  },

  async create(data) {
    // Build insert dynamically so we omit fields that are undefined (this lets DB defaults like submitted_at apply)
    const fields = ['name'];
    const placeholders = ['?'];
    const values = [data.name];
    const optional = ['city_id','event_id','rating','testimonial','submitted_at','status','image_url','priority','is_active'];
    for (const f of optional) {
      if (data[f] !== undefined) {
        fields.push(f);
        placeholders.push('?');
        values.push(data[f]);
      }
    }

    const sql = `INSERT INTO testimonials (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
    const [result] = await promisePool.execute(sql, values);
    return result.insertId;
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    for (const key in data) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
    if (!fields.length) return 0;
    values.push(id);
    const sql = `UPDATE testimonials SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await promisePool.execute(sql, values);
    return result.affectedRows;
  },

  async remove(id) {
    const [result] = await promisePool.execute('DELETE FROM testimonials WHERE id = ?', [id]);
    return result.affectedRows;
  }
};

module.exports = TestimonialsModel;
