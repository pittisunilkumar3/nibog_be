const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3004';

async function testEmailAPI() {
  console.log('\n=== Testing Email Sending API ===\n');

  try {
    // Step 1: Login as employee to get token
    console.log('Step 1: Logging in as employee...');
    const loginResponse = await axios.post(`${BASE_URL}/api/employee/login`, {
      email: 'admin@nibog.com', // Replace with your employee email
      password: 'admin123' // Replace with your employee password
    });

    const token = loginResponse.data.token;
    console.log('✓ Login successful');
    console.log(`  Token: ${token.substring(0, 20)}...`);

    // Step 2: Check email settings
    console.log('\nStep 2: Checking email settings...');
    const settingsResponse = await axios.get(`${BASE_URL}/api/email-settings`);
    
    if (!settingsResponse.data.success) {
      console.log('✗ Email settings not configured');
      console.log('  Please configure SMTP settings first using PUT /api/email-settings');
      return;
    }

    const settings = settingsResponse.data.data;
    console.log('✓ Email settings found');
    console.log(`  SMTP Host: ${settings.smtp_host}`);
    console.log(`  SMTP Port: ${settings.smtp_port}`);
    console.log(`  Sender: ${settings.sender_name} <${settings.sender_email}>`);

    // Step 3: Send a test email
    console.log('\nStep 3: Sending test email...');
    
    const emailData = {
      to: 'test@example.com', // Replace with your test email
      subject: 'Test Email from Nibog Backend',
      html: `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
              .content { background-color: #f9f9f9; padding: 20px; }
              .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
              .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Nibog!</h1>
              </div>
              <div class="content">
                <h2>Test Email</h2>
                <p>This is a test email sent from the Nibog Backend API.</p>
                <p>If you're receiving this, it means your SMTP configuration is working correctly!</p>
                <p>
                  <a href="http://localhost:3004" class="button">Visit Website</a>
                </p>
                <p><strong>Features tested:</strong></p>
                <ul>
                  <li>✓ SMTP Connection</li>
                  <li>✓ Email Authentication</li>
                  <li>✓ HTML Email Rendering</li>
                  <li>✓ Database SMTP Configuration</li>
                </ul>
              </div>
              <div class="footer">
                <p>Sent at: ${new Date().toLocaleString()}</p>
                <p>&copy; 2025 Nibog. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        Welcome to Nibog!
        
        Test Email
        
        This is a test email sent from the Nibog Backend API.
        If you're receiving this, it means your SMTP configuration is working correctly!
        
        Features tested:
        - SMTP Connection
        - Email Authentication
        - HTML Email Rendering
        - Database SMTP Configuration
        
        Sent at: ${new Date().toLocaleString()}
        © 2025 Nibog. All rights reserved.
      `
    };

    const sendResponse = await axios.post(
      `${BASE_URL}/api/email-settings/send`,
      emailData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✓ Email sent successfully!');
    console.log('  Response:');
    console.log(`    - Message ID: ${sendResponse.data.data.messageId}`);
    console.log(`    - Accepted: ${sendResponse.data.data.accepted.join(', ')}`);
    console.log(`    - Rejected: ${sendResponse.data.data.rejected.length === 0 ? 'None' : sendResponse.data.data.rejected.join(', ')}`);
    console.log(`    - SMTP Response: ${sendResponse.data.data.response}`);

    // Step 4: Test with invalid email
    console.log('\nStep 4: Testing validation with invalid email...');
    try {
      await axios.post(
        `${BASE_URL}/api/email-settings/send`,
        {
          to: 'invalid-email',
          subject: 'Test',
          text: 'Test'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✗ Should have returned validation error');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✓ Validation working correctly');
        console.log(`  Error: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }

    // Step 5: Test without required fields
    console.log('\nStep 5: Testing validation without required fields...');
    try {
      await axios.post(
        `${BASE_URL}/api/email-settings/send`,
        {
          to: 'test@example.com'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✗ Should have returned validation error');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✓ Validation working correctly');
        console.log(`  Error: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✓✓✓ ALL TESTS COMPLETED! ✓✓✓');
    console.log('='.repeat(50));
    console.log('\nEmail API is ready to use!');
    console.log('\nEndpoint: POST /api/email-settings/send');
    console.log('Authentication: Bearer token (employee)');

  } catch (error) {
    console.error('\n✗ TEST FAILED:');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Error:', error.response.data);
    } else {
      console.error('  Error:', error.message);
    }
    console.error('\nStack trace:', error.stack);
  }
}

// Run tests
testEmailAPI();
