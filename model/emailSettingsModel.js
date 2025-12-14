
const pool = require('../config/config');

const EmailSettingsModel = {
  // Get the single email settings row
  async getSettings() {
    const [rows] = await pool.query('SELECT * FROM email_settings LIMIT 1');
    return rows[0] || null;
  },

  // Update the single email settings row (by id, only if exists)
  async updateSettings(data) {
    const { smtp_host, smtp_port, smtp_username, smtp_password, sender_name, sender_email } = data;
    const settings = await this.getSettings();
    if (!settings) {
      // No row to update
      throw new Error('No email settings row exists to update.');
    }
    await pool.query(
      `UPDATE email_settings SET smtp_host = ?, smtp_port = ?, smtp_username = ?, smtp_password = ?, sender_name = ?, sender_email = ? WHERE id = ?`,
      [smtp_host, smtp_port, smtp_username, smtp_password, sender_name, sender_email, settings.id]
    );
    return this.getSettings();
  }
};

module.exports = EmailSettingsModel;
