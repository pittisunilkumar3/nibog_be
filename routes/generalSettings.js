const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controller/generalSettingsController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// Get general settings (public)
router.get('/', getSettings);

// Update general settings (protected)
router.put('/', authenticateEmployee, updateSettings);

module.exports = router;