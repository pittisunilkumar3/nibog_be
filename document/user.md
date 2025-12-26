# User API Documentation

## Base URL
```
http://localhost:3004/api/user
```

---

## Endpoints

### 1. Register User
**POST** `/api/user/register`

**Description:** Register a new user.



**Request Body:**
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "yourpassword",
  "phone": "1234567890",
  // city_id is optional
}
```

**Note:**
- `city_id` is optional. If not provided, the user will be registered without a city.

**Success Response:**
```json
{
  "success": true,
  "user": {
    "user_id": 1,
    "full_name": "John Doe",
    "email": "john@example.com",
    "email_verified": 0,
    "phone": "1234567890",
    "phone_verified": 0,
    "city_id": 1,
    "city_name": "Mumbai",
    "state": "Maharashtra",
    "accepted_terms": 0,
    "terms_accepted_at": null,
    "is_active": 1,
    "is_locked": 0,
    "locked_until": null,
    "deactivated_at": null,
    "created_at": "2025-12-14T10:00:00.000Z",
    "updated_at": "2025-12-14T10:00:00.000Z",
    "last_login_at": null
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "All fields are required."
}
```

---

### 2. Login
**POST** `/api/user/login`

**Description:** Login with email and password. Returns JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "yourpassword"
}
```


**Success Response:**
```json
{
  "success": true,
  "token": "<jwt_token>",
  "user": {
    "user_id": 1,
    "full_name": "John Doe",
    "email": "john@example.com",
    "email_verified": 0,
    "phone": "1234567890",
    "phone_verified": 0,
    "city_id": 1,
    "city_name": "Mumbai",
    "state": "Maharashtra",
    "accepted_terms": 0,
    "terms_accepted_at": null,
    "is_active": 1,
    "is_locked": 0,
    "locked_until": null,
    "deactivated_at": null,
    "created_at": "2025-12-14T10:00:00.000Z",
    "updated_at": "2025-12-14T10:00:00.000Z",
    "last_login_at": null
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Invalid credentials."
}
```

---

### 3. Google Sign-In
**POST** `/api/user/google-signin`

**Description:** Sign in or sign up using Google OAuth. Verifies Google ID token and returns JWT token.

**Request Body:**
```json
{
  "token": "google_id_token_from_frontend"
}
```

**Success Response:**
```json
{
  "success": true,
  "token": "<jwt_token>",
  "user": {
    "user_id": 1,
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "",
    "city_id": null,
    "city_name": null,
    "email_verified": 1,
    "auth_provider": "google"
  }
}
```

**Error Responses:**

*Missing Token:*
```json
{
  "success": false,
  "message": "Google token is required."
}
```

*Invalid Token:*
```json
{
  "success": false,
  "message": "Invalid Google token.",
  "error": "Token verification failed"
}
```

*Email Conflict (email exists with local auth):*
```json
{
  "success": false,
  "message": "An account with this email already exists. Please log in with your password or reset it."
}
```

**Notes:**
- Google users are automatically created on first sign-in
- Email is automatically verified for Google users
- `auth_provider` field indicates sign-in method ('local' or 'google')
- JWT token expires in 7 days
- For implementation details, see [GOOGLE_SIGNIN_GUIDE.md](../GOOGLE_SIGNIN_GUIDE.md)

---

### 4. Get Profile (Protected)
**GET** `/api/user/profile`

**Headers:**
```
Authorization: Bearer <jwt_token>
```


**Success Response:**
```json
{
  "success": true,
  "user": {
    "user_id": 1,
    "full_name": "John Doe",
    "email": "john@example.com",
    "email_verified": 0,
    "phone": "1234567890",
    "phone_verified": 0,
    "city_id": 1,
    "city_name": "Mumbai",
    "state": "Maharashtra",
    "accepted_terms": 0,
    "terms_accepted_at": null,
    "is_active": 1,
    "is_locked": 0,
    "locked_until": null,
    "deactivated_at": null,
    "created_at": "2025-12-14T10:00:00.000Z",
    "updated_at": "2025-12-14T10:00:00.000Z",
    "last_login_at": null
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "User not found."
}
```

---

### 5. List All Users (with City/State)
**GET** `/api/user/list`

**Description:**
Returns all users, each with city and state (if set, otherwise null).

**Example Request:**
```
curl -X GET "http://localhost:3004/api/user/list"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": 1,
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "city_id": 1,
      "city_name": "Mumbai",
      "state": "Maharashtra",
      "is_active": 1,
      "created_at": "2025-12-14T10:00:00.000Z",
      "updated_at": "2025-12-14T10:00:00.000Z"
    },
    {
      "user_id": 2,
      "full_name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "9876543210",
      "city_id": null,
      "city_name": null,
      "state": null,
      "is_active": 1,
      "created_at": "2025-12-15T10:00:00.000Z",
      "updated_at": "2025-12-15T10:00:00.000Z"
    }
  ]
}
```

---

### 6. Get Single User (with City/State)
**GET** `/api/user/{id}`

**Description:**
Returns a single user by ID, including city and state (if set, otherwise null).

**Example Request:**
```
curl -X GET "http://localhost:3004/api/user/1"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "city_id": 1,
    "city_name": "Mumbai",
    "state": "Maharashtra",
    "is_active": 1,
    "created_at": "2025-12-14T10:00:00.000Z",
    "updated_at": "2025-12-14T10:00:00.000Z"
  }
}
```

---
### 7. Edit User (Update by ID)
**PUT** `/api/user/{id}`

**Description:**
Update user details by user ID. Only fields provided in the body will be updated.

**Example Request:**
```
curl -X PUT "http://localhost:3004/api/user/1" \
  -H "Content-Type: application/json" \
  -d '{ "full_name": "John Updated", "city_id": 2, "is_active": 0 }'
```

**Request Body Example:**
```json
{
  "full_name": "John Updated",
  "city_id": 2,
  "is_active": 0
}
```

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully"
}
```

---

## JWT Authentication
- Use the token from the login response as a Bearer token in the `Authorization` header for protected endpoints.
- Example:
```
Authorization: Bearer <jwt_token>
```
