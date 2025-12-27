# Email Settings API Documentation

## Base URL
```
http://localhost:3004/api/email-settings
```


## Authentication
- `GET /api/email-settings/` is public (no authentication required)
- `PUT /api/email-settings/` requires Bearer token authentication (employee only)
- `POST /api/email-settings/send` requires Bearer token authentication (employee only)

---

## Endpoints


### 1. Get Email Settings (Public)
**GET** `/api/email-settings/`

**Description:**
Fetch the current email SMTP configuration. Only one row exists in the database. This endpoint is public and does not require authentication.

**Example Request:**
```bash
curl -X GET "http://localhost:3004/api/email-settings/"
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "smtp_host": "smtp.example.com",
    "smtp_port": 587,
    "smtp_username": "user@example.com",
    "smtp_password": "password123",
    "sender_name": "Example Sender",
    "sender_email": "sender@example.com",
    "created_at": "2025-12-14T10:00:00.000Z",
    "updated_at": "2025-12-14T10:00:00.000Z"
  }
}
```

**Error Response (Not Found):**
```json
{
  "success": false,
  "message": "Email settings not found. Please configure email settings first."
}
```

---

### 2. Update Email Settings (Protected)
**PUT** `/api/email-settings/`

**Description:**
Update the email SMTP configuration. Always updates the single existing row. If no row exists, creates a new one.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "smtp_username": "your-email@gmail.com",
  "smtp_password": "your-app-password",
  "sender_name": "My Company",
  "sender_email": "noreply@mycompany.com"
}
```

**Field Validations:**
- `smtp_host` (required): SMTP server hostname
- `smtp_port` (required): Port number (1-65535)
- `smtp_username` (required): SMTP authentication username
- `smtp_password` (required): SMTP authentication password
- `sender_name` (required): Display name for outgoing emails
- `sender_email` (required): Email address for outgoing emails

**Example Request:**
```bash
curl -X PUT "http://localhost:3004/api/email-settings/" \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_username": "your-email@gmail.com",
    "smtp_password": "your-app-password",
    "sender_name": "My Company",
    "sender_email": "noreply@mycompany.com"
  }'
```

**Success Response:**
```json
{
  "success": true,
  "message": "Email settings updated successfully",
  "data": {
    "id": 1,
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_username": "your-email@gmail.com",
    "smtp_password": "your-app-password",
    "sender_name": "My Company",
    "sender_email": "noreply@mycompany.com",
    "created_at": "2025-12-14T10:00:00.000Z",
    "updated_at": "2025-12-14T12:30:00.000Z"
  }
}
```

**Error Response (Validation Error):**
```json
{
  "success": false,
  "message": "All fields are required: smtp_host, smtp_port, smtp_username, smtp_password, sender_name, sender_email"
}
```

**Error Response (Invalid Port):**
```json
{
  "success": false,
  "message": "smtp_port must be between 1 and 65535"
}
```

---

### 3. Send Email (Protected)
**POST** `/api/email-settings/send`

**Description:**
Send an email using the configured SMTP settings from the database. Requires employee authentication.

**Headers:**
```
Authorization: Bearer <employee_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Test Email Subject",
  "text": "Plain text email content",
  "html": "<h1>HTML Email Content</h1><p>This is a test email.</p>",
  "cc": "cc@example.com",
  "bcc": "bcc@example.com",
  "attachments": [
    {
      "filename": "document.pdf",
      "path": "/path/to/document.pdf"
    }
  ]
}
```

**Field Details:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| to | string or array | Yes | Recipient email address(es). Can be a single email or array of emails |
| subject | string | Yes | Email subject line |
| text | string | Conditional | Plain text version of email. Either text or html is required |
| html | string | Conditional | HTML version of email. Either text or html is required |
| cc | string | No | Carbon copy recipient(s) |
| bcc | string | No | Blind carbon copy recipient(s) |
| attachments | array | No | Array of attachment objects with filename and path |

**Example Request:**
```bash
curl -X POST "http://localhost:3004/api/email-settings/send" \\
  -H "Authorization: Bearer YOUR_EMPLOYEE_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "customer@example.com",
    "subject": "Booking Confirmation",
    "html": "<h1>Thank you for your booking!</h1><p>Your booking reference is: <strong>PPT251227045</strong></p>",
    "text": "Thank you for your booking! Your booking reference is: PPT251227045"
  }'
```

**Example with Multiple Recipients:**
```bash
curl -X POST "http://localhost:3004/api/email-settings/send" \\
  -H "Authorization: Bearer YOUR_EMPLOYEE_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": ["customer1@example.com", "customer2@example.com"],
    "subject": "Event Reminder",
    "html": "<h1>Event Reminder</h1><p>Your event is tomorrow!</p>"
  }'
```

**Success Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "messageId": "<unique-message-id@smtp.example.com>",
    "accepted": ["recipient@example.com"],
    "rejected": [],
    "response": "250 2.0.0 OK"
  }
}
```

**Error Responses:**

**400 Bad Request - Missing Required Fields:**
```json
{
  "success": false,
  "message": "Required fields: to (email address), subject. Either text or html content is required."
}
```

**400 Bad Request - Invalid Email:**
```json
{
  "success": false,
  "message": "Invalid email address: invalid-email"
}
```

**400 Bad Request - Missing Content:**
```json
{
  "success": false,
  "message": "Either text or html content is required"
}
```

**401 Unauthorized:**
```json
{
  "error": "No token provided"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to send email",
  "error": "SMTP connection failed"
}
```

---

## Common SMTP Configurations

### Gmail
```json
{
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "smtp_username": "your-email@gmail.com",
  "smtp_password": "your-app-password"
}
```

### Outlook/Office 365
```json
{
  "smtp_host": "smtp.office365.com",
  "smtp_port": 587,
  "smtp_username": "your-email@outlook.com",
  "smtp_password": "your-password"
}
```

### SendGrid
```json
{
  "smtp_host": "smtp.sendgrid.net",
  "smtp_port": 587,
  "smtp_username": "apikey",
  "smtp_password": "your-sendgrid-api-key"
}
```

---

## Notes
- Only one email configuration exists in the database at a time
- All endpoints require employee authentication
- The `smtp_password` is stored in plain text - ensure proper security measures
- Always test email configuration after updating settings
