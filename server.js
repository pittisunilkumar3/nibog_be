const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

// Initialize and test database connection
require('./config/config');



const helloworldRoute = require('./routes/helloworld');
const employeeRoute = require('./routes/employee');
const privacyPolicyRoute = require('./routes/privacyPolicy');
const termsRoute = require('./routes/terms');
const refundPolicyRoute = require('./routes/refundPolicy');
const faqRoute = require('./routes/faq');

const app = express();

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use routes


app.use('/api/helloworld', helloworldRoute);
app.use('/api/employee', employeeRoute);
app.use('/api/privacy-policy', privacyPolicyRoute);
app.use('/api/terms', termsRoute);
app.use('/api/refund-policy', refundPolicyRoute);
app.use('/api/faq', faqRoute);

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
