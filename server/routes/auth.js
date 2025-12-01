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
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
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
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Username or email already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    // Generate JWT
    const token = jwt.sign(
      { id: result.insertId, username, email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Send welcome email
    const welcomeMailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@recipe-finder.com',
      to: email,
      subject: 'Chào mừng bạn đến với Recipe Finder! 🍽️',
      html: `
        <h2>Xin chào ${username}!</h2>
        <p>Chúc mừng bạn đã tạo tài khoản thành công tại <strong>Recipe Finder</strong>! 🎉</p>
        
        <h3>Về trang web của chúng tôi:</h3>
        <ul>
          <li>🔍 <strong>Tìm kiếm công thức:</strong> Khám phá hàng ngàn công thức nấu ăn từ khắp nơi trên thế giới</li>
          <li>💾 <strong>Lưu công thức yêu thích:</strong> Lưu trữ những công thức bạn thích để dễ dàng tìm lại</li>
          <li>🥗 <strong>Thông tin dinh dưỡng:</strong> Xem chi tiết calories và các chất dinh dưỡng của mỗi món ăn</li>
          <li>🍳 <strong>Hướng dẫn nấu ăn:</strong> Các bước làm chi tiết và dễ hiểu</li>
        </ul>
        
        <p>Bắt đầu khám phá ngay tại: <a href="${FRONTEND_URL}">Recipe Finder</a></p>
        
        <p>Chúc bạn có những trải nghiệm tuyệt vời!</p>
        <p><em>— Đội ngũ Recipe Finder</em></p>
      `
    };

    transporter.sendMail(welcomeMailOptions, (err, info) => {
      if (err) console.error('Error sending welcome email:', err);
      else console.log('Welcome email sent:', info.response || info);
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: result.insertId,
        username,
        email
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error registering user' 
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
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
      'SELECT id, username, email, password FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid username or password' 
      });
    }

    const user = users[0];

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
