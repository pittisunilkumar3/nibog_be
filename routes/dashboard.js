const express = require('express');
const router = express.Router();
const dashboardController = require('../controller/dashboardController');

// GET /api/dashboard/stats - Get complete dashboard statistics
router.get('/stats', dashboardController.getDashboardStats);

// GET /api/dashboard/summary - Get summary stats only (lightweight)
router.get('/summary', dashboardController.getSummaryStats);

module.exports = router;
