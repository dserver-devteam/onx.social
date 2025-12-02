const express = require('express');
const router = express.Router();

// GET /api/trending/topics - Get trending hashtags
router.get('/trending/topics', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const limitNum = parseInt(limit);

        // Get trending hashtags from last 24 hours with time decay
        const query = `
            SELECT 
                h.id,
                h.tag,
                COUNT(ph.post_id) as post_count,
                MAX(ph.created_at) as last_used
            FROM hashtags h
            JOIN post_hashtags ph ON h.id = ph.hashtag_id
            WHERE ph.created_at > NOW() - INTERVAL '24 hours'
            GROUP BY h.id, h.tag
            ORDER BY post_count DESC, last_used DESC
            LIMIT $1
        `;

        const result = await req.pool.query(query, [limitNum]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching trending topics:', error);
        res.status(500).json({ error: 'Failed to fetch trending topics' });
    }
});

// GET /api/trending/posts/:hashtag - Get posts for a specific hashtag
router.get('/trending/posts/:hashtag', async (req, res) => {
    try {
        const { hashtag } = req.params;
        const { user_id, limit = 20, offset = 0 } = req.query;
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);

        // Remove # if present
        const cleanTag = hashtag.replace(/^#/, '');

        const query = `
            SELECT 
                p.id,
                p.content,
                p.media_url,
                p.media_type,
                p.created_at,
                p.quote_id,
                u.id as user_id,
                u.username,
                u.display_name,
                u.avatar_url,
                COUNT(DISTINCT l.id) as like_count,
                COUNT(DISTINCT r.id) as repost_count,
                COUNT(DISTINCT rep.id) as reply_count,
                ${user_id ? `
                EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $3) as user_liked,
                EXISTS(SELECT 1 FROM reposts WHERE post_id = p.id AND user_id = $3) as user_reposted,
                EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = $3) as user_bookmarked,
                ` : 'false as user_liked, false as user_reposted, false as user_bookmarked,'}
                CASE WHEN p.quote_id IS NOT NULL THEN 
                    json_build_object(
                        'id', qp.id,
                        'content', qp.content,
                        'media_url', qp.media_url,
                        'media_type', qp.media_type,
                        'created_at', qp.created_at,
                        'user_id', qu.id,
                        'username', qu.username,
                        'display_name', qu.display_name,
                        'avatar_url', qu.avatar_url
                    )
                ELSE NULL END as quoted_post
            FROM posts p
            JOIN users u ON p.user_id = u.id
            JOIN post_hashtags ph ON p.id = ph.post_id
            JOIN hashtags h ON ph.hashtag_id = h.id
            LEFT JOIN posts qp ON p.quote_id = qp.id
            LEFT JOIN users qu ON qp.user_id = qu.id
            LEFT JOIN likes l ON p.id = l.post_id
            LEFT JOIN reposts r ON p.id = r.post_id
            LEFT JOIN replies rep ON p.id = rep.post_id
            WHERE LOWER(h.tag) = LOWER($1)
            GROUP BY p.id, u.id, u.username, u.display_name, u.avatar_url, qp.id, qu.id, qu.username, qu.display_name, qu.avatar_url
            ORDER BY p.created_at DESC
            LIMIT $2 OFFSET ${user_id ? '$4' : '$3'}
        `;

        const params = user_id
            ? [cleanTag, limitNum, user_id, offsetNum]
            : [cleanTag, limitNum, offsetNum];

        const result = await req.pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching hashtag posts:', error);
        res.status(500).json({ error: 'Failed to fetch hashtag posts' });
    }
});

// GET /api/trending/users - Get trending/active users
router.get('/trending/users', async (req, res) => {
    try {
        const { limit = 5 } = req.query;
        const limitNum = parseInt(limit);

        // Get users with most activity in last 7 days
        const query = `
            SELECT 
                u.id,
                u.username,
                u.display_name,
                u.avatar_url,
                u.bio,
                COUNT(DISTINCT p.id) as post_count,
                COUNT(DISTINCT f.follower_id) as follower_count
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id AND p.created_at > NOW() - INTERVAL '7 days'
            LEFT JOIN follows f ON u.id = f.following_id
            WHERE u.status = 'active'
            GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.bio
            HAVING COUNT(DISTINCT p.id) > 0
            ORDER BY post_count DESC, follower_count DESC
            LIMIT $1
        `;

        const result = await req.pool.query(query, [limitNum]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching trending users:', error);
        res.status(500).json({ error: 'Failed to fetch trending users' });
    }
});

// Helper function to extract hashtags from text
function extractHashtags(text) {
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);
    if (!matches) return [];

    // Remove # and convert to lowercase, remove duplicates
    return [...new Set(matches.map(tag => tag.slice(1).toLowerCase()))];
}

// Function to process hashtags for a post (to be called after post creation)
async function processPostHashtags(pool, postId, content) {
    try {
        const hashtags = extractHashtags(content);

        for (const tag of hashtags) {
            // Insert or update hashtag
            const hashtagResult = await pool.query(`
                INSERT INTO hashtags (tag, post_count, last_used_at)
                VALUES ($1, 1, NOW())
                ON CONFLICT (tag) 
                DO UPDATE SET 
                    post_count = hashtags.post_count + 1,
                    last_used_at = NOW()
                RETURNING id
            `, [tag]);

            const hashtagId = hashtagResult.rows[0].id;

            // Link post to hashtag
            await pool.query(`
                INSERT INTO post_hashtags (post_id, hashtag_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
            `, [postId, hashtagId]);
        }
    } catch (error) {
        console.error('Error processing hashtags:', error);
    }
}

module.exports = router;
module.exports.processPostHashtags = processPostHashtags;
