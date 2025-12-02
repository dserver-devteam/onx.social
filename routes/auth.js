const express = require('express');
const router = express.Router();
const { hashPassword, comparePassword, generateToken, validatePassword, validateEmail } = require('../utils/password');
const { trackLogin, startSession } = require('../utils/analytics');

let pool;

function setPool(dbPool) {
    pool = dbPool;
}

// POST /auth/register - Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, display_name, email, password } = req.body;

        // Validate input
        if (!username || !display_name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate email format
        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({ error: passwordValidation.errors.join(', ') });
        }

        // Check if username or email already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const password_hash = await hashPassword(password);

        // Generate verification token
        const verification_token = generateToken();

        // Create user
        const result = await pool.query(`
            INSERT INTO users (username, display_name, email, password_hash, verification_token, avatar_url)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, username, display_name, email, email_verified, created_at
        `, [
            username,
            display_name,
            email,
            password_hash,
            verification_token,
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        ]);

        const user = result.rows[0];

        // Send verification email
        try {
            const { sendEmail } = require('../services/email');
            await sendEmail(email, 'email_verification', username, verification_token);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
        }

        res.status(201).json({
            message: 'Registration successful! Please check your email to verify your account.',
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                email: user.email,
                email_verified: user.email_verified
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /auth/login - Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user by email
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        // Check if user is permanently banned
        if (user.status === 'banned') {
            return res.status(403).json({ error: 'Your account has been permanently banned' });
        }

        // Check if user is temporarily suspended
        if (user.status === 'suspended') {
            // Check if ban has expired
            if (user.ban_until && new Date(user.ban_until) < new Date()) {
                // Ban expired, reactivate account
                await pool.query(
                    'UPDATE users SET status = $1, ban_until = NULL WHERE id = $2',
                    ['active', user.id]
                );
                user.status = 'active'; // Update local object
            } else {
                // Ban still active
                const banUntil = user.ban_until ? new Date(user.ban_until).toLocaleString() : 'indefinitely';
                return res.status(403).json({
                    error: `Your account has been suspended until ${banUntil}`
                });
            }
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Track login and start session
        const sessionId = await startSession(user.id, req.clientIp, req.userAgent);
        await trackLogin(user.id, req.clientIp, req.userAgent);

        // Return user data (in production, you'd create a session/JWT here)
        res.json({
            message: 'Login successful',
            sessionId, // Include session ID for client
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                email: user.email,
                email_verified: user.email_verified,
                avatar_url: user.avatar_url,
                banner_url: user.banner_url,
                bio: user.bio,
                role: user.role,
                status: user.status
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET /auth/verify-email/:token - Verify email address
router.get('/verify-email/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // Find user with this verification token
        const result = await pool.query(
            'SELECT id, username, email FROM users WHERE verification_token = $1',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid verification token' });
        }

        const user = result.rows[0];

        // Update user as verified
        await pool.query(
            'UPDATE users SET email_verified = true, verification_token = NULL WHERE id = $1',
            [user.id]
        );

        res.json({
            message: 'Email verified successfully! You can now log in.',
            username: user.username
        });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Email verification failed' });
    }
});

// POST /auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Find user by email
        const result = await pool.query(
            'SELECT id, username, email FROM users WHERE email = $1',
            [email]
        );

        // Always return success to prevent email enumeration
        if (result.rows.length === 0) {
            return res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
        }

        const user = result.rows[0];

        // Generate reset token
        const reset_token = generateToken();
        const reset_token_expires = new Date(Date.now() + 3600000); // 1 hour

        // Save reset token
        await pool.query(
            'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
            [reset_token, reset_token_expires, user.id]
        );

        // Send reset email
        try {
            const { sendEmail } = require('../services/email');
            await sendEmail(email, 'password_reset', user.username, reset_token);
        } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
        }

        res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Password reset request failed' });
    }
});

// POST /auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({ error: passwordValidation.errors.join(', ') });
        }

        // Find user with valid reset token
        const result = await pool.query(
            'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const user = result.rows[0];

        // Hash new password
        const password_hash = await hashPassword(password);

        // Update password and clear reset token
        await pool.query(
            'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
            [password_hash, user.id]
        );

        res.json({ message: 'Password reset successful! You can now log in with your new password.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Password reset failed' });
    }
});

// POST /auth/resend-verification - Resend verification email
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Find user
        const result = await pool.query(
            'SELECT id, username, email, email_verified FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.json({ message: 'If an account exists with this email, a verification link has been sent.' });
        }

        const user = result.rows[0];

        if (user.email_verified) {
            return res.status(400).json({ error: 'Email is already verified' });
        }

        // Generate new verification token
        const verification_token = generateToken();

        await pool.query(
            'UPDATE users SET verification_token = $1 WHERE id = $2',
            [verification_token, user.id]
        );

        // Send verification email
        try {
            const { sendEmail } = require('../services/email');
            await sendEmail(email, 'email_verification', user.username, verification_token);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
        }

        res.json({ message: 'Verification email sent!' });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Failed to resend verification email' });
    }
});

module.exports = { router, setPool };
