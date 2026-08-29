const { promisePool } = require('../config/config');

/**
 * Certificates Model — generated certificates (one per participant/game).
 */

function parseCert(row) {
  if (!row) return null;
  const c = { ...row };
  if (typeof c.certificate_data === 'string') {
    try { c.certificate_data = JSON.parse(c.certificate_data); } catch { c.certificate_data = {}; }
  }
  return c;
}

const CertificateModel = {
  async generate(data) {
    const certificateNumber = 'NIB-CERT-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    const [result] = await promisePool.query(
      `INSERT INTO certificates
        (certificate_number, template_id, event_id, game_id, user_id, parent_id, child_id,
         participant_name, certificate_data, status)
       VALUES (?,?,?,?,?,?,?,?,?, 'generated')`,
      [
        certificateNumber,
        data.template_id,
        data.event_id || null,
        data.game_id || null,
        data.user_id || null,
        data.parent_id || null,
        data.child_id || null,
        (data.certificate_data && data.certificate_data.participant_name) || data.participant_name || '',
        JSON.stringify(data.certificate_data || {}),
      ]
    );
    return this.getById(result.insertId);
  },

  async getById(id) {
    const [rows] = await promisePool.query(
      `SELECT c.*, t.name AS template_name, t.type AS template_type,
              e.title AS event_title, e.event_date AS event_date,
              v.venue_name AS venue_name, ci.city_name AS city_name
       FROM certificates c
       LEFT JOIN certificate_templates t ON c.template_id = t.id
       LEFT JOIN events e ON c.event_id = e.id
       LEFT JOIN venues v ON e.venue_id = v.id
       LEFT JOIN cities ci ON e.city_id = ci.id
       WHERE c.id = ? LIMIT 1`,
      [id]
    );
    return parseCert(rows[0]);
  },

  async list({ eventId, search, status, templateId, limit = 500, offset = 0 } = {}) {
    const where = [];
    const params = [];
    if (eventId) { where.push('c.event_id = ?'); params.push(eventId); }
    if (templateId) { where.push('c.template_id = ?'); params.push(templateId); }
    if (status) { where.push('c.status = ?'); params.push(status); }
    if (search) {
      where.push('(c.participant_name LIKE ? OR c.certificate_number LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const [rows] = await promisePool.query(
      `SELECT c.*, t.name AS template_name, t.type AS template_type,
              e.title AS event_title, e.event_date AS event_date,
              v.venue_name AS venue_name, ci.city_name AS city_name
       FROM certificates c
       LEFT JOIN certificate_templates t ON c.template_id = t.id
       LEFT JOIN events e ON c.event_id = e.id
       LEFT JOIN venues v ON e.venue_id = v.id
       LEFT JOIN cities ci ON e.city_id = ci.id
       ${whereSql}
       ORDER BY c.generated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    return rows.map(parseCert);
  },

  async markStatus(id, status) {
    const col = status === 'sent' ? 'sent_at' : status === 'downloaded' ? 'downloaded_at' : null;
    if (col) {
      await promisePool.query(`UPDATE certificates SET status = ?, ${col} = NOW() WHERE id = ?`, [status, id]);
    } else {
      await promisePool.query('UPDATE certificates SET status = ? WHERE id = ?', [status, id]);
    }
  },

  /** Participants of an event for certificate generation (paid/confirmed bookings with games). */
  async eventParticipants(eventId) {
    const [rows] = await promisePool.query(
      `SELECT
         b.id AS booking_id,
         b.booking_ref AS booking_ref,
         b.parent_id AS parent_id,
         p.parent_name AS parent_name,
         p.email AS email,
         p.phone AS additional_phone,
         ch.id AS child_id,
         ch.full_name AS child_name,
         ch.date_of_birth AS date_of_birth,
         ch.gender AS gender,
         e.title AS event_title,
         e.event_date AS event_date,
         v.venue_name AS venue_name,
         g.game_name AS game_name,
         bg.game_id AS game_id
       FROM bookings b
       JOIN parents p ON b.parent_id = p.id
       JOIN booking_games bg ON bg.booking_id = b.id
       JOIN baby_games g ON bg.game_id = g.id
       LEFT JOIN children ch ON bg.child_id = ch.id
       JOIN events e ON b.event_id = e.id
       LEFT JOIN venues v ON e.venue_id = v.id
       WHERE b.event_id = ? AND b.status = 'Confirmed'
       ORDER BY ch.full_name ASC`,
      [eventId]
    );
    return rows;
  }
};

module.exports = CertificateModel;
