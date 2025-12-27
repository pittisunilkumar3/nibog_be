const express = require('express');
const router = express.Router();
const { getEmailSettings, updateEmailSettings, sendEmail } = require('../controller/emailSettingsController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// Get email settings (public)
router.get('/', getEmailSettings);

// Update email settings (protected)
router.put('/', authenticateEmployee, updateEmailSettings);

// Send email using SMTP settings (protected)
router.post('/send', authenticateEmployee, sendEmail);

module.exports = router;
