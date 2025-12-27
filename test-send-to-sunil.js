const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3004';
const TEST_EMAIL = 'pittisunilkumar3@gmail.com';

async function testSendEmail() {
  console.log('\n=== Testing Email Send to pittisunilkumar3@gmail.com ===\n');

  try {
    // Step 1: Check email settings
    console.log('Step 1: Checking SMTP configuration...');
    const settingsResponse = await axios.get(`${BASE_URL}/api/email-settings`);
    
    if (!settingsResponse.data.success) {
      console.log('✗ Email settings not found');
      console.log('\nPlease configure SMTP settings first:');
      console.log('POST /api/email-settings with your SMTP credentials');
      return;
    }

    const settings = settingsResponse.data.data;
    console.log('✓ SMTP settings found');
    console.log(`  Host: ${settings.smtp_host}`);
    console.log(`  Port: ${settings.smtp_port}`);
    console.log(`  Sender: ${settings.sender_name} <${settings.sender_email}>`);

    // Step 2: Login as employee
    console.log('\nStep 2: Logging in as employee...');
    
    // Try common employee credentials
    let token;
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/employee/login`, {
        email: 'admin@nibog.com',
        password: 'admin123'
      });
      token = loginResponse.data.token;
      console.log('✓ Login successful');
    } catch (error) {
      console.log('✗ Login failed with default credentials');
      console.log('\nPlease provide employee credentials:');
      console.log('  Default tried: admin@nibog.com / admin123');
      console.log('\nOr create an employee first using POST /api/employee');
      return;
    }

    // Step 3: Send test email
    console.log('\nStep 3: Sending test email...');
    console.log(`  Recipient: ${TEST_EMAIL}`);
    
    const emailData = {
      to: TEST_EMAIL,
      subject: 'Test Email from Nibog Backend - ' + new Date().toLocaleString(),
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              line-height: 1.6; 
              color: #333; 
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container { 
              max-width: 600px; 
              margin: 20px auto; 
              background: white;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white; 
              padding: 30px; 
              text-align: center; 
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content { 
              padding: 30px; 
            }
            .info-box {
              background-color: #f8f9fa;
              border-left: 4px solid #667eea;
              padding: 15px;
              margin: 20px 0;
            }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white; 
              text-decoration: none; 
              border-radius: 25px; 
              margin: 20px 0;
              font-weight: bold;
            }
            .features {
              list-style: none;
              padding: 0;
            }
            .features li {
              padding: 10px 0;
              border-bottom: 1px solid #eee;
            }
            .features li:before {
              content: "✓ ";
              color: #667eea;
              font-weight: bold;
              margin-right: 10px;
            }
            .footer { 
              background-color: #f8f9fa;
              text-align: center; 
              padding: 20px; 
              font-size: 12px; 
              color: #666; 
            }
            .timestamp {
              background-color: #fff3cd;
              border: 1px solid #ffc107;
              padding: 10px;
              border-radius: 5px;
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Nibog Backend Email Test</h1>
            </div>
            
            <div class="content">
              <h2>Hello!</h2>
              <p>This is a <strong>test email</strong> sent from the Nibog Backend API to verify that your email sending functionality is working correctly.</p>
              
              <div class="info-box">
                <h3>📧 Email Configuration Status:</h3>
                <p><strong>SMTP Host:</strong> ${settings.smtp_host}</p>
                <p><strong>SMTP Port:</strong> ${settings.smtp_port}</p>
                <p><strong>Sender:</strong> ${settings.sender_name}</p>
              </div>

              <div class="timestamp">
                <strong>⏰ Sent at:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
              </div>

              <h3>✅ Features Successfully Tested:</h3>
              <ul class="features">
                <li>SMTP Connection Established</li>
                <li>Email Authentication Verified</li>
                <li>HTML Email Rendering</li>
                <li>Database SMTP Configuration</li>
                <li>API Authentication (Bearer Token)</li>
                <li>Nodemailer Integration</li>
              </ul>

              <p>
                <a href="http://localhost:3004/api/bookings/check?booking_ref=TEST123" class="button">
                  View Sample Booking API
                </a>
              </p>

              <p style="margin-top: 30px;">
                <strong>🚀 Your email system is fully operational!</strong><br>
                You can now use this API to send booking confirmations, event reminders, and payment receipts.
              </p>
            </div>
            
            <div class="footer">
              <p>This email was generated automatically by the Nibog Backend API</p>
              <p><strong>Endpoint:</strong> POST /api/email-settings/send</p>
              <p>&copy; 2025 Nibog. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
🎉 Nibog Backend Email Test

Hello!

This is a test email sent from the Nibog Backend API to verify that your email sending functionality is working correctly.

📧 Email Configuration Status:
- SMTP Host: ${settings.smtp_host}
- SMTP Port: ${settings.smtp_port}
- Sender: ${settings.sender_name}

⏰ Sent at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST

✅ Features Successfully Tested:
- SMTP Connection Established
- Email Authentication Verified
- HTML Email Rendering
- Database SMTP Configuration
- API Authentication (Bearer Token)
- Nodemailer Integration

🚀 Your email system is fully operational!
You can now use this API to send booking confirmations, event reminders, and payment receipts.

---
This email was generated automatically by the Nibog Backend API
Endpoint: POST /api/email-settings/send
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

    console.log('\n✓ EMAIL SENT SUCCESSFULLY! 🎉\n');
    console.log('  Details:');
    console.log(`    - To: ${TEST_EMAIL}`);
    console.log(`    - Subject: ${emailData.subject}`);
    console.log(`    - Message ID: ${sendResponse.data.data.messageId}`);
    console.log(`    - Accepted: ${sendResponse.data.data.accepted.join(', ')}`);
    console.log(`    - Status: ${sendResponse.data.data.response}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✓✓✓ TEST COMPLETED SUCCESSFULLY! ✓✓✓');
    console.log('='.repeat(60));
    console.log(`\nPlease check ${TEST_EMAIL} for the test email.`);
    console.log('(Check spam folder if not in inbox)\n');

  } catch (error) {
    console.error('\n✗ TEST FAILED:\n');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Error:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNREFUSED') {
      console.error('  Error: Server not running');
      console.error('  Please start the server with: npm run start');
    } else {
      console.error('  Error:', error.message);
    }
    console.error('\nTroubleshooting:');
    console.error('1. Ensure server is running (npm run start)');
    console.error('2. Check SMTP settings in database');
    console.error('3. Verify employee login credentials');
    console.error('4. Check SMTP credentials are correct');
  }
}

testSendEmail();
