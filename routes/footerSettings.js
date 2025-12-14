const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controller/footerSettingsController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// Get footer settings (public)
router.get('/', getSettings);

// Update footer settings (protected)
router.put('/', authenticateEmployee, updateSettings);

module.exports = router;
