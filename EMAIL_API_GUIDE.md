# Email Sending API - Quick Start Guide

## Setup

1. **Configure SMTP Settings** (one-time setup):

```bash
curl -X PUT "http://localhost:3004/api/email-settings/" \
  -H "Authorization: Bearer YOUR_EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_username": "your-email@gmail.com",
    "smtp_password": "your-app-password",
    "sender_name": "Nibog Events",
    "sender_email": "noreply@nibog.com"
  }'
```

## Usage Examples

### 1. Send Booking Confirmation Email

```javascript
const axios = require('axios');

async function sendBookingConfirmation(bookingDetails, employeeToken) {
  const emailData = {
    to: bookingDetails.parent_email,
    subject: `Booking Confirmation - ${bookingDetails.booking_ref}`,
    html: `
      <h1>Booking Confirmed!</h1>
      <p>Dear ${bookingDetails.parent_name},</p>
      <p>Thank you for booking with Nibog!</p>
      
      <h2>Booking Details:</h2>
      <ul>
        <li><strong>Reference:</strong> ${bookingDetails.booking_ref}</li>
        <li><strong>Event:</strong> ${bookingDetails.event_name}</li>
        <li><strong>Date:</strong> ${bookingDetails.event_date}</li>
        <li><strong>Venue:</strong> ${bookingDetails.venue_name}</li>
        <li><strong>Total Amount:</strong> ₹${bookingDetails.total_amount}</li>
      </ul>
      
      <p>We look forward to seeing you!</p>
    `,
    text: `
      Booking Confirmed!
      
      Dear ${bookingDetails.parent_name},
      
      Thank you for booking with Nibog!
      
      Booking Details:
      - Reference: ${bookingDetails.booking_ref}
      - Event: ${bookingDetails.event_name}
      - Date: ${bookingDetails.event_date}
      - Venue: ${bookingDetails.venue_name}
      - Total Amount: ₹${bookingDetails.total_amount}
      
      We look forward to seeing you!
    `
  };

  const response = await axios.post(
    'http://localhost:3004/api/email-settings/send',
    emailData,
    {
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}

// Usage
const booking = {
  booking_ref: 'PPT251227045',
  parent_name: 'John Doe',
  parent_email: 'john@example.com',
  event_name: 'Birthday Party',
  event_date: '2025-12-30',
  venue_name: 'Nibog Party Hall',
  total_amount: 1799
};

sendBookingConfirmation(booking, 'YOUR_TOKEN');
```

### 2. Send Event Reminder Email

```javascript
async function sendEventReminder(bookings, employeeToken) {
  const recipients = bookings.map(b => b.parent_email);
  
  const emailData = {
    to: recipients,
    subject: 'Event Reminder - Tomorrow!',
    html: `
      <h1>Event Reminder</h1>
      <p>Your event is scheduled for tomorrow!</p>
      <p>Please arrive 15 minutes early.</p>
      <p>If you have any questions, please contact us.</p>
    `
  };

  const response = await axios.post(
    'http://localhost:3004/api/email-settings/send',
    emailData,
    {
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}
```

### 3. Send Payment Receipt Email

```javascript
async function sendPaymentReceipt(paymentDetails, employeeToken) {
  const emailData = {
    to: paymentDetails.customer_email,
    subject: `Payment Receipt - ${paymentDetails.transaction_id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
          <h1>Payment Receipt</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <p>Dear ${paymentDetails.customer_name},</p>
          <p>We have received your payment. Thank you!</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #ddd;">
              <td style="padding: 10px; border: 1px solid #ccc;"><strong>Transaction ID</strong></td>
              <td style="padding: 10px; border: 1px solid #ccc;">${paymentDetails.transaction_id}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ccc;"><strong>Amount</strong></td>
              <td style="padding: 10px; border: 1px solid #ccc;">₹${paymentDetails.amount}</td>
            </tr>
            <tr style="background-color: #ddd;">
              <td style="padding: 10px; border: 1px solid #ccc;"><strong>Payment Method</strong></td>
              <td style="padding: 10px; border: 1px solid #ccc;">${paymentDetails.payment_method}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ccc;"><strong>Date</strong></td>
              <td style="padding: 10px; border: 1px solid #ccc;">${paymentDetails.payment_date}</td>
            </tr>
          </table>
          
          <p>If you have any questions, please contact our support team.</p>
        </div>
        <div style="text-align: center; padding: 20px; font-size: 12px; color: #666;">
          <p>&copy; 2025 Nibog. All rights reserved.</p>
        </div>
      </div>
    `
  };

  const response = await axios.post(
    'http://localhost:3004/api/email-settings/send',
    emailData,
    {
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}
```

### 4. Send Welcome Email to New User

```javascript
async function sendWelcomeEmail(user, employeeToken) {
  const emailData = {
    to: user.email,
    subject: 'Welcome to Nibog!',
    html: `
      <h1>Welcome to Nibog, ${user.name}!</h1>
      <p>Thank you for creating an account with us.</p>
      <p>You can now:</p>
      <ul>
        <li>Browse upcoming events</li>
        <li>Book party packages</li>
        <li>Track your bookings</li>
        <li>Manage your profile</li>
      </ul>
      <p>
        <a href="http://localhost:3004" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
          Get Started
        </a>
      </p>
    `
  };

  const response = await axios.post(
    'http://localhost:3004/api/email-settings/send',
    emailData,
    {
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}
```

## Common SMTP Providers

### Gmail
- **Host:** smtp.gmail.com
- **Port:** 587 (TLS) or 465 (SSL)
- **Note:** Enable 2FA and use App Password

### Outlook/Office 365
- **Host:** smtp.office365.com
- **Port:** 587
- **Username:** Your full email address

### SendGrid
- **Host:** smtp.sendgrid.net
- **Port:** 587
- **Username:** apikey
- **Password:** Your SendGrid API key

### Mailgun
- **Host:** smtp.mailgun.org
- **Port:** 587
- **Username:** Your Mailgun SMTP username
- **Password:** Your Mailgun SMTP password

## Error Handling

```javascript
async function sendEmailWithErrorHandling(emailData, token) {
  try {
    const response = await axios.post(
      'http://localhost:3004/api/email-settings/send',
      emailData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Email sent successfully:', response.data);
    return { success: true, data: response.data };
    
  } catch (error) {
    if (error.response) {
      // Server responded with error
      console.error('Email sending failed:', error.response.data);
      return { 
        success: false, 
        error: error.response.data.message 
      };
    } else {
      // Network or other error
      console.error('Request failed:', error.message);
      return { 
        success: false, 
        error: 'Network error or server not responding' 
      };
    }
  }
}
```

## Testing

Run the test script:

```bash
node test-send-email.js
```

Make sure to:
1. Update employee login credentials
2. Update test email address
3. Configure SMTP settings in database
4. Check that server is running

## Security Notes

- Always use environment variables for sensitive SMTP credentials
- Use app-specific passwords for Gmail (not your main password)
- Enable 2-factor authentication for email accounts
- Consider encrypting SMTP passwords in the database
- Use HTTPS in production to protect Bearer tokens
- Rate limit the email sending endpoint to prevent abuse
