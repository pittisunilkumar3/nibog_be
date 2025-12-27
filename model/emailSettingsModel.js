
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
  },

  // Send email using SMTP settings from database
  async sendEmail(emailData) {
    const nodemailer = require('nodemailer');
    
    // Get SMTP settings from database
    const settings = await this.getSettings();
    if (!settings) {
      throw new Error('Email settings not configured. Please configure SMTP settings first.');
    }

    // Create transporter with database settings
    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.smtp_port === 465, // true for 465, false for other ports
      auth: {
        user: settings.smtp_username,
        pass: settings.smtp_password
      }
    });

    // Email options
    const mailOptions = {
      from: `"${settings.sender_name}" <${settings.sender_email}>`,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html
    };

    // Add CC if provided
    if (emailData.cc) {
      mailOptions.cc = emailData.cc;
    }

    // Add BCC if provided
    if (emailData.bcc) {
      mailOptions.bcc = emailData.bcc;
    }

    // Add attachments if provided
    if (emailData.attachments) {
      mailOptions.attachments = emailData.attachments;
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    return {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response
    };
  }
};

module.exports = EmailSettingsModel;
