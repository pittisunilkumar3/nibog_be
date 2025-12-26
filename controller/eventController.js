const EventModel = require('../model/eventModel');

/**
 * Create a new event with event games with slots
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * Payload example:
 * {
 *   "title": "Event Title",
 *   "description": "Event description",
 *   "city_id": 1,
 *   "venue_id": 2,
 *   "event_date": "2025-12-31",
 *   "status": "Draft",
 *   "is_active": 1,
 *   "image_url": "http://...",
 *   "priority": 1,
 *   "event_games_with_slots": [
 *     {
 *       "game_id": 1,
 *       "custom_title": "Game Title",
 *       "custom_description": "Description",
 *       "custom_price": 100.00,
 *       "start_time": "10:00:00",
 *       "end_time": "11:00:00",
 *       "slot_price": 50.00,
 *       "max_participants": 10,
 *       "note": "Note",
 *       "is_active": 1,
 *       "min_age": 5,
 *       "max_age": 12
 *     }
 *   ]
 * }
 */
exports.createEvent = async (req, res) => {
  const {
    title,
    description,
    city_id,
    venue_id,
    event_date,
    status = 'Draft',
    is_active = 1,
    image_url = null,
    priority = 1,
    event_games_with_slots = []
  } = req.body;

  try {
    // Insert event
    const eventId = await EventModel.create({
      title,
      description,
      city_id,
      venue_id,
      event_date,
      status,
      is_active,
      image_url,
      priority
    });

    // Insert event_games_with_slots
    await EventModel.addEventGamesWithSlots(eventId, event_games_with_slots);

    res.status(201).json({ message: 'Event created successfully', event_id: eventId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/**
 * Delete an event and its slots (protected)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * DELETE /api/events/:id/delete
 */
exports.deleteEvent = async (req, res) => {
  const eventId = req.params.id;
  try {
    const deleted = await EventModel.delete(eventId);
    if (!deleted) {
      return res.status(404).json({ error: 'Event not found' });
    }
    // Check if any slots remain for this event
    const slotsRemain = await EventModel.eventGamesWithSlotsExist(eventId);
    res.json({
      message: 'Event deleted successfully',
      event_id: eventId,
      event_games_with_slots_deleted: !slotsRemain
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get completed events with comprehensive statistics
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * GET /api/events/completed
 */
exports.getCompletedEventsWithStats = async (req, res) => {
  try {
    const events = await EventModel.getCompletedEventsWithStats();
    res.json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


/**
 * List all events with their slots, venue, city, and game info (public)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * GET /api/events/list
 */
exports.listEventsWithDetails = async (req, res) => {
  try {
    const events = await EventModel.listEventsWithDetails();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Edit an event and its event games with slots
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * PUT /api/events/:id/edit
 *
 * Payload: Same as create, but updates existing event and slots. Slots array should include id for existing slots, omit id for new slots. To delete, send ids in event_games_with_slots_to_delete array.
 */
exports.editEvent = async (req, res) => {
  const eventId = req.params.id;
  const {
    title,
    description,
    city_id,
    venue_id,
    event_date,
    status = 'Draft',
    is_active = 1,
    image_url = null,
    priority = 1,
    event_games_with_slots = [],
    event_games_with_slots_to_delete = []
  } = req.body;

  try {
    // Update event
    await EventModel.update(eventId, {
      title,
      description,
      city_id,
      venue_id,
      event_date,
      status,
      is_active,
      image_url,
      priority
    });

    // Update/add/delete event_games_with_slots
    await EventModel.updateEventGamesWithSlots(eventId, event_games_with_slots, event_games_with_slots_to_delete);

    res.status(200).json({ message: 'Event updated successfully', event_id: eventId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/**
 * Get event with games, venue name, city name, and event_games_with_slots (public)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 *
 * GET /api/events/:id/details
 */
exports.getEventWithDetails = async (req, res) => {
  const eventId = req.params.id;
  try {
    const event = await EventModel.getEventWithDetails(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
