const { promisePool } = require('../config/config');

const FooterSettingsModel = {
  /**
   * Get footer settings joined with social media settings in a single row
   * Returns: { ...footer_settings fields..., facebook_url, instagram_url, linkedin_url, youtube_url }
   */
  async getWithSocialLinks() {
    const [rows] = await promisePool.query(`
      SELECT f.*, s.facebook_url, s.instagram_url, s.linkedin_url, s.youtube_url
      FROM footer_settings f
      LEFT JOIN social_media_settings s ON s.id = 1
      WHERE f.id = 1
      LIMIT 1
    `);
    return rows[0];
  },
  async get() {
    const [rows] = await promisePool.query('SELECT * FROM footer_settings LIMIT 1');
    return rows[0];
  },
  async update(data) {
    // Only update the first row (id=1)
    const fields = [];
    const values = [];
    for (const key in data) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
    values.push(1); // id=1
    const sql = `UPDATE footer_settings SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await promisePool.execute(sql, values);
    return result;
  }
};

module.exports = FooterSettingsModel;
