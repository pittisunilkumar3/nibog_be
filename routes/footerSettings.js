const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, getSettingsWithSocialLinks } = require('../controller/footerSettingsController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// Get footer settings (public)
router.get('/', getSettings);

// Get footer settings with social links (public)
router.get('/with-social', getSettingsWithSocialLinks);

// Update footer settings (protected)
router.put('/', authenticateEmployee, updateSettings);

// Create/upsert footer settings (protected) - used by superadmin footer-settings page
router.post('/', authenticateEmployee, updateSettings);

module.exports = router;
