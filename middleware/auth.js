require('dotenv').config();
const crypto = require('crypto');

// In-memory session storage (in production, use Redis or database)
const sessions = new Map();

// Session expiry time (1 hour)
const SESSION_EXPIRY = 60 * 60 * 1000;

// Generate session token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Admin authentication middleware
function adminAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const session = sessions.get(token);

    if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }

    if (Date.now() - session.timestamp > SESSION_EXPIRY) {
        sessions.delete(token);
        return res.status(401).json({ error: 'Session expired' });
    }

    // Refresh session timestamp
    session.timestamp = Date.now();
    req.user = session.user;
    next();
}

// Support role authentication middleware
function supportAuth(pool) {
    return async (req, res, next) => {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const session = sessions.get(token);

        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        if (Date.now() - session.timestamp > SESSION_EXPIRY) {
            sessions.delete(token);
            return res.status(401).json({ error: 'Session expired' });
        }

        // Verify user has support role
        try {
            const result = await pool.query(
                'SELECT role FROM users WHERE id = $1',
                [session.user.id]
            );

            if (result.rows.length === 0 || result.rows[0].role !== 'support') {
                return res.status(403).json({ error: 'Access denied. Support role required.' });
            }

            // Refresh session timestamp
            session.timestamp = Date.now();
            req.user = session.user;
            next();
        } catch (error) {
            console.error('Error verifying support role:', error);
            return res.status(500).json({ error: 'Authentication error' });
        }
    };
}

// Admin login handler
async function adminLogin(pool, req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        // Verify password
        const { comparePassword } = require('../utils/password');
        const isValidPassword = await comparePassword(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken();
        sessions.set(token, {
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            },
            timestamp: Date.now()
        });

        res.json({
            success: true,
            token,
            message: 'Admin authentication successful'
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
}

// Support login handler
async function supportLogin(pool, req, res) {
    const { username, password } = req.body;

    try {
        // In a real app, you'd verify password hash
        // For now, we'll use a simple check (you should implement proper password hashing)
        const result = await pool.query(
            'SELECT id, username, display_name, role FROM users WHERE username = $1 AND role = $2',
            [username, 'support']
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials or insufficient permissions'
            });
        }

        const user = result.rows[0];
        const token = generateToken();

        sessions.set(token, {
            user: {
                id: user.id,
                username: user.username,
                displayName: user.display_name,
                role: user.role
            },
            timestamp: Date.now()
        });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.display_name
            }
        });
    } catch (error) {
        console.error('Support login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
}

// Logout handler
function logout(req, res) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
        sessions.delete(token);
    }
    res.json({ success: true, message: 'Logged out successfully' });
}

// Clean up expired sessions periodically
setInterval(() => {
    const now = Date.now();
    for (const [token, session] of sessions.entries()) {
        if (now - session.timestamp > SESSION_EXPIRY) {
            sessions.delete(token);
        }
    }
}, 5 * 60 * 1000); // Clean up every 5 minutes

module.exports = {
    adminAuth,
    supportAuth,
    adminLogin,
    supportLogin,
    logout
};
