const express = require('express');
const router = express.Router();
const eventController = require('../controller/eventController');

const { authenticateEmployee } = require('../controller/authMiddleware');


// POST /api/events/create - Create event with slots (protected)
router.post('/create', authenticateEmployee, eventController.createEvent);

// PUT /api/events/:id/edit - Edit event and slots (protected)
router.put('/:id/edit', authenticateEmployee, eventController.editEvent);

// GET /api/events/:id/details - Get event with games, venue, city, and slots (public)
router.get('/:id/details', eventController.getEventWithDetails);

// GET /api/events/list - List all events with slots, venue, city, and game info (public)
router.get('/list', eventController.listEventsWithDetails);

// DELETE /api/events/:id/delete - Delete event and its slots (protected)
router.delete('/:id/delete', authenticateEmployee, eventController.deleteEvent);

module.exports = router;
