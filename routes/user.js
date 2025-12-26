
const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const { authenticateUser } = require('../controller/authMiddleware');

// Register
router.post('/register', userController.register);
// Login
router.post('/login', userController.login);
// Google Sign-In
router.post('/google-signin', userController.googleSignIn);
// Get profile (protected)
router.get('/profile', authenticateUser, userController.getProfile);
// List all users with city/state
router.get('/list', userController.listAll);

// Get single user by id with city/state
router.get('/:id', userController.getSingle);
const { authenticateUserOrSuperadmin } = require('../controller/authMiddleware');
// Edit user by id (update)
router.put('/:id', authenticateUserOrSuperadmin, userController.editUser);

module.exports = router;
