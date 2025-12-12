// Import database connection
const { promisePool } = require('../../config/config');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Simple Hello World response
      res.status(200).json({
        message: 'Hello World!',
        success: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        message: 'Error processing request',
        error: error.message
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
