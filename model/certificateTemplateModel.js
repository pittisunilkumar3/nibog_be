const { promisePool } = require('../config/config');

/**
 * Certificate Templates Model
 * Stores certificate designs created in the superadmin template designer.
 */

const JSON_FIELDS = ['certificate_title_style', 'appreciation_text_style', 'signature_style', 'background_style', 'fields'];

function parseTemplate(row) {
  if (!row) return null;
  const t = { ...row };
  JSON_FIELDS.forEach(f => {
    if (typeof t[f] === 'string') {
      try { t[f] = JSON.parse(t[f]); } catch { t[f] = f === 'fields' ? [] : null; }
    }
    if (t[f] === undefined || t[f] === null) t[f] = f === 'fields' ? [] : null;
  });
  t.is_active = !!t.is_active;
  return t;
}

const CertificateTemplateModel = {
  async getAll() {
    const [rows] = await promisePool.query(
      'SELECT * FROM certificate_templates ORDER BY created_at DESC'
    );
    return rows.map(parseTemplate);
  },

  async getById(id) {
    const [rows] = await promisePool.query(
      'SELECT * FROM certificate_templates WHERE id = ? LIMIT 1',
      [id]
    );
    return parseTemplate(rows[0]);
  },

  async getByType(type) {
    const [rows] = await promisePool.query(
      'SELECT * FROM certificate_templates WHERE type = ? AND is_active = 1 ORDER BY created_at DESC',
      [type]
    );
    return rows.map(parseTemplate);
  },

  async create(data) {
    const [result] = await promisePool.query(
      `INSERT INTO certificate_templates
        (name, description, type, certificate_title, certificate_title_style,
         appreciation_text, appreciation_text_style, signature_image, signature_style,
         background_image, background_style, paper_size, orientation, fields, is_active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        data.name,
        data.description || '',
        data.type || 'participation',
        data.certificate_title || null,
        data.certificate_title_style ? JSON.stringify(data.certificate_title_style) : null,
        data.appreciation_text || null,
        data.appreciation_text_style ? JSON.stringify(data.appreciation_text_style) : null,
        data.signature_image || null,
        data.signature_style ? JSON.stringify(data.signature_style) : null,
        data.background_image || null,
        data.background_style ? JSON.stringify(data.background_style) : null,
        data.paper_size || 'a4',
        data.orientation || 'landscape',
        data.fields ? JSON.stringify(data.fields) : JSON.stringify([]),
        data.is_active === false ? 0 : 1
      ]
    );
    return this.getById(result.insertId);
  },

  async update(data) {
    const existing = await this.getById(data.id);
    if (!existing) return null;
    await promisePool.query(
      `UPDATE certificate_templates SET
        name = ?, description = ?, type = ?, certificate_title = ?, certificate_title_style = ?,
        appreciation_text = ?, appreciation_text_style = ?, signature_image = ?, signature_style = ?,
        background_image = ?, background_style = ?, paper_size = ?, orientation = ?, fields = ?, is_active = ?
       WHERE id = ?`,
      [
        data.name ?? existing.name,
        data.description ?? existing.description,
        data.type ?? existing.type,
        data.certificate_title ?? existing.certificate_title,
        data.certificate_title_style ? JSON.stringify(data.certificate_title_style) : (data.certificate_title_style === null ? null : JSON.stringify(existing.certificate_title_style)),
        data.appreciation_text ?? existing.appreciation_text,
        data.appreciation_text_style ? JSON.stringify(data.appreciation_text_style) : (data.appreciation_text_style === null ? null : JSON.stringify(existing.appreciation_text_style)),
        data.signature_image ?? existing.signature_image,
        data.signature_style ? JSON.stringify(data.signature_style) : (data.signature_style === null ? null : JSON.stringify(existing.signature_style)),
        data.background_image ?? existing.background_image,
        data.background_style ? JSON.stringify(data.background_style) : (data.background_style === null ? null : JSON.stringify(existing.background_style)),
        data.paper_size ?? existing.paper_size,
        data.orientation ?? existing.orientation,
        data.fields ? JSON.stringify(data.fields) : JSON.stringify(existing.fields || []),
        data.is_active === undefined ? (existing.is_active ? 1 : 0) : (data.is_active ? 1 : 0),
        data.id
      ]
    );
    return this.getById(data.id);
  },

  async delete(id) {
    const [result] = await promisePool.query(
      'DELETE FROM certificate_templates WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
};

module.exports = CertificateTemplateModel;
