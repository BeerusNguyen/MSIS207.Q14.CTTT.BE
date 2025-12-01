const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

// Configure nodemailer transporter using env variables
let transporter;
let smtpConfigured = false;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    // Verify SMTP connection
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ SMTP connection failed:', error.message);
        smtpConfigured = false;
      } else {
        console.log('✅ SMTP server connected successfully!');
        smtpConfigured = true;
      }
    });
    smtpConfigured = true; // Assume configured, will be updated by verify callback
    console.log('📧 SMTP configured with:', process.env.SMTP_HOST);
  } catch (error) {
    console.error('❌ SMTP configuration error:', error.message);
    smtpConfigured = false;
  }
}

if (!smtpConfigured || !transporter) {
  console.warn('⚠️ SMTP not configured - emails will be logged only');
  transporter = {
    sendMail: async (options) => {
      console.log('📧 Email would be sent:', options.subject, 'to:', options.to);
      return { response: 'Email logged (SMTP not configured)' };
    }
  };
}

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3001';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *     LoginRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *         password:
 *           type: string
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         token:
 *           type: string
 *         user:
 *           $ref: '#/components/schemas/User'
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (requires email verification)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully, verification email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 requiresVerification:
 *                   type: boolean
 *       400:
 *         description: Validation error or user already exists
 *       500:
 *         description: Server error
 */
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { username, email, password } = req.body;

    // Check if user exists
    const [existingUsers] = await pool.query(
      'SELECT id, is_verified FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      
      // If email exists but not verified, allow resending verification
      if (existingUser.is_verified === 0) {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await pool.query(
          'UPDATE users SET verification_token = ?, verification_token_expiry = ? WHERE id = ?',
          [verificationToken, verificationExpiry, existingUser.id]
        );

        // Resend verification email
        await sendVerificationEmail(email, username, verificationToken);

        return res.status(200).json({
          success: true,
          message: 'Account exists but not verified. New verification email sent.',
          requiresVerification: true
        });
      }

      return res.status(400).json({ 
        success: false,
        message: 'Username or email already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user (is_verified = FALSE)
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, is_verified, verification_token, verification_token_expiry) VALUES (?, ?, ?, FALSE, ?, ?)',
      [username, email, hashedPassword, verificationToken, verificationExpiry]
    );

    // Send verification email
    await sendVerificationEmail(email, username, verificationToken);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      requiresVerification: true,
      userId: result.insertId
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error registering user' 
    });
  }
});

