const express = require('express');
const router = express.Router();
const { listVenues, getVenue, createVenue, updateVenue, deleteVenue } = require('../controller/venueController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// List all venues (public)
router.get('/', listVenues);

// Get a single venue by id (public)
router.get('/:id', getVenue);

// Create a new venue (protected)
router.post('/', authenticateEmployee, createVenue);

// Update a venue (protected)
router.put('/:id', authenticateEmployee, updateVenue);

// Delete a venue (protected)
router.delete('/:id', authenticateEmployee, deleteVenue);

module.exports = router;
