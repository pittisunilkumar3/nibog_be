const UserModel = require('../model/userModel');
const PasswordResetModel = require('../model/passwordResetModel');
const EmailSettingsModel = require('../model/emailSettingsModel');
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

/**
 * Forgot Password - Send reset email
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required.' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter a valid email address.' 
      });
    }

    // Check if user exists
    const user = await UserModel.getByEmail(email);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'No user account found with this email address.' 
      });
    }

    // Check if user signed up with Google
    if (user.auth_provider === 'google') {
      return res.status(400).json({ 
        success: false, 
        message: 'This account uses Google Sign-In. Please log in with Google instead.' 
      });
    }

    // Delete any existing tokens for this user
    await PasswordResetModel.deleteUserTokens(user.user_id);

    // Create new reset token
    const { token } = await PasswordResetModel.createResetToken(user.user_id);

    // Generate reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    console.log('=== Password Reset Email Details ===');
    console.log('User:', user.full_name, '(' + user.email + ')');
    console.log('Reset Link:', resetLink);
    console.log('Token expires in 1 hour');

    // Send email with reset link
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${user.full_name}</strong>,</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              We received a request to reset your password for your NIBOG account. 
              Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 40px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        font-size: 16px; 
                        font-weight: bold;
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #667eea; word-break: break-all; background: white; padding: 10px; border-radius: 5px;">
              ${resetLink}
            </p>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; font-size: 14px; color: #856404;">
                <strong>⚠️ Security Note:</strong> This link will expire in 1 hour for your security.
              </p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              If you didn't request a password reset, please ignore this email or contact support if you have concerns.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              This is an automated message from NIBOG. Please do not reply to this email.
              <br>
              © ${new Date().getFullYear()} NIBOG. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `;

      const emailResult = await EmailSettingsModel.sendEmail({
        to: email,
        subject: 'Password Reset Request - NIBOG',
        html: emailHtml,
        text: `Hello ${user.full_name},\n\nWe received a request to reset your password. Click the link below to reset it:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nThanks,\nNIBOG Team`
      });

      console.log('Email sent successfully:', emailResult.messageId);

      res.json({ 
        success: true, 
        message: 'Password reset link has been sent to your email address. Please check your inbox.' 
      });
    } catch (emailError) {
      console.error('Error sending reset email:', emailError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send reset email. Please check email settings or try again later.',
        error: emailError.message
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred. Please try again later.', 
      error: error.message 
    });
  }
};

/**
 * Reset Password - Update password with token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token and new password are required.' 
      });
    }

    // Validate password strength (minimum 6 characters)
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long.' 
      });
    }

    // Find and validate token
    const tokenData = await PasswordResetModel.findValidToken(token);
    
    if (!tokenData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token. Please request a new password reset.' 
      });
    }

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await UserModel.updateUserById(tokenData.user_id, { password_hash });

    // Mark token as used
    await PasswordResetModel.markTokenAsUsed(token);

    // Send confirmation email
    try {
      const confirmationHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Changed Successfully</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✓ Password Changed</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${tokenData.full_name}</strong>,</p>
            
            <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; font-size: 16px; color: #155724;">
                <strong>✓ Success!</strong> Your password has been changed successfully.
              </p>
            </div>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              You can now log in to your NIBOG account using your new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 40px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        font-size: 16px; 
                        font-weight: bold;
                        display: inline-block;">
                Log In Now
              </a>
            </div>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; font-size: 14px; color: #856404;">
                <strong>⚠️ Security Alert:</strong> If you didn't make this change, please contact our support team immediately.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              This is an automated message from NIBOG. Please do not reply to this email.
              <br>
              © ${new Date().getFullYear()} NIBOG. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `;

      await EmailSettingsModel.sendEmail({
        to: tokenData.email,
        subject: 'Password Changed Successfully - NIBOG',
        html: confirmationHtml,
        text: `Hello ${tokenData.full_name},\n\nYour password has been changed successfully. You can now log in with your new password.\n\nIf you didn't make this change, please contact support immediately.\n\nThanks,\nNIBOG Team`
      });
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail the password reset if email fails
    }

    res.json({ 
      success: true, 
      message: 'Password has been reset successfully. You can now log in with your new password.' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset password. Please try again.', 
      error: error.message 
    });
  }
};

/**
 * Verify Reset Token - Check if token is valid
 */
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token is required.' 
      });
    }

    const tokenData = await PasswordResetModel.findValidToken(token);
    
    if (!tokenData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token.' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Token is valid.',
      data: {
        email: tokenData.email,
        full_name: tokenData.full_name
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify token.', 
      error: error.message 
    });
  }
};
