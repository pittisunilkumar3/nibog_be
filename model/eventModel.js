
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
      `SELECT e.*, v.venue_name AS venue_name, c.city_name AS city_name
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
      `SELECT s.*, g.game_name AS game_title, g.description AS game_description
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
    `SELECT e.*, v.venue_name AS venue_name, c.city_name AS city_name
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
      `SELECT s.*, g.game_name AS game_title, g.description AS game_description
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

/**
 * Get completed events with comprehensive statistics
 * Returns events where event_date < current date with booking statistics
 */
EventModel.getCompletedEventsWithStats = async function() {
  try {
    // Get all completed events (event_date < current date)
    const [eventRows] = await promisePool.query(`
      SELECT 
        e.id as event_id,
        e.title as event_name,
        e.event_date,
        e.description as event_description,
        e.image_url as event_image_url,
        e.status as event_status,
        v.id as venue_id,
        v.venue_name,
        v.address as venue_address,
        v.contact_number as venue_contact,
        c.id as city_id,
        c.city_name,
        c.state,
        COUNT(DISTINCT b.id) as total_bookings,
        COUNT(DISTINCT b.parent_id) as total_parents,
        COUNT(DISTINCT ch.id) as total_children,
        COUNT(DISTINCT bg.id) as total_game_bookings,
        SUM(b.total_amount) as total_revenue,
        SUM(CASE WHEN p.payment_status = 'Paid' THEN p.amount ELSE 0 END) as paid_revenue,
        SUM(CASE WHEN p.payment_status = 'Pending' THEN p.amount ELSE 0 END) as pending_revenue,
        COUNT(DISTINCT CASE WHEN b.status = 'Confirmed' THEN b.id END) as confirmed_bookings,
        COUNT(DISTINCT CASE WHEN b.status = 'Pending' THEN b.id END) as pending_bookings,
        COUNT(DISTINCT CASE WHEN b.status = 'Cancelled' THEN b.id END) as cancelled_bookings
      FROM events e
      LEFT JOIN venues v ON e.venue_id = v.id
      LEFT JOIN cities c ON e.city_id = c.id
      LEFT JOIN bookings b ON e.id = b.event_id
      LEFT JOIN children ch ON b.parent_id = ch.parent_id
      LEFT JOIN booking_games bg ON b.id = bg.booking_id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE e.event_date < CURDATE()
      GROUP BY e.id, e.title, e.event_date, e.description, e.image_url, e.status,
               v.id, v.venue_name, v.address, v.contact_number,
               c.id, c.city_name, c.state
      ORDER BY e.event_date DESC
    `);

    const events = [];
    for (const event of eventRows) {
      // Get payment method breakdown
      const [paymentMethods] = await promisePool.query(`
        SELECT 
          p.payment_method,
          COUNT(*) as count,
          SUM(p.amount) as total_amount
        FROM payments p
        INNER JOIN bookings b ON p.booking_id = b.id
        WHERE b.event_id = ? AND p.payment_method IS NOT NULL
        GROUP BY p.payment_method
      `, [event.event_id]);

      // Get top games for this event
      const [topGames] = await promisePool.query(`
        SELECT 
          g.id as game_id,
          g.game_name,
          COUNT(bg.id) as booking_count,
          SUM(bg.game_price) as total_revenue
        FROM booking_games bg
        INNER JOIN bookings b ON bg.booking_id = b.id
        INNER JOIN baby_games g ON bg.game_id = g.id
        WHERE b.event_id = ?
        GROUP BY g.id, g.game_name
        ORDER BY booking_count DESC
        LIMIT 5
      `, [event.event_id]);

      // Get age distribution of children
      const [ageDistribution] = await promisePool.query(`
        SELECT 
          CASE 
            WHEN TIMESTAMPDIFF(YEAR, ch.date_of_birth, ?) < 3 THEN '0-2 years'
            WHEN TIMESTAMPDIFF(YEAR, ch.date_of_birth, ?) < 6 THEN '3-5 years'
            WHEN TIMESTAMPDIFF(YEAR, ch.date_of_birth, ?) < 9 THEN '6-8 years'
            WHEN TIMESTAMPDIFF(YEAR, ch.date_of_birth, ?) < 13 THEN '9-12 years'
            ELSE '13+ years'
          END as age_group,
          COUNT(*) as count
        FROM children ch
        INNER JOIN parents p ON ch.parent_id = p.id
        INNER JOIN bookings b ON p.id = b.parent_id
        WHERE b.event_id = ?
        GROUP BY age_group
        ORDER BY age_group
      `, [event.event_date, event.event_date, event.event_date, event.event_date, event.event_id]);

      events.push({
        event_id: event.event_id,
        event_name: event.event_name,
        event_date: event.event_date,
        description: event.event_description,
        image_url: event.event_image_url,
        status: event.event_status,
        venue: {
          id: event.venue_id,
          name: event.venue_name,
          address: event.venue_address,
          contact: event.venue_contact
        },
        city: {
          id: event.city_id,
          name: event.city_name,
          state: event.state
        },
        statistics: {
          total_bookings: event.total_bookings || 0,
          total_parents: event.total_parents || 0,
          total_children: event.total_children || 0,
          total_game_bookings: event.total_game_bookings || 0,
          bookings_by_status: {
            confirmed: event.confirmed_bookings || 0,
            pending: event.pending_bookings || 0,
            cancelled: event.cancelled_bookings || 0
          },
          revenue: {
            total: parseFloat(event.total_revenue) || 0,
            paid: parseFloat(event.paid_revenue) || 0,
            pending: parseFloat(event.pending_revenue) || 0
          },
          payment_methods: paymentMethods.map(pm => ({
            method: pm.payment_method,
            count: pm.count,
            amount: parseFloat(pm.total_amount)
          })),
          top_games: topGames.map(g => ({
            game_id: g.game_id,
            game_name: g.game_name,
            bookings: g.booking_count,
            revenue: parseFloat(g.total_revenue)
          })),
          age_distribution: ageDistribution.map(ad => ({
            age_group: ad.age_group,
            count: ad.count
          }))
        }
      });
    }

    return events;
  } catch (err) {
    throw err;
  }
};
