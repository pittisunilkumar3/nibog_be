// routes/refundPolicy.js
const express = require('express');
const router = express.Router();
const refundPolicyController = require('../controller/refundPolicyController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// GET refund policy (public)
router.get('/', refundPolicyController.getRefundPolicy);

// PUT refund policy (protected)
router.put('/', authenticateEmployee, refundPolicyController.updateRefundPolicy);

module.exports = router;
