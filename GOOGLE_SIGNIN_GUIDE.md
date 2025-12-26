# Google Sign-In Implementation Guide

## Overview
This implementation allows users to sign in using their Google account. The backend verifies the Google ID token and generates a JWT token for authentication.

## Setup Instructions

### 1. Database Migration
Run the migration to add Google Sign-In support to your users table:

```bash
npm run migrate
```

This will execute `migration/020_add_google_signin_support.sql` which adds:
- `google_id` column (VARCHAR 255, unique)
- `auth_provider` column (ENUM: 'local', 'google')
- Index on `google_id`

### 2. Environment Configuration
Add your Google Client ID to your `.env` file:

```env
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
JWT_SECRET=your_jwt_secret_key
```

**How to get Google Client ID:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Configure OAuth consent screen
6. Create Web application credentials
7. Add authorized JavaScript origins (e.g., `http://localhost:3000`, `https://yourdomain.com`)
8. Copy the Client ID

### 3. Frontend Implementation

#### Install Google Sign-In Library (React Example)
```bash
npm install @react-oauth/google
```

#### Setup Google OAuth Provider
```javascript
import { GoogleOAuthProvider } from '@react-oauth/google';

function App() {
  return (
    <GoogleOAuthProvider clientId="your_google_client_id_here">
      {/* Your app components */}
    </GoogleOAuthProvider>
  );
}
```

#### Implement Google Sign-In Button
```javascript
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

function LoginPage() {
  const handleGoogleSignIn = async (credentialResponse) => {
    try {
      const response = await axios.post('http://your-api-url/api/users/google-signin', {
        token: credentialResponse.credential
      });

      if (response.data.success) {
        // Store JWT token
        localStorage.setItem('token', response.data.token);
        
        // Store user data
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        console.log('Sign-in successful:', response.data.user);
        // Redirect to dashboard or home page
      }
    } catch (error) {
      console.error('Google Sign-In failed:', error.response?.data || error.message);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <GoogleLogin
        onSuccess={handleGoogleSignIn}
        onError={() => console.log('Login Failed')}
      />
    </div>
  );
}
```

## API Endpoint

### POST /api/users/google-signin

#### Request Body
```json
{
  "token": "google_id_token_here"
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "token": "your_jwt_token",
  "user": {
    "user_id": 1,
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "",
    "city_id": null,
    "city_name": null,
    "email_verified": true,
    "auth_provider": "google"
  }
}
```

#### Error Responses

**400 Bad Request** - Missing token
```json
{
  "success": false,
  "message": "Google token is required."
}
```

**401 Unauthorized** - Invalid token
```json
{
  "success": false,
  "message": "Invalid Google token.",
  "error": "Token verification failed"
}
```

**409 Conflict** - Email already exists with local auth
```json
{
  "success": false,
  "message": "An account with this email already exists. Please log in with your password or reset it."
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Google Sign-In failed",
  "error": "error details"
}
```

## How It Works

1. **User clicks Google Sign-In** on frontend
2. **Google OAuth** authenticates user and returns ID token
3. **Frontend sends token** to `/api/users/google-signin`
4. **Backend verifies token** using Google OAuth2Client
5. **Backend checks if user exists** by `google_id`
6. **If user exists**: Update user info and last login
7. **If user doesn't exist**: 
   - Check if email exists with local auth (prevent duplicates)
   - Create new user with Google data
8. **Generate JWT token** with user info
9. **Return JWT token** and user data to frontend

## Database Schema Changes

### Users Table (After Migration)
```sql
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `google_id` VARCHAR(255) NULL UNIQUE,
  `auth_provider` ENUM('local', 'google') NOT NULL DEFAULT 'local',
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `phone` varchar(20) NOT NULL,
  `phone_verified` tinyint(1) NOT NULL DEFAULT 0,
  `password_hash` text DEFAULT NULL,
  `city_id` int(11) DEFAULT NULL,
  -- ... other fields
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_google_id` (`google_id`)
);
```

## Security Features

1. **Token Verification**: Google ID token is verified using official Google Auth Library
2. **Audience Validation**: Ensures token was issued for your application
3. **Email Conflict Prevention**: Prevents duplicate accounts with same email
4. **JWT Generation**: Secure JWT tokens with configurable expiration
5. **Password Optional**: Google users don't need passwords (password_hash is nullable)

## Testing

### Using cURL
```bash
curl -X POST http://localhost:3000/api/users/google-signin \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your_google_id_token_here"
  }'
```

### Using Postman
1. Set method to POST
2. URL: `http://localhost:3000/api/users/google-signin`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "token": "your_google_id_token_here"
}
```

## Troubleshooting

### "Google Sign-In is not configured on the server"
- Ensure `GOOGLE_CLIENT_ID` is set in your `.env` file
- Restart your server after adding the environment variable

### "Invalid Google token"
- Check that your Google Client ID matches on frontend and backend
- Ensure the token hasn't expired (Google ID tokens expire quickly)
- Verify authorized origins in Google Cloud Console

### "An account with this email already exists"
- User already has a local account with this email
- Implement account linking or ask user to login with password

## Additional Features to Consider

1. **Account Linking**: Allow users to link Google account to existing local account
2. **Profile Picture**: Store user's Google profile picture URL
3. **Token Refresh**: Implement refresh token mechanism for long sessions
4. **Social Login Options**: Add more providers (Facebook, Apple, etc.)
5. **Two-Factor Authentication**: Additional security layer

## Model Methods Added

### UserModel.getByGoogleId(google_id)
Finds a user by their Google ID.

### UserModel.createGoogleUser(userData)
Creates a new user from Google Sign-In data.

### UserModel.updateGoogleUser(user_id, userData)
Updates existing user's Google-related information.

## Notes

- Google users won't have a phone number by default (Google doesn't provide it in basic scope)
- Email is automatically verified for Google users
- JWT tokens expire in 7 days (configurable in controller)
- Users can be filtered by `auth_provider` to see sign-in method