// Helper function to send verification email
async function sendVerificationEmail(email, username, token) {
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

  const mailOptions = {
    from: process.env.FROM_EMAIL || 'noreply@recipe-finder.com',
    to: email,
    subject: '🍳 Verify Your Email - Recipe Finder',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f2d14d 0%, #d17701 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: linear-gradient(135deg, #f2d14d 0%, #d17701 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍳 Recipe Finder</h1>
            <p>Welcome to the world of culinary delights!</p>
          </div>
          <div class="content">
            <h2>Hello ${username}! 👋</h2>
            <p>Thank you for registering an account with Recipe Finder!</p>
            <p>Please click the button below to verify your email:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">✅ Verify Email</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px; font-size: 12px;">
              ${verificationUrl}
            </p>
            
            <div class="warning">
              ⚠️ This link will expire in <strong>24 hours</strong>.
            </div>
            
            <p>If you did not create this account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2024 Recipe Finder. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return transporter.sendMail(mailOptions);
}

/**
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     summary: Verify email with token
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.get('/verify-email', async (req, res) => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({ success: false, message: 'Token and email are required' });
    }

    // Find user with matching token
    const [users] = await pool.query(
      `SELECT * FROM users 
       WHERE email = ? 
       AND verification_token = ? 
       AND verification_token_expiry > NOW()`,
      [email, token]
    );

    if (users.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    // Update user as verified
    await pool.query(
      `UPDATE users 
       SET is_verified = TRUE, 
           verification_token = NULL, 
           verification_token_expiry = NULL 
       WHERE email = ?`,
      [email]
    );

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
      verified: true
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, message: 'Error verifying email' });
  }
});

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification email sent
 *       400:
 *         description: Email not found or already verified
 */
router.post('/resend-verification', [
  body('email').trim().isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;

    // Find user
    const [users] = await pool.query(
      'SELECT id, username, is_verified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    const user = users[0];

    if (user.is_verified) {
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(
      'UPDATE users SET verification_token = ?, verification_token_expiry = ? WHERE email = ?',
      [verificationToken, verificationExpiry, email]
    );

    // Send verification email
    await sendVerificationEmail(email, user.username, verificationToken);

    res.status(200).json({
      success: true,
      message: 'Verification email sent! Please check your inbox.'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, message: 'Error sending verification email' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user (requires verified email)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid credentials
 *       403:
 *         description: Email not verified
 *       500:
 *         description: Server error
 */
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { username, password } = req.body;

    // Find user
    const [users] = await pool.query(
      'SELECT id, username, email, password, is_verified FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid username or password' 
      });
    }

    const user = users[0];

    // Check if email is verified
    if (!user.is_verified) {
      return res.status(403).json({ 
        success: false,
        message: 'Please verify your email before logging in',
        requiresVerification: true,
        email: user.email
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid username or password' 
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error logging in' 
    });
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Authentication]
 *     description: Send a password reset link to the user's email address
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Reset email sent (if email exists)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "If the email exists, a reset link has been sent."
 *       400:
 *         description: Invalid email format
 */
// Forgot password - request reset email
router.post('/forgot-password', [
  body('email').trim().isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { email } = req.body;
    const [users] = await pool.query('SELECT id, username, email FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      // Do not reveal whether email exists
      return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
    }

    const user = users[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token
    await pool.query('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, token, expiresAt]);

    // Send email with reset link
    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@recipe-finder.com',
      to: user.email,
      subject: 'Recipe Finder - Password reset request',
      html: `<p>Hi ${user.username},</p>
             <p>We received a request to reset your password. Click the link below to create a new password. The link is valid for 1 hour.</p>
             <p><a href="${resetLink}">Reset your password</a></p>
             <p>If you didn't request this, you can safely ignore this email.</p>
             <p>— Recipe Finder Team</p>`
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.error('Error sending forgot password email:', err);
      else console.log('Forgot password email sent:', info.response || info);
    });

    res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Error processing forgot password' });
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     description: Reset user password using the token received via email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - token
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               token:
 *                 type: string
 *                 description: Reset token from email
 *                 example: "abc123token..."
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "newPassword123"
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password updated successfully"
 *       400:
 *         description: Invalid token, email, or token expired
 */
// Reset password - finish reset using token
router.post('/reset-password', [
  body('email').trim().isEmail(),
  body('token').notEmpty(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { email, token, password } = req.body;
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(400).json({ success: false, message: 'Invalid token or email' });

    const user = users[0];
    const [rows] = await pool.query('SELECT id, expires_at FROM password_resets WHERE user_id = ? AND token = ?', [user.id, token]);
    if (rows.length === 0) return res.status(400).json({ success: false, message: 'Invalid token or email' });

    const reset = rows[0];
    if (new Date(reset.expires_at) < new Date()) return res.status(400).json({ success: false, message: 'Token expired' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

    // Delete used token
    await pool.query('DELETE FROM password_resets WHERE id = ?', [reset.id]);

    // Optionally notify user
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@recipe-finder.com',
      to: email,
      subject: 'Your password has been changed',
      html: `<p>Your password has been successfully updated. If you did not perform this action, please contact support immediately.</p>`
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.error('Error sending password changed email:', err);
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User info retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: users[0]
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error retrieving user info' 
    });
  }
});

module.exports = router;
