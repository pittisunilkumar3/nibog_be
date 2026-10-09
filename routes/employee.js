const express = require('express');
const router = express.Router();
const { register, login, getProfile, listEmployees, validateSuperadmin } = require('../controller/employeeController');
const { authenticateEmployee, isSuperAdmin } = require('../controller/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Server-side superadmin session validation (called by frontend middleware)
router.get('/validate-superadmin', validateSuperadmin);


// Protected routes
router.get('/profile', authenticateEmployee, getProfile);

// List employees (superadmin only)
router.get('/list', authenticateEmployee, isSuperAdmin, listEmployees);

module.exports = router;
