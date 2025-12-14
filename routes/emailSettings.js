const express = require('express');
const router = express.Router();
const { getEmailSettings, updateEmailSettings } = require('../controller/emailSettingsController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// Get email settings (public)
router.get('/', getEmailSettings);

// Update email settings (protected)
router.put('/', authenticateEmployee, updateEmailSettings);

module.exports = router;
