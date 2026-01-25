
const mysql = require('mysql2');
const dbConfig = require('./env');

// Create a connection pool to MySQL database (XAMPP)
const pool = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Prevent automatic date conversion to avoid timezone issues
  // Dates will be returned as strings in 'YYYY-MM-DD' format
  dateStrings: true,
  timezone: '+05:30' // Use Indian Standard Time (IST)
});

// Test the database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    return;
  }
  console.log('✅ Database connection successful!');
  console.log(`📊 Connected to MySQL database: ${dbConfig.database}`);
  connection.release();
});

// Export the pool for use in API routes
const promisePool = pool.promise();

module.exports = { pool, promisePool };
