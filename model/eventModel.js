
const { promisePool } = require('../config/config');

const EventModel = {
  async create(eventData) {
    const {
      title, description, city_id, venue_id, event_date, status = 'Draft', is_active = 1, image_url = null, priority = 1
    } = eventData;
    const [result] = await promisePool.query(
      'INSERT INTO events (title, description, city_id, venue_id, event_date, status, is_active, image_url, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, city_id, venue_id, event_date, status, is_active, image_url, priority]
    );
    return result.insertId;
  },

  async update(eventId, eventData) {
    const {
      title, description, city_id, venue_id, event_date, status = 'Draft', is_active = 1, image_url = null, priority = 1
    } = eventData;
    await promisePool.query(
      'UPDATE events SET title=?, description=?, city_id=?, venue_id=?, event_date=?, status=?, is_active=?, image_url=?, priority=? WHERE id=?',
      [title, description, city_id, venue_id, event_date, status, is_active, image_url, priority, eventId]
    );
  },

  async addEventGamesWithSlots(eventId, slots = []) {
    for (const slot of slots) {
      await promisePool.query(
        'INSERT INTO event_games_with_slots (event_id, game_id, custom_title, custom_description, custom_price, start_time, end_time, slot_price, max_participants, note, is_active, min_age, max_age) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          eventId,
          slot.game_id,
          slot.custom_title,
          slot.custom_description,
          slot.custom_price,
          slot.start_time,
          slot.end_time,
          slot.slot_price,
          slot.max_participants,
          slot.note,
          slot.is_active ?? 1,
          slot.min_age,
          slot.max_age
        ]
      );
    }
  }

  ,async updateEventGamesWithSlots(eventId, slots = [], slotsToDelete = []) {
    // Delete slots
    if (Array.isArray(slotsToDelete) && slotsToDelete.length > 0) {
      await promisePool.query(
        `DELETE FROM event_games_with_slots WHERE event_id = ? AND id IN (${slotsToDelete.map(() => '?').join(',')})`,
        [eventId, ...slotsToDelete]
      );
    }
    // Upsert slots
    for (const slot of slots) {
      if (slot.id) {
        // Update existing slot
        await promisePool.query(
          `UPDATE event_games_with_slots SET 
            game_id=?, custom_title=?, custom_description=?, custom_price=?, start_time=?, end_time=?, slot_price=?, max_participants=?, note=?, is_active=?, min_age=?, max_age=?
            WHERE id=? AND event_id=?`,
          [
            slot.game_id,
            slot.custom_title,
            slot.custom_description,
            slot.custom_price,
            slot.start_time,
            slot.end_time,
            slot.slot_price,
            slot.max_participants,
            slot.note,
            slot.is_active ?? 1,
            slot.min_age,
            slot.max_age,
            slot.id,
            eventId
          ]
        );
      } else {
        // Insert new slot
        await promisePool.query(
          'INSERT INTO event_games_with_slots (event_id, game_id, custom_title, custom_description, custom_price, start_time, end_time, slot_price, max_participants, note, is_active, min_age, max_age) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            eventId,
            slot.game_id,
            slot.custom_title,
            slot.custom_description,
            slot.custom_price,
            slot.start_time,
            slot.end_time,
            slot.slot_price,
            slot.max_participants,
            slot.note,
            slot.is_active ?? 1,
            slot.min_age,
            slot.max_age
          ]
        );
      }
    }
  }


  ,async getEventWithDetails(eventId) {
    // Get event with venue and city names
    const [eventRows] = await promisePool.query(
      `SELECT e.*, v.name AS venue_name, c.name AS city_name
       FROM events e
       JOIN venues v ON e.venue_id = v.id
       JOIN cities c ON e.city_id = c.id
       WHERE e.id = ?`,
      [eventId]
    );
    if (!eventRows.length) return null;
    const event = eventRows[0];

    // Get event_games_with_slots with game info
    const [slots] = await promisePool.query(
      `SELECT s.*, g.title AS game_title, g.description AS game_description
       FROM event_games_with_slots s
       JOIN baby_games g ON s.game_id = g.id
       WHERE s.event_id = ?`,
      [eventId]
    );
    event.event_games_with_slots = slots;
    return event;
  }

  
};

module.exports = EventModel;


// Check if any event_games_with_slots remain for an event
EventModel.eventGamesWithSlotsExist = async function(eventId) {
  const [rows] = await promisePool.query('SELECT id FROM event_games_with_slots WHERE event_id = ? LIMIT 1', [eventId]);
  return rows.length > 0;
};


// Delete event and its slots (explicitly delete slots first, then event)
EventModel.delete = async function(eventId) {
  // Check if event exists
  const [rows] = await promisePool.query('SELECT id FROM events WHERE id = ?', [eventId]);
  if (!rows.length) return false;
  // Explicitly delete slots for this event
  await promisePool.query('DELETE FROM event_games_with_slots WHERE event_id = ?', [eventId]);
  // Delete event
  await promisePool.query('DELETE FROM events WHERE id = ?', [eventId]);
  return true;
};


// List all events with their slots, venue, city, and game info
EventModel.listEventsWithDetails = async function () {
  // Get all events with venue and city names
  const [events] = await promisePool.query(
    `SELECT e.*, v.name AS venue_name, c.name AS city_name
     FROM events e
     JOIN venues v ON e.venue_id = v.id
     JOIN cities c ON e.city_id = c.id
     ORDER BY e.event_date DESC, e.id DESC`
  );
  if (!events.length) return [];

  // Get all slots for all events with game info
  const eventIds = events.map(ev => ev.id);
  let slots = [];
  if (eventIds.length) {
    const [slotRows] = await promisePool.query(
      `SELECT s.*, g.title AS game_title, g.description AS game_description
       FROM event_games_with_slots s
       JOIN baby_games g ON s.game_id = g.id
       WHERE s.event_id IN (${eventIds.map(() => '?').join(',')})`,
      eventIds
    );
    slots = slotRows;
  }
  // Map slots to events
  const slotMap = {};
  slots.forEach(slot => {
    if (!slotMap[slot.event_id]) slotMap[slot.event_id] = [];
    slotMap[slot.event_id].push(slot);
  });
  events.forEach(ev => {
    ev.event_games_with_slots = slotMap[ev.id] || [];
  });
  return events;
};
