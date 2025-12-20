
const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const { authenticateUser } = require('../controller/authMiddleware');

// Register
router.post('/register', userController.register);
// Login
router.post('/login', userController.login);
// Get profile (protected)
router.get('/profile', authenticateUser, userController.getProfile);
// List all users with city/state
router.get('/list', userController.listAll);

// Get single user by id with city/state
router.get('/:id', userController.getSingle);

module.exports = router;
