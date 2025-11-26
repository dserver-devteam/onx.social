const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const axios = require('axios');
const { generatePresignedUrl, uploadToS3, deleteFromS3, isValidMediaType, isValidFileSize, BUCKETS } = require('../utils/s3');
const { getRecommendationsForUser, clearUserCache } = require('../utils/llm-recommender');
const { generateEncryptionKey, encrypt, decrypt } = require('../utils/encryption');
const {
    trackPageView,
    trackInteraction,
    trackSearch,
    trackSession,
    trackEvent
} = require('../utils/analytics');
const { loadRecommendations, loadQueueState, saveQueueState } = require('../utils/llm-storage');
const nodemailer = require('nodemailer');

const router = express.Router();

// Create PostgreSQL pool - will be set by server.js
let pool;

const setPool = (dbPool) => {
    pool = dbPool;
};

// Email transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
});

// GET /api/posts - Get posts for feed (LLM-personalized or chronological fallback)
router.get('/posts', async (req, res) => {
    try {
        const { user_id, current_user_id, limit = 20, offset = 0 } = req.query;
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);

        let posts;

        // If user_id is provided, show ONLY that user's posts (for profile page)
        if (user_id && current_user_id && user_id !== current_user_id) {
            // Viewing someone else's profile - show their posts with current user's interactions
            const query = `
                SELECT 
                    p.id,
                    p.content,
                    p.media_url,
                    p.media_type,
                    p.created_at,
                    u.id as user_id,
                    u.username,
                    u.display_name,
                    u.avatar_url,
                    COUNT(DISTINCT l.id) as like_count,
                    COUNT(DISTINCT r.id) as repost_count,
                    COUNT(DISTINCT rep.id) as reply_count,
                    EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $2) as user_liked,
                    EXISTS(SELECT 1 FROM reposts WHERE post_id = p.id AND user_id = $2) as user_reposted,
                    EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = $2) as user_bookmarked
                FROM posts p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN likes l ON p.id = l.post_id
                LEFT JOIN reposts r ON p.id = r.post_id
                LEFT JOIN replies rep ON p.id = rep.post_id
                WHERE p.user_id = $1
                GROUP BY p.id, u.id, u.username, u.display_name, u.avatar_url
                ORDER BY p.created_at DESC
                LIMIT $3 OFFSET $4
            `;

            const result = await pool.query(query, [user_id, current_user_id, limitNum, offsetNum]);
            posts = result.rows;
        } else if (user_id) {
            // Viewing own profile - show user's posts
            const query = `
                SELECT 
                    p.id,
                    p.content,
                    p.media_url,
                    p.media_type,
                    p.created_at,
                    u.id as user_id,
                    u.username,
                    u.display_name,
                    u.avatar_url,
                    COUNT(DISTINCT l.id) as like_count,
                    COUNT(DISTINCT r.id) as repost_count,
                    COUNT(DISTINCT rep.id) as reply_count,
                    EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as user_liked,
                    EXISTS(SELECT 1 FROM reposts WHERE post_id = p.id AND user_id = $1) as user_reposted,
                    EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = $1) as user_bookmarked
                FROM posts p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN likes l ON p.id = l.post_id
                LEFT JOIN reposts r ON p.id = r.post_id
                LEFT JOIN replies rep ON p.id = rep.post_id
                WHERE p.user_id = $1
                GROUP BY p.id, u.id, u.username, u.display_name, u.avatar_url
                ORDER BY p.created_at DESC
                LIMIT $2 OFFSET $3
            `;

            const result = await pool.query(query, [user_id, limitNum, offsetNum]);
            posts = result.rows;
        } else if (current_user_id) {
            // Home feed - Simple chronological feed
            const query = `
                SELECT 
                    p.id,
                    p.content,
                    p.media_url,
                    p.media_type,
                    p.created_at,
                    u.id as user_id,
                    u.username,
                    u.display_name,
                    u.avatar_url,
                    COUNT(DISTINCT l.id) as like_count,
                    COUNT(DISTINCT r.id) as repost_count,
                    COUNT(DISTINCT rep.id) as reply_count,
                    EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as user_liked,
                    EXISTS(SELECT 1 FROM reposts WHERE post_id = p.id AND user_id = $1) as user_reposted,
                    EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = $1) as user_bookmarked
                FROM posts p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN likes l ON p.id = l.post_id
                LEFT JOIN reposts r ON p.id = r.post_id
                LEFT JOIN replies rep ON p.id = rep.post_id
                WHERE p.user_id != $1
                GROUP BY p.id, u.id, u.username, u.display_name, u.avatar_url
                ORDER BY p.created_at DESC
                LIMIT $2 OFFSET $3
            `;

            const result = await pool.query(query, [current_user_id, limitNum, offsetNum]);
            posts = result.rows;
        } else {
            // Fallback to chronological feed
            const query = `
                SELECT 
                    p.id,
                    p.content,
                    p.media_url,
                    p.media_type,
                    p.created_at,
                    u.id as user_id,
                    u.username,
                    u.display_name,
                    u.avatar_url,
                    COUNT(DISTINCT l.id) as like_count,
                    COUNT(DISTINCT r.id) as repost_count,
                    COUNT(DISTINCT rep.id) as reply_count,
                    false as user_liked, 
                    false as user_reposted
                FROM posts p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN likes l ON p.id = l.post_id
                LEFT JOIN reposts r ON p.id = r.post_id
                LEFT JOIN replies rep ON p.id = rep.post_id
                GROUP BY p.id, u.id, u.username, u.display_name, u.avatar_url
                ORDER BY p.created_at DESC
                LIMIT $1 OFFSET $2
            `;

            const result = await pool.query(query, [limitNum, offsetNum]);
            posts = result.rows;
        }

        // Generate pre-signed URLs for media
        posts = await Promise.all(posts.map(async (post) => {
            if (post.media_url) {
                try {
                    // Extract bucket and key from URL
                    const url = new URL(post.media_url);
                    const pathParts = url.pathname.split('/').filter(p => p);
                    if (pathParts.length >= 2) {
                        const bucket = pathParts[0];
                        const key = pathParts.slice(1).join('/');
                        // Generate pre-signed URL (valid for 1 hour)
                        post.media_url = await generatePresignedUrl(bucket, key, 3600);
                    }
                } catch (error) {
                    console.error('Error generating pre-signed URL:', error);
                }
            }
            return post;
        }));

        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// GET /api/feed/recommended - Get recommended posts from external algorithm API
router.get('/feed/recommended', async (req, res) => {
    try {
        const { user_id, cursor = null, limit = 20 } = req.query;

        if (!user_id) {
            return res.status(400).json({ error: 'User ID required for recommendations' });
        }

        const limitNum = parseInt(limit);
        const feedApiUrl = process.env.FEED_ALGORITHM_API_URL || 'http://localhost:4044';

        // Generate or use existing session ID (should be stored per user session)
        const sessionId = `session_${user_id}_${Date.now()}`;

        try {
            // Call the external feed algorithm API with cursor
            console.log(`[Feed] Calling external API: ${feedApiUrl}/api/feed/generate-addictive`);
            const algorithmResponse = await axios.post(`${feedApiUrl}/api/feed/generate-addictive`, {
                user_id: user_id.toString(),
                limit: limitNum,
                cursor: cursor || null,
                session_id: sessionId
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            });

            const feedData = algorithmResponse.data;

            // Extract post IDs from the algorithm response (already in optimal order)
            const postIds = feedData.posts.map(p => parseInt(p.post_id));

            if (postIds.length === 0) {
                return res.json([]);
            }

            console.log(`[Feed] Algorithm returned ${postIds.length} posts in order:`, postIds.slice(0, 5));

            // Fetch full post data from database
            const query = `
                SELECT 
                    p.id,
                    p.content,
                    p.media_url,
                    p.media_type,
                    p.created_at,
                    u.id as user_id,
                    u.username,
                    u.display_name,
                    u.avatar_url,
                    COUNT(DISTINCT l.id) as like_count,
                    COUNT(DISTINCT r.id) as repost_count,
                    COUNT(DISTINCT rep.id) as reply_count,
                    EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as user_liked,
                    EXISTS(SELECT 1 FROM reposts WHERE post_id = p.id AND user_id = $1) as user_reposted,
                    EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = $1) as user_bookmarked
                FROM posts p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN likes l ON p.id = l.post_id
                LEFT JOIN reposts r ON p.id = r.post_id
                LEFT JOIN replies rep ON p.id = rep.post_id
                WHERE p.id = ANY($2)
                GROUP BY p.id, u.id, u.username, u.display_name, u.avatar_url
            `;

            const result = await pool.query(query, [user_id, postIds]);

            // Create a map for quick lookup
            const postMap = new Map(result.rows.map(p => [p.id, p]));

            // Sort posts according to the algorithm's exact order
            let posts = postIds
                .map(id => postMap.get(id))
                .filter(p => p !== undefined);

            console.log(`[Feed] Returning ${posts.length} posts in algorithm order`);

            // Generate pre-signed URLs for media
            posts = await Promise.all(posts.map(async (post) => {
                if (post.media_url) {
                    try {
                        const url = new URL(post.media_url);
                        const pathParts = url.pathname.split('/').filter(p => p);
                        if (pathParts.length >= 2) {
                            const bucket = pathParts[0];
                            const key = pathParts.slice(1).join('/');
                            post.media_url = await generatePresignedUrl(bucket, key, 3600);
                        }
                    } catch (error) {
                        console.error('Error generating pre-signed URL:', error);
                    }
                }
                return post;
            }));

            console.log(`[Feed] ✅ Generated addictive feed for user ${user_id} (${posts.length} posts)`);
            res.json(posts);

        } catch (apiError) {
            console.error('Error calling feed algorithm API:', apiError.message);

            // Fallback to simple chronological feed if external API fails
            const fallbackQuery = `
                SELECT 
                    p.id,
                    p.content,
                    p.media_url,
                    p.media_type,
                    p.created_at,
                    u.id as user_id,
                    u.username,
                    u.display_name,
                    u.avatar_url,
                    COUNT(DISTINCT l.id) as like_count,
                    COUNT(DISTINCT r.id) as repost_count,
                    COUNT(DISTINCT rep.id) as reply_count,
                    EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as user_liked,
                    EXISTS(SELECT 1 FROM reposts WHERE post_id = p.id AND user_id = $1) as user_reposted,
                    EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = $1) as user_bookmarked
                FROM posts p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN likes l ON p.id = l.post_id
                LEFT JOIN reposts r ON p.id = r.post_id
                LEFT JOIN replies rep ON p.id = rep.post_id
                WHERE p.user_id != $1
                GROUP BY p.id, u.id, u.username, u.display_name, u.avatar_url
                ORDER BY p.created_at DESC
                LIMIT $2
            `;

            const result = await pool.query(fallbackQuery, [user_id, limitNum]);
            let posts = result.rows;

            // Generate pre-signed URLs for media
            posts = await Promise.all(posts.map(async (post) => {
                if (post.media_url) {
                    try {
                        const url = new URL(post.media_url);
                        const pathParts = url.pathname.split('/').filter(p => p);
                        if (pathParts.length >= 2) {
                            const bucket = pathParts[0];
                            const key = pathParts.slice(1).join('/');
                            post.media_url = await generatePresignedUrl(bucket, key, 3600);
                        }
                    } catch (error) {
                        console.error('Error generating pre-signed URL:', error);
                    }
                }
                return post;
            }));

            console.log(`[Feed] Fallback to chronological feed for user ${user_id} (${posts.length} posts)`);
            res.json(posts);
        }
    } catch (error) {
        console.error('Error fetching recommended feed:', error);
        res.status(500).json({ error: 'Failed to fetch feed' });
    }
});

// POST /api/sync-posts - Sync posts to external feed algorithm API
router.post('/sync-posts', async (req, res) => {
    try {
        const feedApiUrl = process.env.FEED_ALGORITHM_API_URL || 'http://localhost:4044';

        console.log(`[Sync] Starting post sync to ${feedApiUrl}...`);

        // Get all posts from your database
        const result = await pool.query(`
            SELECT 
                p.id::text as post_id,
                p.content,
                p.user_id::text as author_id,
                ARRAY[]::text[] as themes,
                COALESCE(p.media_type, 'text') as media_type,
                p.created_at
            FROM posts p
            ORDER BY p.created_at DESC
            LIMIT 1000
        `);

        console.log(`[Sync] Found ${result.rows.length} posts to sync`);

        let synced = 0;
        let failed = 0;

        // Send each post to the external API
        for (const post of result.rows) {
            try {
                await axios.post(`${feedApiUrl}/api/posts`, {
                    post_id: post.post_id,
                    content: post.content,
                    author_id: post.author_id,
                    themes: post.themes,
                    media_type: post.media_type,
                    created_at: post.created_at
                }, {
                    timeout: 30000 // 30 second timeout
                });
                synced++;
                if (synced % 100 === 0) {
                    console.log(`[Sync] Progress: ${synced}/${result.rows.length}`);
                }
            } catch (err) {
                failed++;
                console.error(`[Sync] Failed to sync post ${post.post_id}:`, err.message);
            }
        }

        console.log(`[Sync] Complete: ${synced} synced, ${failed} failed`);
        res.json({
            total: result.rows.length,
            synced: synced,
            failed: failed
        });
    } catch (error) {
        console.error('[Sync] Error syncing posts:', error);
        res.status(500).json({ error: 'Failed to sync posts' });
    }
});



// POST /api/posts - Create a new post
router.post('/posts', async (req, res) => {
    try {
        const { user_id, content, media_url, media_type } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Content is required' });
        }

        if (content.length > 280) {
            return res.status(400).json({ error: 'Content must be 280 characters or less' });
        }

        // Validate media_type if media_url is provided
        if (media_url && media_type && !['image', 'video'].includes(media_type)) {
            return res.status(400).json({ error: 'Invalid media type' });
        }

        const query = `
      INSERT INTO posts (user_id, content, media_url, media_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

        const result = await pool.query(query, [
            user_id || 1,
            content,
            media_url || null,
            media_type || null
        ]);

        const newPost = result.rows[0];


        // Track post creation
        await trackEvent(user_id || 1, 'post_create', {
            postId: newPost.id,
            hasMedia: !!media_url
        }, req);


        res.status(201).json(newPost);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

// GET /api/posts/:id - Get a single post by ID
router.get('/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.query;

        const query = `
      SELECT 
        p.id,
        p.content,
        p.created_at,
        u.id as user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        COUNT(DISTINCT l.id) as like_count,
        COUNT(DISTINCT r.id) as repost_count,
        COUNT(DISTINCT rep.id) as reply_count,
        ${user_id ? `
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $2) as user_liked,
        EXISTS(SELECT 1 FROM reposts WHERE post_id = p.id AND user_id = $2) as user_reposted
        ` : 'false as user_liked, false as user_reposted'}
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN reposts r ON p.id = r.post_id
      LEFT JOIN replies rep ON p.id = rep.post_id
      WHERE p.id = $1
      GROUP BY p.id, u.id, u.username, u.display_name, u.avatar_url
    `;

        const result = user_id
            ? await pool.query(query, [id, user_id])
            : await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});

// DELETE /api/posts/:id - Delete a post
router.delete('/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Check if the post exists and belongs to the user
        const checkQuery = 'SELECT user_id FROM posts WHERE id = $1';
        const checkResult = await pool.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (checkResult.rows[0].user_id != user_id) {
            return res.status(403).json({ error: 'You can only delete your own posts' });
        }

        // Delete the post (cascading deletes will handle likes, reposts, replies, etc.)
        await pool.query('DELETE FROM posts WHERE id = $1', [id]);

        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// GET /api/posts/:id/replies - Get all replies for a post
router.get('/posts/:id/replies', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
      SELECT 
        rep.id,
        rep.content,
        rep.created_at,
        u.id as user_id,
        u.username,
        u.display_name,
        u.avatar_url
      FROM replies rep
      JOIN users u ON rep.user_id = u.id
      WHERE rep.post_id = $1
      ORDER BY rep.created_at ASC
    `;

        const result = await pool.query(query, [id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching replies:', error);
        res.status(500).json({ error: 'Failed to fetch replies' });
    }
});

// POST /api/posts/:id/like - Toggle like on a post
router.post('/posts/:id/like', async (req, res) => {
    try {
        const { id } = req.params;
        // Use authenticated user ID if available, otherwise fallback to body or default
        const user_id = req.user?.id || req.body.user_id || 1;

        console.log(`[Like] Toggling like for post ${id} by user ${user_id}`);

        // Check if already liked
        const checkQuery = 'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2';
        const checkResult = await pool.query(checkQuery, [user_id || 1, id]);

        if (checkResult.rows.length > 0) {
            // Unlike
            const deleteQuery = 'DELETE FROM likes WHERE user_id = $1 AND post_id = $2';
            await pool.query(deleteQuery, [user_id || 1, id]);

            // Track unlike
            await trackInteraction(user_id || 1, 'unlike', id, req);

            res.json({ liked: false });
        } else {
            // Like
            const insertQuery = 'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)';
            await pool.query(insertQuery, [user_id || 1, id]);

            // Track like
            await trackInteraction(user_id || 1, 'like', id, req);


            // Create notification
            try {
                const postResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
                if (postResult.rows.length > 0) {
                    const authorId = postResult.rows[0].user_id;
                    // Don't notify if user likes their own post
                    if (authorId !== (user_id || 1)) {
                        await createNotification(authorId, 'like', user_id || 1, id);
                    }
                }
            } catch (notifError) {
                console.error('Error creating like notification:', notifError);
            }

            res.json({ liked: true });
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        console.error(error.stack);
        res.status(500).json({ error: 'Failed to toggle like', details: error.message });
    }
});

// POST /api/posts/:id/repost - Toggle repost
router.post('/posts/:id/repost', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        // Check if already reposted
        const checkQuery = 'SELECT id FROM reposts WHERE user_id = $1 AND post_id = $2';
        const checkResult = await pool.query(checkQuery, [user_id || 1, id]);

        if (checkResult.rows.length > 0) {
            // Unrepost
            const deleteQuery = 'DELETE FROM reposts WHERE user_id = $1 AND post_id = $2';
            await pool.query(deleteQuery, [user_id || 1, id]);

            // Track unrepost
            await trackInteraction(user_id || 1, 'unrepost', id, req);

            res.json({ reposted: false });
        } else {
            // Repost
            const insertQuery = 'INSERT INTO reposts (user_id, post_id) VALUES ($1, $2)';
            await pool.query(insertQuery, [user_id || 1, id]);

            // Track repost
            await trackInteraction(user_id || 1, 'repost', id, req);

            // Clear user's recommendation cache since their interests changed
            clearUserCache(user_id || 1);

            // Create notification
            try {
                const postResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
                if (postResult.rows.length > 0) {
                    const authorId = postResult.rows[0].user_id;
                    // Don't notify if user reposts their own post
                    if (authorId !== (user_id || 1)) {
                        await createNotification(authorId, 'repost', user_id || 1, id);
                    }
                }
            } catch (notifError) {
                console.error('Error creating repost notification:', notifError);
            }

            res.json({ reposted: true });
        }
    } catch (error) {
        console.error('Error toggling repost:', error);
        res.status(500).json({ error: 'Failed to toggle repost' });
    }
});

// POST /api/posts/:id/reply - Add a reply to a post
router.post('/posts/:id/reply', async (req, res) => {
    try {
        const { id } = req.params;
        const { content, user_id: bodyUserId } = req.body;
        const user_id = req.user?.id || bodyUserId || 1;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const query = `
      INSERT INTO replies (user_id, post_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

        const result = await pool.query(query, [user_id || 1, id, content]);

        // Update user interest profile (stronger weight for replies)
        try {
            // Get post themes
            const postResult = await pool.query('SELECT themes FROM posts WHERE id = $1', [id]);
            if (postResult.rows.length > 0 && postResult.rows[0].themes) {
                const themes = postResult.rows[0].themes;

                // Get user profile
                const userResult = await pool.query('SELECT interest_profile FROM users WHERE id = $1', [user_id || 1]);
                let profile = userResult.rows[0]?.interest_profile || {};

                // Update profile
                for (const [theme, score] of Object.entries(themes)) {
                    if (!profile[theme]) profile[theme] = 0;
                    // Add 20% of the post's theme score (replies are stronger signal)
                    profile[theme] = Math.min(1.0, profile[theme] + (score * 0.2));
                }

                await pool.query('UPDATE users SET interest_profile = $1 WHERE id = $2', [profile, user_id || 1]);
                console.log(`[API] Updated interest profile for user ${user_id || 1} (reply)`);
            }
        } catch (err) {
            console.error('Error updating interest profile on reply:', err);
        }

        // Create notification
        try {
            const postResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
            if (postResult.rows.length > 0) {
                const authorId = postResult.rows[0].user_id;
                if (authorId !== (user_id || 1)) {
                    await createNotification(authorId, 'reply', user_id || 1, id, null, content);
                }
            }
        } catch (notifError) {
            console.error('Error creating reply notification:', notifError);
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating reply:', error);
        res.status(500).json({ error: 'Failed to create reply' });
    }
});

// GET /api/users/:id - Get user profile
router.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
      SELECT 
        u.*,
        COUNT(DISTINCT p.id) as post_count,
        COUNT(DISTINCT l.id) as like_count
      FROM users u
      LEFT JOIN posts p ON u.id = p.user_id
      LEFT JOIN likes l ON u.id = l.user_id
      WHERE u.id = $1
      GROUP BY u.id
    `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// GET /api/users/by-username/:username - Get user profile by username
router.get('/users/by-username/:username', async (req, res) => {
    try {
        const { username } = req.params;

        const query = `
            SELECT 
                u.*,
                (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as post_count,
                (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
                (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
                (
                    SELECT COUNT(*) 
                    FROM follows f1 
                    JOIN follows f2 ON f1.following_id = f2.follower_id 
                    WHERE f1.follower_id = u.id AND f2.following_id = u.id
                ) as friends_count
            FROM users u
            WHERE LOWER(u.username) = LOWER($1)
        `;

        const result = await pool.query(query, [username]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// PUT /api/users/:id/profile - Update user profile
router.put('/users/:id/profile', async (req, res) => {
    try {
        const { id } = req.params;
        const { display_name, bio, avatar_url } = req.body;

        if (!display_name || display_name.trim().length === 0) {
            return res.status(400).json({ error: 'Display name is required' });
        }

        const query = `
      UPDATE users
      SET display_name = $1, bio = $2, avatar_url = $3
      WHERE id = $4
      RETURNING id, username, email, display_name, bio, avatar_url, status, created_at
    `;

        const result = await pool.query(query, [
            display_name.trim(),
            bio ? bio.trim() : null,
            avatar_url || null,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// PUT /api/users/:id/account - Update user account settings
router.put('/users/:id/account', async (req, res) => {
    try {
        const { id } = req.params;
        const { email, username, current_password, new_password } = req.body;

        if (!email || !username) {
            return res.status(400).json({ error: 'Email and username are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate username format
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
        }

        // Check if email or username is already taken by another user
        const checkQuery = `
      SELECT id FROM users 
      WHERE (LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)) AND id != $3
    `;
        const checkResult = await pool.query(checkQuery, [email, username, id]);
        if (checkResult.rows.length > 0) {
            return res.status(400).json({ error: 'Email or username already taken' });
        }

        // If password change is requested, verify current password
        if (current_password && new_password) {
            const { verifyPassword, hashPassword } = require('../utils/password');

            const userQuery = 'SELECT password_hash FROM users WHERE id = $1';
            const userResult = await pool.query(userQuery, [id]);

            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const isValid = await verifyPassword(current_password, userResult.rows[0].password_hash);
            if (!isValid) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }

            // Update with new password
            const newPasswordHash = await hashPassword(new_password);
            const updateQuery = `
        UPDATE users
        SET email = $1, username = $2, password_hash = $3
        WHERE id = $4
        RETURNING id, username, email, display_name, bio, avatar_url, status, created_at
      `;
            const result = await pool.query(updateQuery, [email, username, newPasswordHash, id]);
            return res.json(result.rows[0]);
        } else {
            // Update without password change
            const updateQuery = `
        UPDATE users
        SET email = $1, username = $2
        WHERE id = $3
        RETURNING id, username, email, display_name, bio, avatar_url, status, created_at
      `;
            const result = await pool.query(updateQuery, [email, username, id]);
            res.json({ message: 'Account settings updated successfully' });
        }
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({ error: 'Failed to update account settings' });
    }
});

// DELETE /api/users/:id - Delete account
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Delete user (cascading delete should handle posts, likes, etc.)
        await pool.query('DELETE FROM users WHERE id = $1', [id]);

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// POST /api/users/:id/export-data - Export user data
router.post('/users/:id/export-data', async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch user data
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch user posts
        const postsResult = await pool.query('SELECT * FROM posts WHERE user_id = $1', [id]);
        const posts = postsResult.rows;

        // Prepare data package
        const dataPackage = {
            user: {
                username: user.username,
                display_name: user.display_name,
                email: user.email,
                created_at: user.created_at,
                bio: user.bio
            },
            posts: posts,
            export_date: new Date().toISOString()
        };

        // Create JSON file
        const fileContent = JSON.stringify(dataPackage, null, 2);
        const fileBuffer = Buffer.from(fileContent);

        // Upload to S3 temp-data bucket
        // Note: We're using a text/plain content type for JSON for simplicity or application/json
        const fileUrl = await uploadToS3(
            fileBuffer,
            BUCKETS.TEMP_DATA,
            'application/json',
            `export-${user.username}-${Date.now()}`
        );

        // Generate pre-signed URL (valid for 7 days = 604800 seconds)
        // Extract key from URL
        const urlObj = new URL(fileUrl);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        const key = pathParts.slice(1).join('/');

        const downloadUrl = await generatePresignedUrl(BUCKETS.TEMP_DATA, key, 604800);

        // Send email
        if (user.email) {
            try {
                await transporter.sendMail({
                    from: '"N.Social" <noreply@dserver-team.com>',
                    to: user.email,
                    subject: 'Your N.Social Data Export',
                    text: `Here is your requested data export. This link is valid for 7 days: \n\n${downloadUrl} `,
                    html: `
                        <h3>Your Data Export is Ready</h3>
                        <p>You requested a copy of your data from N.Social.</p>
                        <p><a href="${downloadUrl}">Click here to download your data</a></p>
                        <p>This link is valid for 7 days.</p>
                    `
                });
                console.log(`Data export email sent to ${user.email} `);
            } catch (emailError) {
                console.error('Error sending email:', emailError);
                // Continue even if email fails, maybe return the URL in response for testing?
                // For now, we'll just log it.
            }
        }

        res.json({ message: 'Data export requested successfully' });
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

// GET /api/trending - Get trending hashtags
router.get('/trending', async (req, res) => {
    try {
        // Extract hashtags from posts and count their usage
        const query = `
            SELECT
                LOWER(REGEXP_REPLACE(hashtag, '^#', '')) as topic,
                COUNT(*) as count
            FROM (
                SELECT UNNEST(REGEXP_MATCHES(content, '#[a-zA-Z0-9_]+', 'g')) as hashtag
                FROM posts
                WHERE created_at > NOW() - INTERVAL '7 days'
            ) hashtags
            GROUP BY LOWER(REGEXP_REPLACE(hashtag, '^#', ''))
            ORDER BY count DESC, topic ASC
            LIMIT 5
        `;

        const result = await pool.query(query);

        // Format the results
        const trending = result.rows.map(row => ({
            topic: row.topic,
            count: parseInt(row.count)
        }));

        res.json(trending);
    } catch (error) {
        console.error('Error fetching trending:', error);
        res.status(500).json({ error: 'Failed to fetch trending topics' });
    }
});

// GET /api/posts/by-hashtag/:tag - Get posts containing a specific hashtag
router.get('/posts/by-hashtag/:tag', async (req, res) => {
    try {
        const { tag } = req.params;
        const { user_id } = req.query;

        // Search for posts containing the hashtag (case-insensitive)
        const query = `
            SELECT
            p.id,
                p.content,
                p.created_at,
                u.id as user_id,
                u.username,
                u.display_name,
                u.avatar_url,
                COUNT(DISTINCT l.id) as like_count,
                COUNT(DISTINCT r.id) as repost_count,
                COUNT(DISTINCT rep.id) as reply_count,
                ${user_id ? `
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $2) as user_liked,
        EXISTS(SELECT 1 FROM reposts WHERE post_id = p.id AND user_id = $2) as user_reposted
        ` : 'false as user_liked, false as user_reposted'
            }
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN reposts r ON p.id = r.post_id
      LEFT JOIN replies rep ON p.id = rep.post_id
      WHERE p.content ~* $1
      GROUP BY p.id, u.id, u.username, u.display_name, u.avatar_url
      ORDER BY p.created_at DESC
      LIMIT 50
    `;

        // Create regex pattern for hashtag (case-insensitive)
        const hashtagPattern = `#${tag}\\b`;

        const result = user_id
            ? await pool.query(query, [hashtagPattern, user_id])
            : await pool.query(query, [hashtagPattern]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching posts by hashtag:', error);
        res.status(500).json({ error: 'Failed to fetch posts by hashtag' });
    }
});

// POST /api/users/:id/follow - Follow a user
// GET /api/users/:id/is-following - Check if current user is following target user
router.get('/users/:id/is-following', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.query;

        const result = await pool.query(
            'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
            [user_id, id]
        );

        res.json({ isFollowing: result.rows.length > 0 });
    } catch (error) {
        console.error('Error checking follow status:', error);
        res.status(500).json({ error: 'Failed to check follow status' });
    }
});

router.post('/users/:id/follow', async (req, res) => {
    try {
        const { id } = req.params; // user to follow
        const { user_id } = req.body; // current user

        console.log(`[Follow] Request to follow user ${id} by user ${user_id}`);

        if (!user_id) {
            console.error('[Follow] Missing user_id');
            return res.status(400).json({ error: 'User ID is required' });
        }

        if (parseInt(id) === parseInt(user_id)) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        // Check if already following
        const checkQuery = 'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2';
        const checkResult = await pool.query(checkQuery, [user_id, id]);

        if (checkResult.rows.length > 0) {
            return res.status(400).json({ error: 'Already following this user' });
        }

        // Create follow relationship
        const insertQuery = 'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) RETURNING *';
        await pool.query(insertQuery, [user_id, id]);

        // Create notification
        try {
            await createNotification(id, 'follow', user_id);
        } catch (notifError) {
            console.error('Error creating follow notification:', notifError);
        }

        res.json({ success: true, following: true });
    } catch (error) {
        console.error('[Follow] Error following user:', error);
        res.status(500).json({ error: 'Failed to follow user' });
    }
});

// DELETE /api/users/:id/follow - Unfollow a user
router.delete('/users/:id/follow', async (req, res) => {
    try {
        const { id } = req.params; // user to unfollow
        const { user_id } = req.query; // current user

        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const deleteQuery = 'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2';
        await pool.query(deleteQuery, [user_id, id]);

        res.json({ success: true, following: false });
    } catch (error) {
        console.error('Error unfollowing user:', error);
        res.status(500).json({ error: 'Failed to unfollow user' });
    }
});

// GET /api/users/:id/suggested-follows - Get suggested users to follow
router.get('/users/:id/suggested-follows', async (req, res) => {
    try {
        const { id } = req.params;

        // Get users who follow you but you don't follow them back
        // Sorted by their follower count
        const query = `
            SELECT DISTINCT
                u.id,
                u.username,
                u.display_name,
                u.avatar_url,
                u.bio,
                (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count
            FROM users u
            JOIN follows f ON f.follower_id = u.id
            WHERE f.following_id = $1
            AND NOT EXISTS (
                SELECT 1 FROM follows 
                WHERE follower_id = $1 AND following_id = u.id
            )
            AND u.id != $1
            ORDER BY follower_count DESC
            LIMIT 3
        `;

        const result = await pool.query(query, [id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching suggested follows:', error);
        res.status(500).json({ error: 'Failed to fetch suggested follows' });
    }
});

// POST /api/posts/:id/bookmark - Toggle bookmark on a post
router.post('/posts/:id/bookmark', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Check if already bookmarked
        const checkQuery = 'SELECT * FROM bookmarks WHERE user_id = $1 AND post_id = $2';
        const checkResult = await pool.query(checkQuery, [user_id, id]);

        if (checkResult.rows.length > 0) {
            // Remove bookmark
            const deleteQuery = 'DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2';
            await pool.query(deleteQuery, [user_id, id]);

            // Track unbookmark
            await trackInteraction(user_id, 'unbookmark', id, req);

            res.json({ bookmarked: false });
        } else {
            // Add bookmark
            const insertQuery = 'INSERT INTO bookmarks (user_id, post_id) VALUES ($1, $2)';
            await pool.query(insertQuery, [user_id, id]);

            // Track bookmark
            await trackInteraction(user_id, 'bookmark', id, req);

            res.json({ bookmarked: true });
        }
    } catch (error) {
        console.error('Error toggling bookmark:', error);
        res.status(500).json({ error: 'Failed to toggle bookmark' });
    }
});

router.post('/posts/:id/like', async (req, res) => {
    try {
        const { user_id } = req.body;
        const post_id = parseInt(req.params.id);

        if (!user_id || !post_id) {
            return res.status(400).json({ error: 'User ID and Post ID are required' });
        }

        // Check if already liked
        const existingLike = await pool.query(
            'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2',
            [user_id, post_id]
        );

        if (existingLike.rows.length > 0) {
            return res.status(400).json({ error: 'Post already liked' });
        }

        // Add like
        await pool.query(
            'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)',
            [user_id, post_id]
        );

        // Track interaction
        // await trackInteraction(user_id, 'like', post_id, req); // Assuming trackInteraction is defined elsewhere

        // Clear user's recommendation cache
        // clearUserCache(user_id); // Assuming clearUserCache is defined elsewhere

        res.json({ message: 'Post liked successfully' });
    } catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({ error: 'Failed to like post' });
    }
});

// GET /api/users/:id/bookmarks - Get user's bookmarked posts
router.get('/users/:id/bookmarks', async (req, res) => {
    try {
        const { id } = req.params;

        // Query to get posts from mutuals (users who follow you AND you follow them)
        const query = `
            WITH Mutuals AS (
                SELECT f1.following_id as user_id
                FROM follows f1
                JOIN follows f2 ON f1.following_id = f2.follower_id
                WHERE f1.follower_id = $1 AND f2.following_id = $1
            )
            SELECT 
                p.id,
                p.content,
                p.media_url,
                p.media_type,
                p.created_at,
                u.id as user_id,
                u.username,
                u.display_name,
                u.avatar_url,
                COUNT(DISTINCT l.id) as like_count,
                COUNT(DISTINCT r.id) as repost_count,
                COUNT(DISTINCT rep.id) as reply_count,
                EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as user_liked,
                EXISTS(SELECT 1 FROM reposts WHERE post_id = p.id AND user_id = $1) as user_reposted
            FROM posts p
            JOIN Mutuals m ON p.user_id = m.user_id
            JOIN users u ON p.user_id = u.id
            LEFT JOIN likes l ON p.id = l.post_id
            LEFT JOIN reposts r ON p.id = r.post_id
            LEFT JOIN replies rep ON p.id = rep.post_id
            GROUP BY p.id, u.id, u.username, u.display_name, u.avatar_url
            ORDER BY p.created_at DESC
            LIMIT 50
        `;
        const result = await pool.query(query, [id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching bookmarks:', error);
        res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
});

// POST /api/reports - Create a new report
router.post('/reports', async (req, res) => {
    try {
        const { post_id, reporter_id, reason, description } = req.body;

        if (!post_id || !reporter_id || !reason) {
            return res.status(400).json({ error: 'Post ID, reporter ID, and reason are required' });
        }

        const validReasons = ['spam', 'inappropriate', 'harassment', 'misinformation', 'other'];
        if (!validReasons.includes(reason)) {
            return res.status(400).json({ error: 'Invalid reason' });
        }

        const query = `
      INSERT INTO reports(post_id, reporter_id, reason, description)
        VALUES($1, $2, $3, $4)
        RETURNING *
            `;

        const result = await pool.query(query, [post_id, reporter_id, reason, description || null]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({ error: 'Failed to create report' });
    }
});

// GET /api/search - Full-text search for posts and users
router.get('/search', async (req, res) => {
    try {
        const { q, type = 'top' } = req.query; // type: 'top', 'latest', 'people'

        if (!q) {
            return res.json({ posts: [], users: [] });
        }

        let searchQuery = q.trim().toLowerCase();

        // Basic Synonym Expansion (Hardcoded for demo purposes)
        const synonyms = {
            'food': ['meal', 'dish', 'cooking', 'recipe', 'eat'],
            'meal': ['food', 'dish', 'dinner', 'lunch'],
            'music': ['song', 'track', 'audio', 'sound'],
            'video': ['clip', 'movie', 'film'],
            'game': ['gaming', 'play', 'esports'],
            'tech': ['technology', 'code', 'developer', 'software']
        };

        // Expand query with synonyms
        let expandedTerms = [searchQuery];
        Object.keys(synonyms).forEach(key => {
            if (searchQuery.includes(key)) {
                expandedTerms.push(...synonyms[key]);
            }
        });

        // Create a formatted query for tsvector (OR logic for synonyms, AND for main terms)
        // We need to ensure valid tsquery syntax: "term1 & term2" or "term1 | term2"
        // For synonyms of a single term, we use OR. For multiple search terms, we use AND.

        // 1. Handle synonyms for individual words first
        let processedTerms = searchQuery.split(/\s+/).map(term => {
            let termSynonyms = [term];
            Object.keys(synonyms).forEach(key => {
                if (term === key) {
                    termSynonyms.push(...synonyms[key]);
                }
            });
            // Join synonyms with OR and wrap in parens
            return `(${termSynonyms.join(' | ')})`;
        });

        // 2. Join all processed terms with AND
        const tsQuery = processedTerms.join(' & ');

        let posts = [];
        let users = [];

        // Search Users (if type is 'top' or 'people')
        if (type === 'top' || type === 'people') {
            const userResult = await pool.query(`
                SELECT id, username, display_name, avatar_url, bio,
            similarity(username, $1) as sim_score
                FROM users
        WHERE
        status = 'active' AND(
            username ILIKE $2 OR
                        display_name ILIKE $2 OR
                        similarity(username, $1) > 0.3 OR
                        similarity(display_name, $1) > 0.3
        )
                ORDER BY sim_score DESC
                LIMIT 5
            `, [searchQuery, ` % ${searchQuery}% `]);
            users = userResult.rows;
        }

        // Search Posts (if type is 'top' or 'latest')
        if (type === 'top' || type === 'latest') {
            // Use PostgreSQL full-text search + Trigram Word Similarity for fuzzy matching
            // We use a subquery to calculate scores first, then sort by combined score

            const postResult = await pool.query(`
        SELECT * FROM(
            SELECT 
                        p.id, p.content, p.media_url, p.media_type, p.created_at,
            u.id as user_id, u.username, u.display_name, u.avatar_url,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
            (SELECT COUNT(*) FROM reposts WHERE post_id = p.id) as reposts_count,
    (SELECT COUNT(*) FROM replies WHERE post_id = p.id) as replies_count,
        (
            ts_rank(to_tsvector('english', p.content), to_tsquery('english', $1)) * 2 +
            word_similarity($2, p.content)
        ) as relevance_score
                    FROM posts p
                    JOIN users u ON p.user_id = u.id
WHERE
to_tsvector('english', p.content) @@to_tsquery('english', $1) OR
word_similarity($2, p.content) > 0.3
                ) as results
                ORDER BY
CASE 
                        WHEN $3 = 'latest' THEN EXTRACT(EPOCH FROM created_at)
                        ELSE relevance_score
                    END DESC,
    (likes_count + (reposts_count * 2) + replies_count) DESC
                LIMIT 20
    `, [tsQuery, searchQuery, type]);
            posts = postResult.rows;
        }

        // Track search
        const { user_id } = req.query;
        if (user_id) {
            await trackSearch(user_id, searchQuery, {
                type,
                postsCount: posts.length,
                usersCount: users.length
            }, req);
        }

        res.json({ posts, users });

    } catch (error) {
        console.error('Error performing search:', error);
        res.status(500).json({ error: 'Failed to perform search' });
    }
});

// GET /api/autocomplete/hashtags - Get hashtag suggestions
router.get('/autocomplete/hashtags', async (req, res) => {
    try {
        const { query } = req.query;

        // If query is empty, return top trending hashtags
        const searchQuery = query ? `%${query.toLowerCase()}%` : '%';

        // Extract hashtags from posts and count their usage
        const result = await pool.query(`
            SELECT
                LOWER(REGEXP_REPLACE(hashtag, '^#', '')) as tag,
                COUNT(*) as count
            FROM (
                SELECT UNNEST(REGEXP_MATCHES(content, '#[a-zA-Z0-9_]+', 'g')) as hashtag
                FROM posts
            ) hashtags
            WHERE LOWER(hashtag) LIKE $1
            GROUP BY LOWER(REGEXP_REPLACE(hashtag, '^#', ''))
            ORDER BY count DESC, tag ASC
            LIMIT 10
        `, [searchQuery]);

        res.json(result.rows.map(row => ({
            tag: row.tag,
            count: parseInt(row.count)
        })));
    } catch (error) {
        console.error('Error fetching hashtag suggestions:', error);
        res.status(500).json({ error: 'Failed to fetch hashtag suggestions' });
    }
});



// GET /api/autocomplete/users - Get user mention suggestions
router.get('/autocomplete/users', async (req, res) => {
    try {
        const { query } = req.query;

        // If query is empty, return any active users
        const searchQuery = query ? `%${query.toLowerCase()}%` : '%';
        const startQuery = query ? `${query.toLowerCase()}%` : '%';

        // Search for users by username or display name
        const result = await pool.query(`
            SELECT
                id,
                username,
                display_name,
                avatar_url
            FROM users
            WHERE
                status = 'active' AND
                (
                    LOWER(username) LIKE $1 OR
                    LOWER(display_name) LIKE $1
                )
            ORDER BY
                CASE 
                    WHEN LOWER(username) LIKE $2 THEN 1
                    WHEN LOWER(display_name) LIKE $2 THEN 2
                    ELSE 3
                END,
                username ASC
            LIMIT 10
        `, [searchQuery, startQuery]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user suggestions:', error);
        res.status(500).json({ error: 'Failed to fetch user suggestions' });
    }
});

// POST /api/email/send - Send email (for testing or notifications)
router.post('/email/send', async (req, res) => {
    try {
        const { to, template, ...args } = req.body;

        // Import email service
        const { sendEmail } = require('../services/email');

        if (!to || !template) {
            return res.status(400).json({ error: 'Email address and template are required' });
        }

        const result = await sendEmail(to, template, ...Object.values(args));

        if (result.success) {
            res.json({ message: 'Email sent successfully', messageId: result.messageId });
        } else {
            res.status(500).json({ error: 'Failed to send email', details: result.error });
        }
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

// ===== STATUS ENDPOINTS =====

// POST /api/statuses - Create a new status (expires in 12 hours)
router.post('/statuses', async (req, res) => {
    try {
        const { user_id, content } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Content is required' });
        }

        if (content.length > 280) {
            return res.status(400).json({ error: 'Content must be 280 characters or less' });
        }

        // Calculate expiration time (12 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 12);

        const query = `
      INSERT INTO statuses(user_id, content, expires_at)
VALUES($1, $2, $3)
RETURNING *
    `;

        const result = await pool.query(query, [user_id, content.trim(), expiresAt]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating status:', error);
        res.status(500).json({ error: 'Failed to create status' });
    }
});

// GET /api/statuses - Get all active statuses (not expired)
router.get('/statuses', async (req, res) => {
    try {
        const query = `
SELECT
s.id,
    s.content,
    s.created_at,
    s.expires_at,
    u.id as user_id,
    u.username,
    u.display_name,
    u.avatar_url
      FROM statuses s
      JOIN users u ON s.user_id = u.id
      WHERE s.expires_at > NOW()
      ORDER BY s.created_at DESC
    `;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching statuses:', error);
        res.status(500).json({ error: 'Failed to fetch statuses' });
    }
});

// GET /api/statuses/user/:userId - Get active statuses for a specific user
router.get('/statuses/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const query = `
SELECT
s.id,
    s.content,
    s.created_at,
    s.expires_at,
    u.id as user_id,
    u.username,
    u.display_name,
    u.avatar_url
      FROM statuses s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = $1 AND s.expires_at > NOW()
      ORDER BY s.created_at DESC
    `;

        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user statuses:', error);
        res.status(500).json({ error: 'Failed to fetch user statuses' });
    }
});

// DELETE /api/statuses/expired - Clean up expired statuses (can be called periodically)
router.delete('/statuses/expired', async (req, res) => {
    try {
        const query = 'DELETE FROM statuses WHERE expires_at <= NOW() RETURNING id';
        const result = await pool.query(query);

        res.json({
            message: 'Expired statuses deleted',
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error deleting expired statuses:', error);
        res.status(500).json({ error: 'Failed to delete expired statuses' });
    }
});

// ===== NOTIFICATIONS ENDPOINTS =====

// Helper function to create notification
async function createNotification(userId, type, actorId, postId = null, conversationId = null, message = null) {
    try {
        const query = `
            INSERT INTO notifications(user_id, type, actor_id, post_id, conversation_id, message)
VALUES($1, $2, $3, $4, $5, $6)
RETURNING *
    `;
        await pool.query(query, [userId, type, actorId, postId, conversationId, message]);
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

// GET /api/users/:id/notifications - Get user's notifications
router.get('/users/:id/notifications', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50 } = req.query;

        const query = `
SELECT
n.*,
    u.username as actor_username,
    u.display_name as actor_display_name,
    u.avatar_url as actor_avatar_url,
    p.content as post_content
            FROM notifications n
            LEFT JOIN users u ON n.actor_id = u.id
            LEFT JOIN posts p ON n.post_id = p.id
            WHERE n.user_id = $1
            ORDER BY n.created_at DESC
            LIMIT $2
    `;

        const result = await pool.query(query, [id, limit]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// POST /api/notifications/:id/read - Mark notification as read
router.post('/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query('UPDATE notifications SET read = TRUE WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// POST /api/notifications/read-all - Mark all notifications as read
router.post('/notifications/read-all', async (req, res) => {
    try {
        const { user_id } = req.body;

        await pool.query('UPDATE notifications SET read = TRUE WHERE user_id = $1', [user_id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});

// ===== MESSAGING ENDPOINTS =====

// GET /api/users/:id/conversations - Get user's conversations
router.get('/users/:id/conversations', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id);

        const query = `
SELECT
c.*,
    CASE 
                    WHEN c.user1_id = $1 THEN u2.id
                    ELSE u1.id
END as other_user_id,
    CASE 
                    WHEN c.user1_id = $1 THEN u2.username
                    ELSE u1.username
END as other_username,
    CASE 
                    WHEN c.user1_id = $1 THEN u2.display_name
                    ELSE u1.display_name
END as other_display_name,
    CASE 
                    WHEN c.user1_id = $1 THEN u2.avatar_url
                    ELSE u1.avatar_url
END as other_avatar_url,
    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
            FROM conversations c
            JOIN users u1 ON c.user1_id = u1.id
            JOIN users u2 ON c.user2_id = u2.id
WHERE(c.user1_id = $1 OR c.user2_id = $1)
            AND c.status = 'accepted'
            ORDER BY c.updated_at DESC
    `;

        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// GET /api/users/:id/message-requests - Get pending message requests
router.get('/users/:id/message-requests', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id);

        const query = `
SELECT
c.*,
    CASE 
                    WHEN c.user1_id = $1 THEN u2.id
                    ELSE u1.id
END as other_user_id,
    CASE 
                    WHEN c.user1_id = $1 THEN u2.username
                    ELSE u1.username
END as other_username,
    CASE 
                    WHEN c.user1_id = $1 THEN u2.display_name
                    ELSE u1.display_name
END as other_display_name,
    CASE 
                    WHEN c.user1_id = $1 THEN u2.avatar_url
                    ELSE u1.avatar_url
END as other_avatar_url
            FROM conversations c
            JOIN users u1 ON c.user1_id = u1.id
            JOIN users u2 ON c.user2_id = u2.id
            WHERE c.user2_id = $1
            AND c.status = 'pending'
            ORDER BY c.created_at DESC
        `;

        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching message requests:', error);
        res.status(500).json({ error: 'Failed to fetch message requests' });
    }
});

// POST /api/conversations - Create or get conversation
router.post('/conversations', async (req, res) => {
    try {
        const { user1_id, user2_id } = req.body;

        // Ensure user1_id < user2_id for uniqueness constraint
        const [smallerId, largerId] = user1_id < user2_id ? [user1_id, user2_id] : [user2_id, user1_id];

        // Check if conversation already exists
        let result = await pool.query(
            'SELECT * FROM conversations WHERE user1_id = $1 AND user2_id = $2',
            [smallerId, largerId]
        );

        if (result.rows.length > 0) {
            return res.json(result.rows[0]);
        }

        // Check if both users follow each other
        const followCheck = await pool.query(
            `SELECT
EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2) as user1_follows_user2,
    EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = $1) as user2_follows_user1
`,
            [user1_id, user2_id]
        );

        const { user1_follows_user2, user2_follows_user1 } = followCheck.rows[0];

        if (!user1_follows_user2 || !user2_follows_user1) {
            return res.status(403).json({ error: 'Both users must follow each other to start a conversation' });
        }

        // Create new conversation with encryption key
        const encryptionKey = generateEncryptionKey();

        result = await pool.query(
            `INSERT INTO conversations(user1_id, user2_id, encryption_key, status)
VALUES($1, $2, $3, 'pending')
RETURNING * `,
            [smallerId, largerId, encryptionKey]
        );

        const conversation = result.rows[0];

        // Create notification for the recipient
        const recipientId = user1_id === smallerId ? largerId : smallerId;
        await createNotification(recipientId, 'message_request', user1_id, null, conversation.id);

        res.json(conversation);
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

// POST /api/conversations/:id/accept - Accept message request
router.post('/conversations/:id/accept', async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            'UPDATE conversations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['accepted', id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error accepting conversation:', error);
        res.status(500).json({ error: 'Failed to accept conversation' });
    }
});

// GET /api/conversations/:id/messages - Get messages in a conversation
router.get('/conversations/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.query;

        // Verify user is part of conversation
        const convResult = await pool.query(
            'SELECT * FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
            [id, user_id]
        );

        if (convResult.rows.length === 0) {
            return res.status(403).json({ error: 'Not authorized to view this conversation' });
        }

        const conversation = convResult.rows[0];

        if (conversation.status !== 'accepted') {
            return res.status(403).json({ error: 'Conversation not accepted yet' });
        }

        // Get messages
        const messagesResult = await pool.query(
            `SELECT m.*, u.username, u.display_name, u.avatar_url
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.conversation_id = $1
             ORDER BY m.created_at ASC`,
            [id]
        );

        // Decrypt messages
        const messages = messagesResult.rows.map(msg => ({
            ...msg,
            content: decrypt(msg.encrypted_content, conversation.encryption_key),
            encrypted_content: undefined
        }));

        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /api/conversations/:id/messages - Send a message
router.post('/conversations/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        const { sender_id, content } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Verify conversation exists and user is part of it
        const convResult = await pool.query(
            'SELECT * FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2) AND status = $3',
            [id, sender_id, 'accepted']
        );

        if (convResult.rows.length === 0) {
            return res.status(403).json({ error: 'Not authorized or conversation not accepted' });
        }

        const conversation = convResult.rows[0];

        // Encrypt message
        const encryptedContent = encrypt(content, conversation.encryption_key);

        // Save message
        const result = await pool.query(
            `INSERT INTO messages(conversation_id, sender_id, encrypted_content)
VALUES($1, $2, $3)
RETURNING * `,
            [id, sender_id, encryptedContent]
        );

        // Update conversation timestamp
        await pool.query(
            'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// DEBUG: Check what LLM sees for a user
router.get('/debug/llm/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { loadAnalysis } = require('../utils/llm-storage');

        // Get user's actual activity
        const likes = await pool.query('SELECT p.content FROM posts p JOIN likes l ON p.id = l.post_id WHERE l.user_id = $1 ORDER BY l.created_at DESC LIMIT 20', [userId]);
        const reposts = await pool.query('SELECT p.content FROM posts p JOIN reposts r ON p.id = r.post_id WHERE r.user_id = $1 ORDER BY r.created_at DESC LIMIT 10', [userId]);
        const ownPosts = await pool.query('SELECT content FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [userId]);

        // Get LLM analysis
        const recommendations = await loadRecommendations(userId);
        const userAnalysis = await loadAnalysis(userId);

        res.json({
            userId,
            actualActivity: {
                recentLikes: likes.rows.map(r => r.content),
                recentReposts: reposts.rows.map(r => r.content),
                recentPosts: ownPosts.rows.map(r => r.content)
            },
            llmAnalysis: userAnalysis,
            recommendations: recommendations ? {
                count: recommendations.postIds?.length || 0,
                generated: recommendations.generatedAt
            } : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// GET /api/settings/registration - Check if registration is enabled
router.get('/settings/registration', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT setting_value FROM system_settings WHERE setting_key = 'registration_enabled'"
        );
        const enabled = result.rows[0]?.setting_value === 'true';
        res.json({ enabled });
    } catch (error) {
        console.error('Error fetching registration setting:', error);
        res.status(500).json({ error: 'Failed to fetch setting' });
    }
});

// POST /api/posts/:id/report - Report a post
router.post('/posts/:id/report', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, reason, description } = req.body;

        await pool.query(
            'INSERT INTO reports (post_id, reporter_id, reason, description) VALUES ($1, $2, $3, $4)',
            [id, user_id, reason, description || null]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error reporting post:', error);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

// POST /api/users/:id/mute - Mute a user
router.post('/users/:id/mute', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        // Prevent self-muting
        if (id == user_id) {
            return res.status(400).json({ error: 'Cannot mute yourself' });
        }

        await pool.query(
            'INSERT INTO muted_users (user_id, muted_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [user_id, id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error muting user:', error);
        res.status(500).json({ error: 'Failed to mute user' });
    }
});

// DELETE /api/users/:id/mute - Unmute a user
router.delete('/users/:id/mute', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.query;

        await pool.query(
            'DELETE FROM muted_users WHERE user_id = $1 AND muted_user_id = $2',
            [user_id, id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error unmuting user:', error);
        res.status(500).json({ error: 'Failed to unmute user' });
    }
});

// GET /api/users/:id/muted - Get list of muted users
router.get('/users/:id/muted', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT u.id, u.username, u.display_name, u.avatar_url
             FROM muted_users m
             JOIN users u ON m.muted_user_id = u.id
             WHERE m.user_id = $1
             ORDER BY m.created_at DESC`,
            [id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching muted users:', error);
        res.status(500).json({ error: 'Failed to fetch muted users' });
    }
});

// POST /api/posts/:id/view - Track post view
router.post('/posts/:id/view', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        // Insert or ignore if already viewed
        await pool.query(
            'INSERT INTO post_views (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [user_id, id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking post view:', error);
        res.status(500).json({ error: 'Failed to track view' });
    }
});

// ===== MESSAGING ENDPOINTS =====

// GET /api/conversations - Get all conversations for a user
router.get('/conversations', async (req, res) => {
    try {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }

        const result = await pool.query(`
            SELECT 
                c.id,
                c.user1_id,
                c.user2_id,
                c.encryption_key,
                c.created_at,
                c.updated_at,
                u1.username as user1_username,
                u1.display_name as user1_display_name,
                u1.avatar_url as user1_avatar,
                u2.username as user2_username,
                u2.display_name as user2_display_name,
                u2.avatar_url as user2_avatar,
                (SELECT encrypted_content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != $1 AND read_at IS NULL) as unread_count
            FROM conversations c
            JOIN users u1 ON c.user1_id = u1.id
            JOIN users u2 ON c.user2_id = u2.id
            WHERE c.user1_id = $1 OR c.user2_id = $1
            ORDER BY c.updated_at DESC
        `, [user_id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// POST /api/conversations - Start a new conversation
router.post('/conversations', async (req, res) => {
    try {
        const { user1_id, user2_id } = req.body;

        if (!user1_id || !user2_id) {
            return res.status(400).json({ error: 'user1_id and user2_id are required' });
        }

        if (user1_id === user2_id) {
            return res.status(400).json({ error: 'Cannot create conversation with yourself' });
        }

        // Ensure user1_id < user2_id for consistent ordering
        const [smallerId, largerId] = user1_id < user2_id ? [user1_id, user2_id] : [user2_id, user1_id];

        // Check if conversation already exists
        const existing = await pool.query(
            'SELECT id, encryption_key FROM conversations WHERE user1_id = $1 AND user2_id = $2',
            [smallerId, largerId]
        );

        if (existing.rows.length > 0) {
            return res.json(existing.rows[0]);
        }

        // Generate encryption key (random string)
        const crypto = require('crypto');
        const encryption_key = crypto.randomBytes(32).toString('hex');

        // Create new conversation
        const result = await pool.query(
            `INSERT INTO conversations (user1_id, user2_id, encryption_key, status) 
             VALUES ($1, $2, $3, 'active') 
             RETURNING id, encryption_key`,
            [smallerId, largerId, encryption_key]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

// GET /api/conversations/:id/messages - Get messages in a conversation
router.get('/conversations/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }

        // Verify user is part of conversation
        const conversation = await pool.query(
            'SELECT user1_id, user2_id, encryption_key FROM conversations WHERE id = $1',
            [id]
        );

        if (conversation.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const { user1_id, user2_id, encryption_key } = conversation.rows[0];
        if (user1_id != user_id && user2_id != user_id) {
            return res.status(403).json({ error: 'Not authorized to view this conversation' });
        }

        // Get messages
        const messages = await pool.query(`
            SELECT 
                m.id,
                m.conversation_id,
                m.sender_id,
                m.encrypted_content,
                m.created_at,
                m.read_at,
                u.username,
                u.display_name,
                u.avatar_url
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = $1
            ORDER BY m.created_at ASC
        `, [id]);

        res.json({
            encryption_key,
            messages: messages.rows
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /api/conversations/:id/messages - Send a message
router.post('/conversations/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        const { sender_id, encrypted_content } = req.body;

        if (!sender_id || !encrypted_content) {
            return res.status(400).json({ error: 'sender_id and encrypted_content are required' });
        }

        // Verify user is part of conversation
        const conversation = await pool.query(
            'SELECT user1_id, user2_id FROM conversations WHERE id = $1',
            [id]
        );

        if (conversation.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const { user1_id, user2_id } = conversation.rows[0];
        if (user1_id != sender_id && user2_id != sender_id) {
            return res.status(403).json({ error: 'Not authorized to send messages in this conversation' });
        }

        // Insert message
        const result = await pool.query(
            `INSERT INTO messages (conversation_id, sender_id, encrypted_content) 
             VALUES ($1, $2, $3) 
             RETURNING id, conversation_id, sender_id, encrypted_content, created_at, read_at`,
            [id, sender_id, encrypted_content]
        );

        // Update conversation updated_at
        await pool.query(
            'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// PUT /api/conversations/:conversationId/messages/:messageId/read - Mark message as read
router.put('/conversations/:conversationId/messages/:messageId/read', async (req, res) => {
    try {
        const { conversationId, messageId } = req.params;
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }

        // Verify user is recipient (not sender)
        const message = await pool.query(
            'SELECT sender_id FROM messages WHERE id = $1 AND conversation_id = $2',
            [messageId, conversationId]
        );

        if (message.rows.length === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }

        if (message.rows[0].sender_id == user_id) {
            return res.status(400).json({ error: 'Cannot mark own message as read' });
        }

        // Mark as read
        await pool.query(
            'UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE id = $1 AND read_at IS NULL',
            [messageId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ error: 'Failed to mark message as read' });
    }
});

// POST /api/conversations/:id/typing - Send typing indicator (no-op for now, can be enhanced with WebSocket)
router.post('/conversations/:id/typing', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, is_typing } = req.body;

        // For now, just return success
        // In a real implementation, this would broadcast via WebSocket
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending typing indicator:', error);
        res.status(500).json({ error: 'Failed to send typing indicator' });
    }
});

// ===== SOCIAL FEATURE ENDPOINTS =====

// GET /api/social/matches - Get mutual followers (users who follow each other)
router.get('/social/matches', async (req, res) => {
    try {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Find users where both follow each other
        const query = `
            SELECT DISTINCT
                u.id,
                u.username,
                u.display_name,
                u.avatar_url,
                u.bio
            FROM users u
            WHERE u.id IN (
                -- Users that current user follows AND who follow current user back
                SELECT f1.following_id
                FROM follows f1
                WHERE f1.follower_id = $1
                AND EXISTS (
                    SELECT 1 FROM follows f2
                    WHERE f2.follower_id = f1.following_id
                    AND f2.following_id = $1
                )
            )
            ORDER BY u.display_name ASC
        `;

        const result = await pool.query(query, [user_id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching social matches:', error);
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

// POST /api/social/posts - Create a mini post (max 50 characters)
router.post('/social/posts', async (req, res) => {
    try {
        const { user_id, content } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Content is required' });
        }

        if (content.length > 50) {
            return res.status(400).json({ error: 'Content must be 50 characters or less' });
        }

        const query = `
            INSERT INTO social_posts (user_id, content)
            VALUES ($1, $2)
            RETURNING *
        `;

        const result = await pool.query(query, [user_id, content.trim()]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating social post:', error);
        res.status(500).json({ error: 'Failed to create social post' });
    }
});

// GET /api/social/feed - Get social feed (mini posts from matched users)
router.get('/social/feed', async (req, res) => {
    try {
        const { user_id, limit = 50, offset = 0 } = req.query;

        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);

        // Get posts from mutual followers
        const query = `
            SELECT 
                sp.id,
                sp.content,
                sp.created_at,
                u.id as user_id,
                u.username,
                u.display_name,
                u.avatar_url
            FROM social_posts sp
            JOIN users u ON sp.user_id = u.id
            WHERE sp.user_id IN (
                -- Get mutual followers
                SELECT f1.following_id
                FROM follows f1
                WHERE f1.follower_id = $1
                AND EXISTS (
                    SELECT 1 FROM follows f2
                    WHERE f2.follower_id = f1.following_id
                    AND f2.following_id = $1
                )
            )
            OR sp.user_id = $1  -- Include own posts
            ORDER BY sp.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await pool.query(query, [user_id, limitNum, offsetNum]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching social feed:', error);
        res.status(500).json({ error: 'Failed to fetch social feed' });
    }
});

// GET /api/social/posts/:userId - Get a specific user's social posts
router.get('/social/posts/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { current_user_id, limit = 20, offset = 0 } = req.query;

        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);

        // Check if users are matched (mutual followers)
        if (current_user_id && userId !== current_user_id) {
            const matchQuery = `
                SELECT 1 FROM follows f1
                WHERE f1.follower_id = $1 AND f1.following_id = $2
                AND EXISTS (
                    SELECT 1 FROM follows f2
                    WHERE f2.follower_id = $2 AND f2.following_id = $1
                )
            `;
            const matchResult = await pool.query(matchQuery, [current_user_id, userId]);

            if (matchResult.rows.length === 0) {
                return res.status(403).json({ error: 'Can only view posts from matched users' });
            }
        }

        const query = `
            SELECT 
                sp.id,
                sp.content,
                sp.created_at,
                u.id as user_id,
                u.username,
                u.display_name,
                u.avatar_url
            FROM social_posts sp
            JOIN users u ON sp.user_id = u.id
            WHERE sp.user_id = $1
            ORDER BY sp.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await pool.query(query, [userId, limitNum, offsetNum]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user social posts:', error);
        res.status(500).json({ error: 'Failed to fetch social posts' });
    }
});

// DELETE /api/social/posts/:id - Delete a social post
router.delete('/social/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Verify ownership
        const checkQuery = 'SELECT user_id FROM social_posts WHERE id = $1';
        const checkResult = await pool.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Social post not found' });
        }

        if (checkResult.rows[0].user_id != user_id) {
            return res.status(403).json({ error: 'Not authorized to delete this post' });
        }

        // Delete the post
        await pool.query('DELETE FROM social_posts WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting social post:', error);
        res.status(500).json({ error: 'Failed to delete social post' });
    }
});

// POST /api/ai/explain - Explain a post using Ollama
router.post('/ai/explain', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Content is required' });

        const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

        const prompt = `Explain this social media post in simple terms, as if you were explaining it to a friend. Keep it concise (max 2-3 sentences). Post content: "${content}"`;

        const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
            model: OLLAMA_MODEL,
            prompt: prompt,
            stream: false
        });

        if (response.data && response.data.response) {
            res.json({ explanation: response.data.response });
        } else {
            throw new Error('Invalid response from Ollama');
        }

    } catch (error) {
        console.error('Error explaining post:', error);
        res.status(500).json({ error: 'Failed to generate explanation. Is Ollama running?' });
    }
});

// ===== SMART RECOMMENDATIONS =====

// POST /api/posts/:id/mark-viewed - Mark a post as viewed
router.post('/posts/:id/mark-viewed', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Insert view record (ignore if already exists)
        await pool.query(`
            INSERT INTO user_post_views (user_id, post_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, post_id) DO NOTHING
        `, [user_id, id]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking post as viewed:', error);
        res.status(500).json({ error: 'Failed to mark post as viewed' });
    }
});

// POST /api/preferences/update - Update user preferences based on interaction
router.post('/preferences/update', async (req, res) => {
    try {
        const { user_id, post_id, interaction_type } = req.body;

        if (!user_id || !post_id) {
            return res.status(400).json({ error: 'User ID and Post ID are required' });
        }

        // Get post details to extract topics and author
        const postResult = await pool.query(`
            SELECT content, user_id as author_id
            FROM posts
            WHERE id = $1
        `, [post_id]);

        if (postResult.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const post = postResult.rows[0];

        // Extract hashtags from content
        const hashtagRegex = /#(\w+)/g;
        const hashtags = [];
        let match;
        while ((match = hashtagRegex.exec(post.content)) !== null) {
            hashtags.push(match[1].toLowerCase());
        }

        // Get or create user preferences
        const prefsResult = await pool.query(`
            INSERT INTO user_preferences (user_id, liked_topics, liked_users, interaction_count)
            VALUES ($1, '[]'::jsonb, '[]'::jsonb, 0)
            ON CONFLICT (user_id) DO NOTHING
            RETURNING *
        `, [user_id]);

        // Update preferences
        await pool.query(`
            UPDATE user_preferences
            SET 
                liked_topics = (
                    SELECT jsonb_agg(DISTINCT elem)
                    FROM jsonb_array_elements_text(
                        liked_topics || $2::jsonb
                    ) elem
                    LIMIT 50
                ),
                liked_users = (
                    SELECT jsonb_agg(DISTINCT elem)
                    FROM jsonb_array_elements_text(
                        CASE 
                            WHEN liked_users ? $3::text THEN liked_users
                            ELSE liked_users || jsonb_build_array($3)
                        END
                    ) elem
                    LIMIT 30
                ),
                interaction_count = interaction_count + 1,
                last_updated = CURRENT_TIMESTAMP
            WHERE user_id = $1
        `, [user_id, JSON.stringify(hashtags), post.author_id.toString()]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

module.exports = { router, setPool };
