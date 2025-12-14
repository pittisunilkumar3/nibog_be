// seed/seedCity.js
const { promisePool } = require('../config/config');

async function seedCity() {
  const [rows] = await promisePool.query('SELECT * FROM cities LIMIT 1');
  if (rows.length === 0) {
    await promisePool.query('INSERT INTO cities (city_name, state) VALUES (?, ?)', ['Test City', 'Test State']);
    console.log('Inserted Test City into cities table.');
  } else {
    console.log('City already exists, skipping seed.');
  }
  process.exit(0);
}

seedCity();
