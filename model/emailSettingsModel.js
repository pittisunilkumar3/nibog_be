
const { promisePool } = require('../config/config');

const EmailSettingsModel = {
  // Get the single email settings row
  async getSettings() {
    const [rows] = await promisePool.query('SELECT * FROM email_settings LIMIT 1');
    return rows[0] || null;
  },

  // Update the single email settings row (by id)
  async updateSettings(id, data) {
    const { smtp_host, smtp_port, smtp_username, smtp_password, sender_name, sender_email } = data;
    await promisePool.query(
      `UPDATE email_settings SET smtp_host = ?, smtp_port = ?, smtp_username = ?, smtp_password = ?, sender_name = ?, sender_email = ? WHERE id = ?`,
      [smtp_host, smtp_port, smtp_username, smtp_password, sender_name, sender_email, id]
    );
    return this.getSettings();
  },

  // Insert a new email settings row
  async insertSettings(data) {
    const { smtp_host, smtp_port, smtp_username, smtp_password, sender_name, sender_email } = data;
    await promisePool.query(
      `INSERT INTO email_settings (smtp_host, smtp_port, smtp_username, smtp_password, sender_name, sender_email) VALUES (?, ?, ?, ?, ?, ?)`,
      [smtp_host, smtp_port, smtp_username, smtp_password, sender_name, sender_email]
    );
    return this.getSettings();
  }
};

module.exports = EmailSettingsModel;
