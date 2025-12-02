const express = require('express');
const router = express.Router();

// Get active stories from followed users + own stories
router.get('/stories', async (req, res) => {
    try {
        const userId = req.query.user_id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Get stories from users you follow + your own stories
        const result = await req.pool.query(`
            SELECT DISTINCT ON (s.user_id)
                s.user_id,
                u.username,
                u.display_name,
                u.avatar_url,
                COUNT(s.id) as story_count,
                MAX(s.created_at) as latest_story_time,
                BOOL_OR(sv.viewer_id IS NULL) as has_unviewed
            FROM stories s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN story_views sv ON s.id = sv.story_id AND sv.viewer_id = $1
            WHERE s.expires_at > NOW()
            AND (
                s.user_id = $1
                OR s.user_id IN (
                    SELECT following_id FROM follows WHERE follower_id = $1
                )
            )
            GROUP BY s.user_id, u.username, u.display_name, u.avatar_url
            ORDER BY s.user_id, has_unviewed DESC, latest_story_time DESC
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching stories:', error);
        res.status(500).json({ error: 'Failed to fetch stories' });
    }
});

// Get all stories from a specific user
router.get('/stories/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const viewerId = req.query.viewer_id;

        const result = await req.pool.query(`
            SELECT 
                s.*,
                u.username,
                u.display_name,
                u.avatar_url,
                EXISTS(SELECT 1 FROM story_views WHERE story_id = s.id AND viewer_id = $2) as viewed
            FROM stories s
            JOIN users u ON s.user_id = u.id
            WHERE s.user_id = $1 AND s.expires_at > NOW()
            ORDER BY s.created_at ASC
        `, [userId, viewerId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user stories:', error);
        res.status(500).json({ error: 'Failed to fetch user stories' });
    }
});

// Create new story
router.post('/stories', async (req, res) => {
    const { user_id, media_url, media_type, caption } = req.body;

    if (!user_id) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!media_url || !media_type) {
        return res.status(400).json({ error: 'Media URL and type are required' });
    }

    if (!['image', 'video'].includes(media_type)) {
        return res.status(400).json({ error: 'Invalid media type' });
    }

    try {
        const result = await req.pool.query(`
            INSERT INTO stories (user_id, media_url, media_type, caption)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [user_id, media_url, media_type, caption || null]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating story:', error);
        res.status(500).json({ error: 'Failed to create story' });
    }
});

// Delete story (owner only)
router.delete('/stories/:id', async (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        // Check if user owns the story
        const storyCheck = await req.pool.query(`
            SELECT user_id FROM stories WHERE id = $1
        `, [req.params.id]);

        if (storyCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Story not found' });
        }

        if (storyCheck.rows[0].user_id !== user_id) {
            return res.status(403).json({ error: 'Only story owner can delete it' });
        }

        await req.pool.query('DELETE FROM stories WHERE id = $1', [req.params.id]);

        res.json({ message: 'Story deleted successfully' });
    } catch (error) {
        console.error('Error deleting story:', error);
        res.status(500).json({ error: 'Failed to delete story' });
    }
});

// Mark story as viewed
router.post('/stories/:id/view', async (req, res) => {
    const { viewer_id } = req.body;

    if (!viewer_id) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        await req.pool.query(`
            INSERT INTO story_views (story_id, viewer_id)
            VALUES ($1, $2)
            ON CONFLICT (story_id, viewer_id) DO NOTHING
        `, [req.params.id, viewer_id]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking story as viewed:', error);
        res.status(500).json({ error: 'Failed to mark story as viewed' });
    }
});

// Get story viewers (owner only)
router.get('/stories/:id/views', async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        // Check if user owns the story
        const storyCheck = await req.pool.query(`
            SELECT user_id FROM stories WHERE id = $1
        `, [req.params.id]);

        if (storyCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Story not found' });
        }

        if (storyCheck.rows[0].user_id !== user_id) {
            return res.status(403).json({ error: 'Only story owner can view viewers' });
        }

        const result = await req.pool.query(`
            SELECT 
                u.id,
                u.username,
                u.display_name,
                u.avatar_url,
                sv.viewed_at
            FROM story_views sv
            JOIN users u ON sv.viewer_id = u.id
            WHERE sv.story_id = $1
            ORDER BY sv.viewed_at DESC
        `, [req.params.id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching story viewers:', error);
        res.status(500).json({ error: 'Failed to fetch story viewers' });
    }
});

// Cleanup expired stories
router.delete('/stories/cleanup', async (req, res) => {
    try {
        const result = await req.pool.query(`
            DELETE FROM stories WHERE expires_at < NOW()
        `);

        res.json({
            message: 'Expired stories cleaned up',
            deleted: result.rowCount
        });
    } catch (error) {
        console.error('Error cleaning up stories:', error);
        res.status(500).json({ error: 'Failed to cleanup stories' });
    }
});

module.exports = router;
