const express = require('express');
const router = express.Router();
const { listCities, getCity, createCity, updateCity, deleteCity, listCitiesWithVenues } = require('../controller/cityController');
const { authenticateEmployee } = require('../controller/authMiddleware');

// List all cities (public)
router.get('/', listCities);

// List all cities with their venues and total venues (public)
router.get('/with-venues/list', listCitiesWithVenues);

// List all cities with events, games and slots for booking (public)
router.get('/booking-info/list', require('../controller/cityController').listCitiesWithEventsAndGames);

// Get a single city by id (public)
router.get('/:id', getCity);

// Get all events for a city (public)
router.get('/:id/events', require('../controller/cityController').getEventsByCity);

// Create a new city (protected)
router.post('/', authenticateEmployee, createCity);

// Update a city (protected)
router.put('/:id', authenticateEmployee, updateCity);

// Delete a city (protected)
router.delete('/:id', authenticateEmployee, deleteCity);

module.exports = router;
