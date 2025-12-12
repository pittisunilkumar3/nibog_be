const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

// Initialize and test database connection
require('./config/config');

const helloworldRoute = require('./routes/helloworld');

const app = express();

// Use routes
app.use('/api/helloworld', helloworldRoute);

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
