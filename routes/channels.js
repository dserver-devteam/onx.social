const express = require('express');
const router = express.Router();

// Get all channels (discovery)
router.get('/channels', async (req, res) => {
    try {
        const userId = req.query.user_id || null;

        const result = await req.pool.query(`
            SELECT 
                c.*,
                u.username as creator_username,
                u.display_name as creator_display_name,
                CASE WHEN cf.user_id IS NOT NULL THEN true ELSE false END as is_following
            FROM update_channels c
            JOIN users u ON c.creator_id = u.id
            LEFT JOIN channel_followers cf ON c.id = cf.channel_id AND cf.user_id = $1
            ORDER BY c.follower_count DESC, c.created_at DESC
            LIMIT 50
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({ error: 'Failed to fetch channels' });
    }
});

// Get single channel details
router.get('/channels/:id', async (req, res) => {
    try {
        const userId = req.query.user_id || null;

        const channelResult = await req.pool.query(`
            SELECT 
                c.*,
                u.username as creator_username,
                u.display_name as creator_display_name,
                u.avatar_url as creator_avatar,
                CASE WHEN cf.user_id IS NOT NULL THEN true ELSE false END as is_following
            FROM update_channels c
            JOIN users u ON c.creator_id = u.id
            LEFT JOIN channel_followers cf ON c.id = cf.channel_id AND cf.user_id = $1
            WHERE c.id = $2
        `, [userId, req.params.id]);

        if (channelResult.rows.length === 0) {
            return res.status(404).json({ error: 'Channel not found' });
        }

        res.json(channelResult.rows[0]);
    } catch (error) {
        console.error('Error fetching channel:', error);
        res.status(500).json({ error: 'Failed to fetch channel' });
    }
});

// Create new channel
router.post('/channels', async (req, res) => {
    const { name, description, avatar_url, user_id } = req.body;

    if (!user_id) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Channel name is required' });
    }

    if (name.length > 255) {
        return res.status(400).json({ error: 'Channel name too long' });
    }

    try {
        const result = await req.pool.query(`
            INSERT INTO update_channels (name, description, creator_id, avatar_url)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [name.trim(), description || null, user_id, avatar_url || null]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating channel:', error);
        res.status(500).json({ error: 'Failed to create channel' });
    }
});

// Follow channel
router.post('/channels/:id/follow', async (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        await req.pool.query(`
            INSERT INTO channel_followers (channel_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
        `, [req.params.id, user_id]);

        res.json({ success: true, following: true });
    } catch (error) {
        console.error('Error following channel:', error);
        res.status(500).json({ error: 'Failed to follow channel' });
    }
});

// Unfollow channel
router.delete('/channels/:id/follow', async (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        await req.pool.query(`
            DELETE FROM channel_followers
            WHERE channel_id = $1 AND user_id = $2
        `, [req.params.id, user_id]);

        res.json({ success: true, following: false });
    } catch (error) {
        console.error('Error unfollowing channel:', error);
        res.status(500).json({ error: 'Failed to unfollow channel' });
    }
});

// Get channel updates
router.get('/channels/:id/updates', async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    try {
        const result = await req.pool.query(`
            SELECT *
            FROM channel_updates
            WHERE channel_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `, [req.params.id, limit, offset]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching updates:', error);
        res.status(500).json({ error: 'Failed to fetch updates' });
    }
});

// Post update to channel (creator only)
router.post('/channels/:id/updates', async (req, res) => {
    const { content, media_url, user_id } = req.body;

    if (!user_id) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Update content is required' });
    }

    try {
        // Check if user is the channel creator
        const channelCheck = await req.pool.query(`
            SELECT creator_id FROM update_channels WHERE id = $1
        `, [req.params.id]);

        if (channelCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Channel not found' });
        }

        if (channelCheck.rows[0].creator_id !== user_id) {
            return res.status(403).json({ error: 'Only channel creator can post updates' });
        }

        const result = await req.pool.query(`
            INSERT INTO channel_updates (channel_id, content, media_url)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [req.params.id, content.trim(), media_url || null]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error posting update:', error);
        res.status(500).json({ error: 'Failed to post update' });
    }
});

// Get updates feed (from followed channels)
router.get('/feed/updates', async (req, res) => {
    const { user_id } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    if (!user_id) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const result = await req.pool.query(`
            SELECT 
                cu.*,
                c.name as channel_name,
                c.avatar_url as channel_avatar
            FROM channel_updates cu
            JOIN update_channels c ON cu.channel_id = c.id
            JOIN channel_followers cf ON c.id = cf.channel_id
            WHERE cf.user_id = $1
            ORDER BY cu.created_at DESC
            LIMIT $2 OFFSET $3
        `, [user_id, limit, offset]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching updates feed:', error);
        res.status(500).json({ error: 'Failed to fetch updates feed' });
    }
});

// Get user's created channels
router.get('/my-channels', async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const result = await req.pool.query(`
            SELECT *
            FROM update_channels
            WHERE creator_id = $1
            ORDER BY created_at DESC
        `, [user_id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user channels:', error);
        res.status(500).json({ error: 'Failed to fetch channels' });
    }
});

// Delete channel (creator only)
router.delete('/channels/:id', async (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        // Check if user is the channel creator
        const channelCheck = await req.pool.query(`
            SELECT creator_id FROM update_channels WHERE id = $1
        `, [req.params.id]);

        if (channelCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Channel not found' });
        }

        if (channelCheck.rows[0].creator_id !== user_id) {
            return res.status(403).json({ error: 'Only channel creator can delete the channel' });
        }

        // Delete the channel (cascading deletes will handle followers and updates)
        await req.pool.query(`
            DELETE FROM update_channels WHERE id = $1
        `, [req.params.id]);

        res.json({ message: 'Channel deleted successfully' });
    } catch (error) {
        console.error('Error deleting channel:', error);
        res.status(500).json({ error: 'Failed to delete channel' });
    }
});

module.exports = router;
