const { promisePool } = require('../config/config');

const CityModel = {
  async list() {
    const [rows] = await promisePool.query('SELECT * FROM cities ORDER BY city_name ASC');
    return rows;
  },

  // List cities with their venues and total venues count
  async listWithVenues() {
    // Get all cities
    const [cities] = await promisePool.query('SELECT * FROM cities ORDER BY city_name ASC');
    // Get all venues
    const [venues] = await promisePool.query('SELECT * FROM venues');
    // Map venues to cities
    const cityMap = {};
    cities.forEach(city => {
      city.venues = [];
      city.total_venues = 0;
      cityMap[city.id] = city;
    });
    venues.forEach(venue => {
      if (cityMap[venue.city_id]) {
        cityMap[venue.city_id].venues.push(venue);
        cityMap[venue.city_id].total_venues++;
      }
    });
    return Object.values(cityMap);
  },
  async get(id) {
    const [cityRows] = await promisePool.query('SELECT * FROM cities WHERE id = ?', [id]);
    const city = cityRows[0];
    if (!city) return null;
    const [venues] = await promisePool.query('SELECT * FROM venues WHERE city_id = ?', [id]);
    city.venues = venues;
    city.total_venues = venues.length;
    return city;
  },
  async create(data) {
    const sql = 'INSERT INTO cities (city_name, state, is_active) VALUES (?, ?, ?)';
    const [result] = await promisePool.execute(sql, [data.city_name, data.state, data.is_active ?? 1]);
    return result;
  },
  async update(id, data) {
    const fields = [];
    const values = [];
    for (const key in data) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
    values.push(id);
    const sql = `UPDATE cities SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await promisePool.execute(sql, values);
    return result;
  },
  async delete(id) {
    const sql = 'DELETE FROM cities WHERE id = ?';
    const [result] = await promisePool.execute(sql, [id]);
    return result;
  }
  ,

    // Get all events for a given city
    async getEventsByCity(cityId) {
      const sql = `
        SELECT e.*, v.venue_name, c.city_name
        FROM events e
        LEFT JOIN venues v ON e.venue_id = v.id
        LEFT JOIN cities c ON e.city_id = c.id
        WHERE e.city_id = ?
        ORDER BY e.event_date DESC, e.id DESC
      `;
      const [rows] = await promisePool.query(sql, [cityId]);
      return rows;
    },

    // Get all cities with their events, games, slots and venue info (for booking)
    async listCitiesWithEventsAndGames() {
      // Get all cities
      const [cities] = await promisePool.query(
        'SELECT * FROM cities WHERE is_active = 1 ORDER BY city_name ASC'
      );

      // Get all events with venue info
      const [events] = await promisePool.query(`
        SELECT 
          e.*,
          v.venue_name,
          v.address as venue_address,
          v.capacity as venue_capacity
        FROM events e
        LEFT JOIN venues v ON e.venue_id = v.id
        WHERE e.is_active = 1
        ORDER BY e.event_date ASC, e.priority ASC
      `);

      // Get all event games with slots
      const [eventGames] = await promisePool.query(`
        SELECT 
          eg.id as slot_id,
          eg.event_id,
          eg.game_id,
          eg.custom_title,
          eg.custom_description,
          eg.custom_price,
          eg.start_time,
          eg.end_time,
          eg.slot_price,
          eg.max_participants,
          eg.min_age,
          eg.max_age,
          eg.note,
          eg.is_active,
          bg.game_name,
          bg.image_url as game_image,
          bg.description as game_description,
          bg.duration_minutes,
          bg.categories
        FROM event_games_with_slots eg
        LEFT JOIN baby_games bg ON eg.game_id = bg.id
        WHERE eg.is_active = 1
        ORDER BY eg.start_time ASC
      `);

      // Get booking counts per slot
      const [bookingCounts] = await promisePool.query(`
        SELECT 
          slot_id,
          COUNT(*) as booked_count
        FROM booking_games
        GROUP BY slot_id
      `);

      // Create lookup maps
      const bookingCountMap = {};
      bookingCounts.forEach(bc => {
        bookingCountMap[bc.slot_id] = bc.booked_count;
      });

      // Map event games to events
      const eventMap = {};
      events.forEach(event => {
        event.games_with_slots = [];
        eventMap[event.id] = event;
      });

      eventGames.forEach(eg => {
        if (eventMap[eg.event_id]) {
          const bookedCount = bookingCountMap[eg.slot_id] || 0;
          const availableSlots = eg.max_participants - bookedCount;
          
          eventMap[eg.event_id].games_with_slots.push({
            slot_id: eg.slot_id,
            game_id: eg.game_id,
            game_name: eg.game_name,
            game_image: eg.game_image,
            game_description: eg.game_description,
            custom_title: eg.custom_title,
            custom_description: eg.custom_description,
            duration_minutes: eg.duration_minutes,
            categories: eg.categories,
            start_time: eg.start_time,
            end_time: eg.end_time,
            price: eg.slot_price || eg.custom_price,
            max_participants: eg.max_participants,
            booked_count: bookedCount,
            available_slots: availableSlots,
            is_available: availableSlots > 0,
            min_age: eg.min_age,
            max_age: eg.max_age,
            note: eg.note,
            is_active: eg.is_active
          });
        }
      });

      // Map events to cities
      const cityMap = {};
      cities.forEach(city => {
        city.events = [];
        city.total_events = 0;
        cityMap[city.id] = city;
      });

      events.forEach(event => {
        if (cityMap[event.city_id]) {
          cityMap[event.city_id].events.push(event);
          cityMap[event.city_id].total_events++;
        }
      });

      return Object.values(cityMap);
    }
};

module.exports = CityModel;
