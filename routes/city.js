const express = require('express');
const router = express.Router();
const { listCities, getCity, createCity, updateCity, deleteCity, listCitiesWithVenues } = require('../controller/cityController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// List all cities (public)
router.get('/', listCities);

// List all cities with their venues and total venues (public)
router.get('/with-venues/list', listCitiesWithVenues);

// Get a single city by id (public)
router.get('/:id', getCity);

// Create a new city (protected)
router.post('/', authenticateEmployee, createCity);

// Update a city (protected)
router.put('/:id', authenticateEmployee, updateCity);

// Delete a city (protected)
router.delete('/:id', authenticateEmployee, deleteCity);

module.exports = router;
