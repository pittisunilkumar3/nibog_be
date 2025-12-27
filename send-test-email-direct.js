const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
require('dotenv').config();

async function sendTestEmail() {
  console.log('\n=== Sending Test Email to pittisunilkumar3@gmail.com ===\n');

  try {
    // Connect to database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('Step 1: Fetching SMTP settings from database...');
    const [settings] = await connection.execute('SELECT * FROM email_settings LIMIT 1');
    
    if (settings.length === 0) {
      console.log('✗ No SMTP settings found in database');
      console.log('Please configure SMTP settings first');
      await connection.end();
      return;
    }

    const smtp = settings[0];
    console.log('✓ SMTP settings retrieved');
    console.log(`  Host: ${smtp.smtp_host}`);
    console.log(`  Port: ${smtp.smtp_port}`);
    console.log(`  Sender: ${smtp.sender_name} <${smtp.sender_email}>`);

    await connection.end();

    console.log('\nStep 2: Creating email transporter...');
    const transporter = nodemailer.createTransport({
      host: smtp.smtp_host,
      port: smtp.smtp_port,
      secure: smtp.smtp_port === 465,
      auth: {
        user: smtp.smtp_username,
        pass: smtp.smtp_password
      }
    });

    console.log('✓ Transporter created');

    console.log('\nStep 3: Preparing email content...');
    const emailContent = {
      from: `"${smtp.sender_name}" <${smtp.sender_email}>`,
      to: 'pittisunilkumar3@gmail.com',
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
              <p>This is a <strong>test email</strong> sent from the Nibog Backend to verify that your email sending functionality is working perfectly.</p>
              
              <div class="info-box">
                <h3>📧 Your SMTP Configuration:</h3>
                <p><strong>SMTP Host:</strong> ${smtp.smtp_host}</p>
                <p><strong>SMTP Port:</strong> ${smtp.smtp_port}</p>
                <p><strong>Sender Name:</strong> ${smtp.sender_name}</p>
                <p><strong>Sender Email:</strong> ${smtp.sender_email}</p>
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
                <li>SMTP Connection Established</li>
                <li>Database Configuration Working</li>
                <li>Email Authentication Verified</li>
                <li>HTML Email Rendering</li>
                <li>Nodemailer Integration</li>
                <li>SSL/TLS Connection Secure</li>
              </ul>

              <h3>🚀 Your Email System is Ready!</h3>
              <p>You can now use this system for:</p>
              <ul class="features">
                <li>Booking Confirmations</li>
                <li>Event Reminders</li>
                <li>Payment Receipts</li>
                <li>Welcome Emails</li>
                <li>Custom Notifications</li>
              </ul>

              <p style="margin-top: 30px; padding: 20px; background-color: #e7f3ff; border-left: 4px solid #2196F3; border-radius: 5px;">
                <strong>💡 API Endpoint:</strong><br>
                POST /api/email-settings/send<br>
                <small>(Requires employee authentication token)</small>
              </p>
            </div>
            
            <div class="footer">
              <p>This email was generated by Nibog Backend Email System</p>
              <p><strong>Database:</strong> ${process.env.DB_NAME}</p>
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

This is a test email sent from the Nibog Backend to verify that your email sending functionality is working perfectly.

📧 Your SMTP Configuration:
- SMTP Host: ${smtp.smtp_host}
- SMTP Port: ${smtp.smtp_port}
- Sender Name: ${smtp.sender_name}
- Sender Email: ${smtp.sender_email}

⏰ Sent at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST

✅ Features Successfully Tested:
- SMTP Connection Established
- Database Configuration Working
- Email Authentication Verified
- HTML Email Rendering
- Nodemailer Integration
- SSL/TLS Connection Secure

🚀 Your Email System is Ready!
You can now use this system for:
- Booking Confirmations
- Event Reminders
- Payment Receipts
- Welcome Emails
- Custom Notifications

💡 API Endpoint: POST /api/email-settings/send
(Requires employee authentication token)

---
This email was generated by Nibog Backend Email System
Database: ${process.env.DB_NAME}
Server: http://localhost:3004
© 2025 Nibog Events. All rights reserved.
      `
    };

    console.log('✓ Email content prepared');

    console.log('\nStep 4: Sending email...');
    console.log(`  To: pittisunilkumar3@gmail.com`);
    
    const info = await transporter.sendMail(emailContent);

    console.log('\n' + '='.repeat(70));
    console.log('✓✓✓ EMAIL SENT SUCCESSFULLY! 🎉 ✓✓✓');
    console.log('='.repeat(70));
    console.log('\n  📧 Email Details:');
    console.log(`    To: pittisunilkumar3@gmail.com`);
    console.log(`    Subject: ${emailContent.subject}`);
    console.log(`    Message ID: ${info.messageId}`);
    console.log(`    Accepted: ${info.accepted.join(', ')}`);
    console.log(`    Rejected: ${info.rejected.length === 0 ? 'None' : info.rejected.join(', ')}`);
    console.log(`    Response: ${info.response}`);
    console.log('\n' + '='.repeat(70));
    console.log('\n  📬 Please check pittisunilkumar3@gmail.com');
    console.log('     (Check spam/junk folder if not in inbox)');
    console.log('\n  💡 The email contains a beautifully formatted HTML template!');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n✗ EMAIL SENDING FAILED:\n');
    console.error('  Error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\n🔧 Authentication Error - Troubleshooting:');
      console.error('  1. Check SMTP username and password in database');
      console.error('  2. For Gmail: Enable "App Passwords" in Google Account');
      console.error('  3. For Gmail: Use App Password instead of account password');
      console.error('  4. Verify "Less secure app access" settings (if applicable)');
    } else if (error.code === 'ECONNECTION') {
      console.error('\n🔧 Connection Error - Troubleshooting:');
      console.error('  1. Check SMTP host and port in database');
      console.error('  2. Verify firewall is not blocking SMTP ports');
      console.error('  3. Check internet connection');
    } else {
      console.error('\n🔧 Error Details:');
      console.error('  Code:', error.code || 'N/A');
      console.error('  Command:', error.command || 'N/A');
    }
    
    console.error('\n  Stack:', error.stack);
  }
}

sendTestEmail();
