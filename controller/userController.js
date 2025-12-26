const UserModel = require('../model/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

exports.listAll = async (req, res) => {
  try {
    const users = await UserModel.listAllWithCity();
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
  }
};

exports.getSingle = async (req, res) => {
  try {
    const user = await UserModel.getById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user', error: error.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { full_name, email, password, phone, city_id } = req.body;
    if (!full_name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    const existing = await UserModel.getByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ full_name, email, password_hash, phone, city_id });
    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    const user = await UserModel.getByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    const match = await bcrypt.compare(password, user.password_hash || '');
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    await UserModel.updateLastLogin(user.user_id);
    const token = jwt.sign({ user_id: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, token, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await UserModel.getById(req.user.user_id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile', error: error.message });
  }
};
exports.editUser = async (req, res) => {
  try {
    const user_id = req.params.id;
    const data = req.body;
    if (!data || Object.keys(data).length === 0) return res.status(400).json({ success: false, message: 'No data to update.' });
    const affected = await UserModel.updateUserById(user_id, data);
    if (!affected) return res.status(404).json({ success: false, message: 'User not found or no changes.' });
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
  }
};

exports.googleSignIn = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, message: 'Google token is required.' });
    }

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ success: false, message: 'Google Sign-In is not configured on the server.' });
    }

    // Verify Google token
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid Google token.', error: error.message });
    }

    const payload = ticket.getPayload();
    const google_id = payload['sub'];
    const email = payload['email'];
    const full_name = payload['name'];
    const email_verified = payload['email_verified'];

    // Check if user exists with this Google ID
    let user = await UserModel.getByGoogleId(google_id);

    if (user) {
      // Update user info if changed
      await UserModel.updateGoogleUser(user.user_id, { full_name, email, email_verified });
      await UserModel.updateLastLogin(user.user_id);
      user = await UserModel.getById(user.user_id);
    } else {
      // Check if email already exists (for linking existing accounts)
      const existingUser = await UserModel.getByEmail(email);
      if (existingUser && existingUser.auth_provider === 'local') {
        // Email exists with local auth - you may want to handle account linking here
        return res.status(409).json({ 
          success: false, 
          message: 'An account with this email already exists. Please log in with your password or reset it.' 
        });
      }

      // Create new user
      user = await UserModel.createGoogleUser({
        full_name,
        email,
        google_id,
        email_verified,
        phone: '', // Google doesn't provide phone by default
        city_id: null
      });
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { user_id: user.user_id, email: user.email, auth_provider: 'google' }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true, 
      token: jwtToken, 
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        city_id: user.city_id,
        city_name: user.city_name,
        email_verified: user.email_verified,
        auth_provider: user.auth_provider
      }
    });
  } catch (error) {
    console.error('Google Sign-In error:', error);
    res.status(500).json({ success: false, message: 'Google Sign-In failed', error: error.message });
  }
};
