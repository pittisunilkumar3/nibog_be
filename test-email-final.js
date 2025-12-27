const axios = require('axios');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const BASE_URL = 'http://localhost:3004';
const TEST_EMAIL = 'pittisunilkumar3@gmail.com';

async function setupAndTestEmail() {
  console.log('\n=== Setting Up and Testing Email to pittisunilkumar3@gmail.com ===\n');

  try {
    // Step 1: Create employee directly in database
    console.log('Step 1: Setting up test employee...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Check if employee exists
    const [employees] = await connection.execute(
      'SELECT * FROM employee WHERE email = ?',
      ['test@nibog.com']
    );

    let employeeEmail = 'test@nibog.com';
    let employeePassword = 'test123';

    if (employees.length === 0) {
      // Create new employee
      const hashedPassword = await bcrypt.hash(employeePassword, 10);
      await connection.execute(
        'INSERT INTO employee (username, email, password_hash) VALUES (?, ?, ?)',
        ['Test Employee', employeeEmail, hashedPassword]
      );
      console.log('✓ Test employee created');
    } else {
      console.log('✓ Test employee already exists');
    }

    await connection.end();

    // Step 2: Login as employee
    console.log('\nStep 2: Logging in as employee...');
    const loginResponse = await axios.post(`${BASE_URL}/api/employee/login`, {
      email: employeeEmail,
      password: employeePassword
    });

    const token = loginResponse.data.token;
    console.log('✓ Login successful');

    // Step 3: Check SMTP settings
    console.log('\nStep 3: Checking SMTP configuration...');
    const settingsResponse = await axios.get(`${BASE_URL}/api/email-settings`);
    
    if (!settingsResponse.data.success) {
      console.log('✗ Email settings not configured');
      return;
    }

    const settings = settingsResponse.data.data;
    console.log('✓ SMTP settings found');
    console.log(`  Host: ${settings.smtp_host}`);
    console.log(`  Port: ${settings.smtp_port}`);
    console.log(`  Sender: ${settings.sender_name} <${settings.sender_email}>`);

    // Step 4: Send test email
    console.log('\nStep 4: Sending test email...');
    console.log(`  Recipient: ${TEST_EMAIL}`);
    
    const emailData = {
      to: TEST_EMAIL,
      subject: '🎉 Test Email from Nibog Backend - ' + new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
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
            .success-badge {
              background-color: #28a745;
              color: white;
              padding: 5px 15px;
              border-radius: 20px;
              display: inline-block;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Nibog Backend Email Test</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Email System Successfully Configured!</p>
            </div>
            
            <div class="content">
              <div class="success-badge">✅ TEST SUCCESSFUL</div>
              
              <h2>Hello Sunil! 👋</h2>
              <p>This is a <strong>test email</strong> sent from the Nibog Backend API to verify that your email sending functionality is working perfectly.</p>
              
              <div class="info-box">
                <h3>📧 Email Configuration Details:</h3>
                <p><strong>SMTP Host:</strong> ${settings.smtp_host}</p>
                <p><strong>SMTP Port:</strong> ${settings.smtp_port}</p>
                <p><strong>Sender Name:</strong> ${settings.sender_name}</p>
                <p><strong>Sender Email:</strong> ${settings.sender_email}</p>
              </div>

              <div class="timestamp">
                <strong>⏰ Sent at:</strong> ${new Date().toLocaleString('en-IN', { 
                  timeZone: 'Asia/Kolkata',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })} IST
              </div>

              <h3>✅ Features Successfully Tested:</h3>
              <ul class="features">
                <li>SMTP Connection Established with ${settings.smtp_host}</li>
                <li>Email Authentication Verified</li>
                <li>HTML Email Rendering</li>
                <li>Database SMTP Configuration</li>
                <li>API Authentication (Bearer Token)</li>
                <li>Nodemailer Integration</li>
                <li>Employee Login System</li>
              </ul>

              <h3>🚀 What's Next?</h3>
              <p>Your email system is fully operational! You can now use this API for:</p>
              <ul class="features">
                <li>Booking Confirmations</li>
                <li>Event Reminders</li>
                <li>Payment Receipts</li>
                <li>Welcome Emails</li>
                <li>Custom Notifications</li>
              </ul>

              <p style="margin-top: 30px; padding: 20px; background-color: #e7f3ff; border-left: 4px solid #2196F3; border-radius: 5px;">
                <strong>💡 Tip:</strong> You can customize this email template for your booking confirmations and notifications. Check the <code>EMAIL_API_GUIDE.md</code> file for examples!
              </p>
            </div>
            
            <div class="footer">
              <p>This email was generated automatically by the Nibog Backend API</p>
              <p><strong>Endpoint:</strong> POST /api/email-settings/send</p>
              <p><strong>Server:</strong> http://localhost:3004</p>
              <p>&copy; 2025 Nibog Events. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
🎉 Nibog Backend Email Test
===========================

✅ TEST SUCCESSFUL

Hello Sunil! 👋

This is a test email sent from the Nibog Backend API to verify that your email sending functionality is working perfectly.

📧 Email Configuration Details:
- SMTP Host: ${settings.smtp_host}
- SMTP Port: ${settings.smtp_port}
- Sender Name: ${settings.sender_name}
- Sender Email: ${settings.sender_email}

⏰ Sent at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST

✅ Features Successfully Tested:
- SMTP Connection Established with ${settings.smtp_host}
- Email Authentication Verified
- HTML Email Rendering
- Database SMTP Configuration
- API Authentication (Bearer Token)
- Nodemailer Integration
- Employee Login System

🚀 What's Next?
Your email system is fully operational! You can now use this API for:
- Booking Confirmations
- Event Reminders
- Payment Receipts
- Welcome Emails
- Custom Notifications

💡 Tip: You can customize this email template for your booking confirmations and notifications. Check the EMAIL_API_GUIDE.md file for examples!

---
This email was generated automatically by the Nibog Backend API
Endpoint: POST /api/email-settings/send
Server: http://localhost:3004
© 2025 Nibog Events. All rights reserved.
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

    console.log('\n' + '='.repeat(70));
    console.log('✓✓✓ EMAIL SENT SUCCESSFULLY! 🎉 ✓✓✓');
    console.log('='.repeat(70));
    console.log('\n  Details:');
    console.log(`    ✉️  To: ${TEST_EMAIL}`);
    console.log(`    📋 Subject: ${emailData.subject}`);
    console.log(`    🆔 Message ID: ${sendResponse.data.data.messageId}`);
    console.log(`    ✅ Accepted: ${sendResponse.data.data.accepted.join(', ')}`);
    console.log(`    📊 Status: ${sendResponse.data.data.response}`);
    console.log('\n' + '='.repeat(70));
    console.log(`\n📬 Please check ${TEST_EMAIL} for the test email.`);
    console.log('   (Check spam/junk folder if not in inbox)\n');
    console.log('💡 The email contains a beautifully formatted HTML template!');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n✗ TEST FAILED:\n');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Error:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 500 && error.response.data.error) {
        console.error('\n🔧 Troubleshooting SMTP Error:');
        console.error('  1. Check if SMTP host and port are correct');
        console.error('  2. Verify SMTP username and password');
        console.error('  3. Ensure "Less secure app access" is enabled (for Gmail)');
        console.error('  4. Try using App Password instead of account password');
        console.error('  5. Check if firewall is blocking SMTP ports');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('  Error: Server not running');
      console.error('  Please start the server with: npm run start');
    } else {
      console.error('  Error:', error.message);
    }
  }
}

setupAndTestEmail();
