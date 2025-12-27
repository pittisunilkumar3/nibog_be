
const EmailSettingsModel = require('../model/emailSettingsModel');

// Send email using SMTP settings from database
exports.sendEmail = async (req, res) => {
  try {
    const { to, subject, text, html, cc, bcc, attachments } = req.body;

    // Validate required fields
    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: to (email address), subject. Either text or html content is required.'
      });
    }

    if (!text && !html) {
      return res.status(400).json({
        success: false,
        message: 'Either text or html content is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const toEmails = Array.isArray(to) ? to : [to];
    
    for (const email of toEmails) {
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: `Invalid email address: ${email}`
        });
      }
    }

    // Send email
    const result = await EmailSettingsModel.sendEmail({
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text,
      html,
      cc,
      bcc,
      attachments
    });

    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
};

// Get email settings (always returns the single row)
exports.getEmailSettings = async (req, res) => {
  try {
    const settings = await EmailSettingsModel.getSettings();
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Email settings not found. Please configure email settings first.'
      });
    }
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching email settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email settings',
      error: error.message
    });
  }
};

// Update email settings (updates the single row)
exports.updateEmailSettings = async (req, res) => {
  try {
    const { smtp_host, smtp_port, smtp_username, smtp_password, sender_name, sender_email } = req.body;

    // Validate required fields
    if (!smtp_host || !smtp_port || !smtp_username || !smtp_password || !sender_name || !sender_email) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: smtp_host, smtp_port, smtp_username, smtp_password, sender_name, sender_email'
      });
    }

    // Validate smtp_port
    if (smtp_port < 1 || smtp_port > 65535) {
      return res.status(400).json({
        success: false,
        message: 'smtp_port must be between 1 and 65535'
      });
    }

    // Check if email settings exist
    const existing = await EmailSettingsModel.getSettings();
    let updatedSettings;
    if (!existing) {
      // Insert new row if none exists
      updatedSettings = await EmailSettingsModel.insertSettings({ smtp_host, smtp_port, smtp_username, smtp_password, sender_name, sender_email });
    } else {
      // Update existing row
      updatedSettings = await EmailSettingsModel.updateSettings(existing.id, { smtp_host, smtp_port, smtp_username, smtp_password, sender_name, sender_email });
    }

    res.status(200).json({
      success: true,
      message: 'Email settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating email settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update email settings',
      error: error.message
    });
  }
};
