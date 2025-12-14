const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controller/socialMediaSettingsController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// Get social media settings (public)
router.get('/', getSettings);

// Update social media settings (protected)
router.put('/', authenticateEmployee, updateSettings);

module.exports = router;
