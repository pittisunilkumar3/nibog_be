const fs = require('fs');
const express = require('express');
const router = express.Router();
const c = require('../controller/attendanceController');
router.get('/report', c.report);
module.exports = router;
