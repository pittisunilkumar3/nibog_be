// routes/terms.js
const express = require('express');
const router = express.Router();
const termsController = require('../controller/termsController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// GET terms and conditions (protected)
router.get('/', authenticateEmployee, termsController.getTerms);

// PUT terms and conditions (protected)
router.put('/', authenticateEmployee, termsController.updateTerms);

module.exports = router;
