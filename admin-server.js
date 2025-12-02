require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');
const { adminAuth, adminLogin, logout } = require('./middleware/auth');

const app = express();
const PORT = 3033;

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

// Serve static files from admin directory
app.use(express.static(path.join(__dirname, 'admin')));

// ===== PUBLIC ROUTES =====

// Login endpoint
app.post('/api/admin/login', (req, res) => adminLogin(pool, req, res));

// ===== PROTECTED ROUTES =====

// Get dashboard statistics
app.get('/api/admin/stats', adminAuth, async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM posts) as total_posts,
                (SELECT COUNT(*) FROM likes) as total_likes,
                (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports,
                (SELECT COUNT(*) FROM users WHERE role = 'support') as support_users
        `);

        res.json(stats.rows[0]);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Get all users
app.get('/api/admin/users', adminAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.id,
                u.username,
                u.display_name,
                u.role,
                u.created_at,
                COUNT(DISTINCT p.id) as post_count,
                COUNT(DISTINCT l.id) as like_count
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id
            LEFT JOIN likes l ON u.id = l.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Update user role
app.put('/api/admin/users/:id/role', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['user', 'support'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);

        // Log admin action
        await pool.query(
            'INSERT INTO admin_actions (action_type, target_type, target_id, description) VALUES ($1, $2, $3, $4)',
            ['role_change', 'user', id, `Changed user role to ${role}`]
        );

        res.json({ success: true, message: 'User role updated' });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

// Update user details (email, username, display_name)
app.put('/api/admin/users/:id/details', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { email, username, display_name } = req.body;

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (email) {
            updates.push(`email = $${paramCount++}`);
            values.push(email);
        }
        if (username) {
            updates.push(`username = $${paramCount++}`);
            values.push(username);
        }
        if (display_name) {
            updates.push(`display_name = $${paramCount++}`);
            values.push(display_name);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
            values
        );

        // Log admin action
        await pool.query(
            'INSERT INTO admin_actions (action_type, target_type, target_id, description) VALUES ($1, $2, $3, $4)',
            ['user_edit', 'user', id, `Updated user details: ${Object.keys(req.body).join(', ')}`]
        );

        res.json({ success: true, message: 'User details updated' });
    } catch (error) {
        console.error('Error updating user details:', error);
        res.status(500).json({ error: 'Failed to update user details' });
    }
});

// Reset user password
app.put('/api/admin/users/:id/password', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const { hashPassword } = require('./utils/password');
        const password_hash = await hashPassword(password);

        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [password_hash, id]
        );

        // Log admin action
        await pool.query(
            'INSERT INTO admin_actions (action_type, target_type, target_id, description) VALUES ($1, $2, $3, $4)',
            ['password_reset', 'user', id, 'Admin reset user password']
        );

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Suspend user
app.put('/api/admin/users/:id/suspend', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['suspended', id]
        );

        // Log admin action
        await pool.query(
            'INSERT INTO admin_actions (action_type, target_type, target_id, description) VALUES ($1, $2, $3, $4)',
            ['user_suspend', 'user', id, 'User suspended']
        );

        res.json({ success: true, message: 'User suspended' });
    } catch (error) {
        console.error('Error suspending user:', error);
        res.status(500).json({ error: 'Failed to suspend user' });
    }
});

// Ban user
app.put('/api/admin/users/:id/ban', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['banned', id]
        );

        // Log admin action
        await pool.query(
            'INSERT INTO admin_actions (action_type, target_type, target_id, description) VALUES ($1, $2, $3, $4)',
            ['user_ban', 'user', id, 'User banned']
        );

        res.json({ success: true, message: 'User banned' });
    } catch (error) {
        console.error('Error banning user:', error);
        res.status(500).json({ error: 'Failed to ban user' });
    }
});

// Unban/Reactivate user
app.put('/api/admin/users/:id/activate', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['active', id]
        );

        // Log admin action
        await pool.query(
            'INSERT INTO admin_actions (action_type, target_type, target_id, description) VALUES ($1, $2, $3, $4)',
            ['user_activate', 'user', id, 'User reactivated']
        );

        res.json({ success: true, message: 'User activated' });
    } catch (error) {
        console.error('Error activating user:', error);
        res.status(500).json({ error: 'Failed to activate user' });
    }
});

// Delete user (add to deletion queue)
app.delete('/api/admin/users/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Get user details
        const userResult = await pool.query(
            'SELECT username, email FROM users WHERE id = $1',
            [id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Add to deletion queue
        await pool.query(
            'INSERT INTO deletion_queue (user_id, username, email) VALUES ($1, $2, $3)',
            [id, user.username, user.email]
        );

        // Log admin action
        await pool.query(
            'INSERT INTO admin_actions (action_type, target_type, target_id, description) VALUES ($1, $2, $3, $4)',
            ['user_delete_queued', 'user', id, `User deletion queued: ${user.username}`]
        );

        res.json({ success: true, message: 'User deletion queued' });
    } catch (error) {
        console.error('Error queuing user deletion:', error);
        res.status(500).json({ error: 'Failed to queue user deletion' });
    }
});

// Get all posts with moderation info
app.get('/api/admin/posts', adminAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.id,
                p.content,
                p.created_at,
                u.username,
                u.display_name,
                COUNT(DISTINCT r.id) as report_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN reports r ON p.id = r.post_id
            GROUP BY p.id, u.username, u.display_name
            ORDER BY report_count DESC, p.created_at DESC
            LIMIT 100
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// Delete post
app.delete('/api/admin/posts/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query('DELETE FROM posts WHERE id = $1', [id]);

        // Log admin action
        await pool.query(
            'INSERT INTO admin_actions (action_type, target_type, target_id, description) VALUES ($1, $2, $3, $4)',
            ['delete_post', 'post', id, 'Deleted post']
        );

        res.json({ success: true, message: 'Post deleted' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// Get all reports
app.get('/api/admin/reports', adminAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                r.*,
                p.content as post_content,
                u1.username as reporter_username,
                u2.username as assigned_username
            FROM reports r
            JOIN posts p ON r.post_id = p.id
            JOIN users u1 ON r.reporter_id = u1.id
            LEFT JOIN users u2 ON r.assigned_to = u2.id
            ORDER BY r.created_at DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// Get recent admin actions
app.get('/api/admin/actions', adminAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM admin_actions
            ORDER BY created_at DESC
            LIMIT 50
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching admin actions:', error);
        res.status(500).json({ error: 'Failed to fetch admin actions' });
    }
});

// Logout
app.post('/api/admin/logout', adminAuth, (req, res) => logout(req, res));

// Get deletion queue
app.get('/api/admin/deletion-queue', adminAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM deletion_queue
            ORDER BY initiated_at DESC
            LIMIT 100
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching deletion queue:', error);
        res.status(500).json({ error: 'Failed to fetch deletion queue' });
    }
});

// Process deletion queue item
app.post('/api/admin/deletion-queue/:id/process', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Get queue item
        const queueResult = await pool.query(
            'SELECT * FROM deletion_queue WHERE id = $1',
            [id]
        );

        if (queueResult.rows.length === 0) {
            return res.status(404).json({ error: 'Queue item not found' });
        }

        const queueItem = queueResult.rows[0];
        const userId = queueItem.user_id;

        // Update status to processing
        await pool.query(
            'UPDATE deletion_queue SET status = $1 WHERE id = $2',
            ['processing', id]
        );

        try {
            // Count items before deletion
            const counts = {
                posts: (await pool.query('SELECT COUNT(*) FROM posts WHERE user_id = $1', [userId])).rows[0].count,
                likes: (await pool.query('SELECT COUNT(*) FROM likes WHERE user_id = $1', [userId])).rows[0].count,
                reposts: (await pool.query('SELECT COUNT(*) FROM reposts WHERE user_id = $1', [userId])).rows[0].count,
                replies: (await pool.query('SELECT COUNT(*) FROM replies WHERE user_id = $1', [userId])).rows[0].count,
                reports: (await pool.query('SELECT COUNT(*) FROM reports WHERE reporter_id = $1', [userId])).rows[0].count
            };

            // Delete all user data
            await pool.query('DELETE FROM replies WHERE user_id = $1', [userId]);
            await pool.query('DELETE FROM reports WHERE reporter_id = $1 OR assigned_to = $1', [userId]);
            await pool.query('DELETE FROM likes WHERE user_id = $1', [userId]);
            await pool.query('DELETE FROM reposts WHERE user_id = $1', [userId]);
            await pool.query('DELETE FROM posts WHERE user_id = $1', [userId]);
            await pool.query('DELETE FROM users WHERE id = $1', [userId]);

            // Send deletion email
            try {
                const { sendEmail } = require('./services/email');
                await sendEmail(queueItem.email, 'account_deleted', queueItem.username);
            } catch (emailError) {
                console.error('Failed to send deletion email:', emailError);
            }

            // Update queue status
            await pool.query(
                'UPDATE deletion_queue SET status = $1, completed_at = CURRENT_TIMESTAMP, items_deleted = $2 WHERE id = $3',
                ['completed', JSON.stringify(counts), id]
            );

            // Log admin action
            await pool.query(
                'INSERT INTO admin_actions (action_type, target_type, target_id, description) VALUES ($1, $2, $3, $4)',
                ['user_deleted', 'user', userId, `User completely deleted: ${queueItem.username}`]
            );

            res.json({ success: true, message: 'User deleted successfully', counts });
        } catch (deleteError) {
            // Update queue with error
            await pool.query(
                'UPDATE deletion_queue SET status = $1, error_message = $2 WHERE id = $3',
                ['failed', deleteError.message, id]
            );
            throw deleteError;
        }
    } catch (error) {
        console.error('Error processing deletion:', error);
        res.status(500).json({ error: 'Failed to process deletion' });
    }
});

// Bulk delete all data (except admin account)
app.post('/api/admin/bulk-delete-all', adminAuth, async (req, res) => {
    try {
        const { confirmation } = req.body;

        if (confirmation !== 'DELETE_ALL_DATA') {
            return res.status(400).json({ error: 'Invalid confirmation code' });
        }

        // Delete all data except system settings
        await pool.query('DELETE FROM deletion_queue');
        await pool.query('DELETE FROM admin_actions');
        await pool.query('DELETE FROM reports');
        await pool.query('DELETE FROM replies');
        await pool.query('DELETE FROM reposts');
        await pool.query('DELETE FROM likes');
        await pool.query('DELETE FROM posts');
        await pool.query('DELETE FROM users');

        // Log admin action
        await pool.query(
            'INSERT INTO admin_actions (action_type, description) VALUES ($1, $2)',
            ['bulk_delete', 'All database data deleted']
        );

        res.json({ success: true, message: 'All data deleted successfully' });
    } catch (error) {
        console.error('Error bulk deleting:', error);
        res.status(500).json({ error: 'Failed to delete all data' });
    }
});

// Get system settings
app.get('/api/admin/settings', adminAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM system_settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update system setting
app.put('/api/admin/settings/:key', adminAuth, async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        await pool.query(
            'UPDATE system_settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $2',
            [value, key]
        );

        // Log admin action
        await pool.query(
            'INSERT INTO admin_actions (action_type, description) VALUES ($1, $2)',
            ['setting_update', `Updated ${key} to ${value}`]
        );

        res.json({ success: true, message: 'Setting updated' });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

// Serve admin panel HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Admin server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🔐 Admin panel running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing admin server...');
    pool.end(() => {
        console.log('Admin database pool closed');
        process.exit(0);
    });
});
