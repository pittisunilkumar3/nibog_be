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
};

module.exports = CityModel;
