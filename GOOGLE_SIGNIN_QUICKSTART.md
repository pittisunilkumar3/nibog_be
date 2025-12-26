# Google Sign-In - Quick Start

## 🚀 Setup Steps

### 1. Add Google Client ID to .env
```bash
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
```

### 2. Run Database Migration
```bash
npm run migrate
```
This adds `google_id` and `auth_provider` columns to the users table.

### 3. Restart Your Server
```bash
npm run dev
# or
npm start
```

## 📡 API Endpoint

**POST** `/api/users/google-signin`

**Request:**
```json
{
  "token": "google_id_token_from_frontend"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_for_your_app",
  "user": {
    "user_id": 1,
    "full_name": "John Doe",
    "email": "john@example.com",
    "email_verified": true,
    "auth_provider": "google"
  }
}
```

## 🎨 Frontend Integration (React)

### Install Package
```bash
npm install @react-oauth/google
```

### Wrap Your App
```javascript
import { GoogleOAuthProvider } from '@react-oauth/google';

<GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
  <App />
</GoogleOAuthProvider>
```

### Add Login Button
```javascript
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

<GoogleLogin
  onSuccess={async (credentialResponse) => {
    const res = await axios.post('/api/users/google-signin', {
      token: credentialResponse.credential
    });
    localStorage.setItem('token', res.data.token);
    // Redirect to dashboard
  }}
  onError={() => console.log('Login Failed')}
/>
```

## 🔑 Get Google Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/Select a project
3. Enable "Google+ API"
4. Credentials → Create OAuth 2.0 Client ID
5. Add authorized origins (e.g., http://localhost:3000)
6. Copy the Client ID

## ✅ What's Implemented

- ✅ Google ID token verification
- ✅ Automatic user creation for new Google users
- ✅ JWT token generation
- ✅ Email conflict prevention (won't duplicate local accounts)
- ✅ User info updates on subsequent logins
- ✅ Database schema with `google_id` and `auth_provider`

## 🔍 Files Modified

1. **package.json** - Added `google-auth-library`
2. **migration/020_add_google_signin_support.sql** - Database schema
3. **model/userModel.js** - Added Google user methods
4. **controller/userController.js** - Added `googleSignIn` endpoint
5. **routes/user.js** - Added `/google-signin` route
6. **.env.example** - Added `GOOGLE_CLIENT_ID`

## 📋 Testing Checklist

- [ ] Add GOOGLE_CLIENT_ID to .env
- [ ] Run migration: `npm run migrate`
- [ ] Restart server
- [ ] Test Google Sign-In from frontend
- [ ] Verify JWT token is generated
- [ ] Check user is created in database
- [ ] Test returning user login

## 🆘 Need Help?

See [GOOGLE_SIGNIN_GUIDE.md](./GOOGLE_SIGNIN_GUIDE.md) for complete documentation.
