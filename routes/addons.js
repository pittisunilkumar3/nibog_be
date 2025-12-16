const express = require('express');
const router = express.Router();
const { listAddons, getAddonById, createAddon, updateAddon, deleteAddon } = require('../controller/addonsController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// List all addons (public)
router.get('/', listAddons);

// Get a single addon by id (public)
router.get('/:id', getAddonById);

// Create a new addon (protected)
router.post('/', authenticateEmployee, createAddon);

// Update an addon (protected)
router.put('/:id', authenticateEmployee, updateAddon);

// Delete an addon (protected)
router.delete('/:id', authenticateEmployee, deleteAddon);

module.exports = router;
