const express = require('express');
const router = express.Router();
const eventController = require('../controller/eventController');

const { authenticateEmployee } = require('../controller/authMiddleware');

// GET /api/events/completed - Get completed events with statistics (public)
router.get('/completed', eventController.getCompletedEventsWithStats);

// GET /api/events/list - List all events with slots, venue, city, and game info (public)
router.get('/list', eventController.listEventsWithDetails);

// GET /api/events/:id/details - Get event with games, venue, city, and slots (public)
router.get('/:id/details', eventController.getEventWithDetails);

// POST /api/events/create - Create event with slots (protected)
router.post('/create', authenticateEmployee, eventController.createEvent);

// PUT /api/events/:id/edit - Edit event and slots (protected)
router.put('/:id/edit', authenticateEmployee, eventController.editEvent);

// DELETE /api/events/:id/delete - Delete event and its slots (protected)
router.delete('/:id/delete', authenticateEmployee, eventController.deleteEvent);

// POST /api/events/delete - Delete event (alternative endpoint for frontend compatibility)
router.post('/delete', authenticateEmployee, eventController.deleteEventPost);

module.exports = router;
