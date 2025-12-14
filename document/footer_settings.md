# Footer Settings API Documentation

## Base URL
```
http://localhost:3004/api/footer-settings
```

## Endpoints

### 1. Get Footer Settings
**GET** `/api/footer-settings/`

**Description:**
Fetch the current footer settings.

**Example Request:**
```
curl -X GET "http://localhost:3004/api/footer-settings/"
```

**Response:**
```json
{
  "id": 1,
  "company_name": "Your Company Name",
  "company_description": "Description here...",
  "address": "Address here...",
  "phone": "1234567890",
  "email": "info@example.com",
  "newsletter_enabled": 1,
  "copyright_text": "Copyright © 2025"
}
```

---

### 2. Update Footer Settings (Protected)
**PUT** `/api/footer-settings/`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body Example:**
```json
{
  "company_name": "New Name",
  "company_description": "New description...",
  "address": "New address...",
  "phone": "9876543210",
  "email": "new@example.com",
  "newsletter_enabled": 0,
  "copyright_text": "Copyright © 2026"
}
```

**Response:**
```json
{
  "message": "Settings updated successfully"
}
```

---

## Notes
- The update endpoint requires a valid Bearer token in the `Authorization` header.
- The get endpoint is public.
- For errors, a JSON object with a `message` and optional `error` field is returned.
