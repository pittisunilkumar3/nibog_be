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
const socialMediaSettingsRoute = require('./routes/socialMediaSettings');
const footerSettingsRoute = require('./routes/footerSettings');
const generalSettingsRoute = require('./routes/generalSettings');
const cityRoute = require('./routes/city');
const venueRoute = require('./routes/venue');

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

app.use('/api/social-media-settings', socialMediaSettingsRoute);
app.use('/api/footer-settings', footerSettingsRoute);


app.use('/api/general-settings', generalSettingsRoute);

app.use('/api/city', cityRoute);
app.use('/api/venue', venueRoute);

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
