// routes/privacyPolicy.js
const express = require('express');
const router = express.Router();
const privacyPolicyController = require('../controller/privacyPolicyController');


const { authenticateEmployee } = require('../controller/authMiddleware');

// GET privacy policy (public)
router.get('/', privacyPolicyController.getPrivacyPolicy);

// PUT privacy policy (protected)
router.put('/', authenticateEmployee, privacyPolicyController.updatePrivacyPolicy);

module.exports = router;
