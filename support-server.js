require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');
const { supportAuth, supportLogin, logout } = require('./middleware/auth');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3022;

// Email transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000, // 10 seconds
    socketTimeout: 10000 // 10 seconds
});

// PostgreSQL connection pool
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from support directory
app.use(express.static(path.join(__dirname, 'support')));

// ===== PUBLIC ROUTES =====

// Login endpoint
app.post('/api/support/login', (req, res) => supportLogin(pool, req, res));

// ===== PROTECTED ROUTES =====

// Get all reports
app.get('/api/support/reports', supportAuth(pool), async (req, res) => {
    try {
        const { status } = req.query;

        let query = `
            SELECT 
                r.*,
                p.content as post_content,
                p.user_id as post_author_id,
                u1.username as reporter_username,
                u1.display_name as reporter_display_name,
                u2.username as post_author_username,
                u2.display_name as post_author_display_name,
                u3.username as assigned_username,
                u3.display_name as assigned_display_name
            FROM reports r
            JOIN posts p ON r.post_id = p.id
            JOIN users u1 ON r.reporter_id = u1.id
            JOIN users u2 ON p.user_id = u2.id
            LEFT JOIN users u3 ON r.assigned_to = u3.id
        `;

        const params = [];
        if (status) {
            query += ' WHERE r.status = $1';
            params.push(status);
        }

        query += ' ORDER BY r.created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// Get single report details
app.get('/api/support/reports/:id', supportAuth(pool), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT 
                r.*,
                p.content as post_content,
                p.created_at as post_created_at,
                u1.username as reporter_username,
                u1.display_name as reporter_display_name,
                u1.avatar_url as reporter_avatar,
                u2.id as post_author_id,
                u2.username as post_author_username,
                u2.display_name as post_author_display_name,
                u2.avatar_url as post_author_avatar,
                u3.username as assigned_username,
                u3.display_name as assigned_display_name
            FROM reports r
            JOIN posts p ON r.post_id = p.id
            JOIN users u1 ON r.reporter_id = u1.id
            JOIN users u2 ON p.user_id = u2.id
            LEFT JOIN users u3 ON r.assigned_to = u3.id
            WHERE r.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({ error: 'Failed to fetch report' });
    }
});

// Update report status
app.put('/api/support/reports/:id/status', supportAuth(pool), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'reviewing', 'resolved', 'dismissed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        await pool.query(
            'UPDATE reports SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [status, id]
        );

        res.json({ success: true, message: 'Report status updated' });
    } catch (error) {
        console.error('Error updating report status:', error);
        res.status(500).json({ error: 'Failed to update report status' });
    }
});

// Assign report to support user
app.put('/api/support/reports/:id/assign', supportAuth(pool), async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        await pool.query(
            'UPDATE reports SET assigned_to = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [userId || req.user.id, 'reviewing', id]
        );

        res.json({ success: true, message: 'Report assigned' });
    } catch (error) {
        console.error('Error assigning report:', error);
        res.status(500).json({ error: 'Failed to assign report' });
    }
});

// Add notes to report
app.put('/api/support/reports/:id/notes', supportAuth(pool), async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        await pool.query(
            'UPDATE reports SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [notes, id]
        );

        res.json({ success: true, message: 'Notes updated' });
    } catch (error) {
        console.error('Error updating notes:', error);
        res.status(500).json({ error: 'Failed to update notes' });
    }
});

// Get user details
app.get('/api/support/users/:id', supportAuth(pool), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT 
                u.*,
                COUNT(DISTINCT p.id) as post_count,
                COUNT(DISTINCT l.id) as like_count,
                COUNT(DISTINCT r.id) as report_count
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id
            LEFT JOIN likes l ON u.id = l.user_id
            LEFT JOIN reports r ON u.id = r.reporter_id
            WHERE u.id = $1
            GROUP BY u.id
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Get user's posts
app.get('/api/support/users/:id/posts', supportAuth(pool), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT 
                p.*,
                COUNT(DISTINCT r.id) as report_count
            FROM posts p
            LEFT JOIN reports r ON p.id = r.post_id
            WHERE p.user_id = $1
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT 50
        `, [id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user posts:', error);
        res.status(500).json({ error: 'Failed to fetch user posts' });
    }
});

// Get support statistics
app.get('/api/support/stats', supportAuth(pool), async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports,
                (SELECT COUNT(*) FROM reports WHERE status = 'reviewing') as reviewing_reports,
                (SELECT COUNT(*) FROM reports WHERE status = 'resolved') as resolved_reports,
                (SELECT COUNT(*) FROM reports WHERE assigned_to = $1) as my_reports
        `, [req.user.id]);

        res.json(stats.rows[0]);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Logout
app.post('/api/support/logout', supportAuth(pool), (req, res) => logout(req, res));

// Delete post (moderation action)
app.delete('/api/support/posts/:id', supportAuth(pool), async (req, res) => {
    try {
        const { id } = req.params;

        // Delete post (cascades to likes, reposts, bookmarks, reports, etc.)
        await pool.query('DELETE FROM posts WHERE id = $1', [id]);

        res.json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// Temp ban user (moderation action)
app.post('/api/support/users/:id/tempban', supportAuth(pool), async (req, res) => {
    try {
        const { id } = req.params;
        const { duration } = req.body; // duration in days

        if (!duration || duration < 1 || duration > 30) {
            return res.status(400).json({ error: 'Invalid duration. Must be between 1 and 30 days.' });
        }

        // Calculate ban expiry
        const banUntil = new Date();
        banUntil.setDate(banUntil.getDate() + parseInt(duration));

        // Update user status
        await pool.query(
            'UPDATE users SET status = $1, ban_until = $2 WHERE id = $3',
            ['suspended', banUntil, id]
        );

        res.json({
            success: true,
            message: `User temporarily banned for ${duration} day(s)`,
            ban_until: banUntil
        });
    } catch (error) {
        console.error('Error banning user:', error);
        res.status(500).json({ error: 'Failed to ban user' });
    }
});

// Serve support panel HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'support', 'index.html'));
});

// Get all social posts
app.get('/api/support/social', supportAuth(pool), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                sp.*,
                u.username,
                u.display_name,
                u.avatar_url
            FROM social_posts sp
            JOIN users u ON sp.user_id = u.id
            ORDER BY sp.created_at DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching social posts:', error);
        res.status(500).json({ error: 'Failed to fetch social posts' });
    }
});

// Get single social post details
app.get('/api/support/social/:id', supportAuth(pool), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT 
                sp.*,
                u.username,
                u.display_name,
                u.avatar_url,
                u.id as user_id
            FROM social_posts sp
            JOIN users u ON sp.user_id = u.id
            WHERE sp.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Social post not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching social post:', error);
        res.status(500).json({ error: 'Failed to fetch social post' });
    }
});

// Delete social post (moderation action)
app.delete('/api/support/social/:id', supportAuth(pool), async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query('DELETE FROM social_posts WHERE id = $1', [id]);

        res.json({ success: true, message: 'Social post deleted successfully' });
    } catch (error) {
        console.error('Error deleting social post:', error);
        res.status(500).json({ error: 'Failed to delete social post' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Support server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🛟 Support panel running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing support server...');
    pool.end(() => {
        console.log('Support database pool closed');
        process.exit(0);
    });
});
