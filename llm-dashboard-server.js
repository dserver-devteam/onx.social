require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const { loadRecommendations, loadAnalysis, loadQueueState, saveQueueState } = require('./utils/llm-storage');

const app = express();
const PORT = process.env.LLM_DASHBOARD_PORT || 3044;

// Database pool
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

// Basic authentication middleware
const basicAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="LLM Dashboard"');
        return res.status(401).send('Authentication required');
    }

    const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const username = auth[0];
    const password = auth[1];

    const validUsername = process.env.LLM_DASHBOARD_USER || 'admin';
    const validPassword = process.env.LLM_DASHBOARD_PASSWORD || 'admin';

    if (username === validUsername && password === validPassword) {
        next();
    } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="LLM Dashboard"');
        return res.status(401).send('Invalid credentials');
    }
};

// Apply auth to all routes
app.use(basicAuth);
app.use(express.json());

// Serve static dashboard page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'llm-dashboard.html'));
});

// API: Get processing queue
app.get('/api/queue', async (req, res) => {
    try {
        const queue = await loadQueueState();
        res.json(queue);
    } catch (error) {
        console.error('Error getting queue:', error);
        res.status(500).json({ error: 'Failed to get queue' });
    }
});

// API: Get recent jobs (last 24 hours)
app.get('/api/jobs/recent', async (req, res) => {
    try {
        const queue = await loadQueueState();
        const completed = queue.filter(j => j.status === 'completed');
        const recent = completed.slice(-20).reverse(); // Last 20 completed jobs
        res.json(recent);
    } catch (error) {
        console.error('Error getting recent jobs:', error);
        res.status(500).json({ error: 'Failed to get recent jobs' });
    }
});

// API: Get user analysis
app.get('/api/user/:id/analysis', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const analysis = await loadAnalysis(userId);

        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }

        res.json(analysis);
    } catch (error) {
        console.error('Error getting user analysis:', error);
        res.status(500).json({ error: 'Failed to get analysis' });
    }
});

// API: Get user recommendations
app.get('/api/user/:id/recommendations', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const recommendations = await loadRecommendations(userId);

        if (!recommendations) {
            return res.status(404).json({ error: 'Recommendations not found' });
        }

        res.json(recommendations);
    } catch (error) {
        console.error('Error getting recommendations:', error);
        res.status(500).json({ error: 'Failed to get recommendations' });
    }
});

// API: Get system stats
app.get('/api/stats', async (req, res) => {
    try {
        const queue = await loadQueueState();

        const stats = {
            totalJobs: queue.length,
            pending: queue.filter(j => j.status === 'pending').length,
            processing: queue.filter(j => j.status === 'processing').length,
            completed: queue.filter(j => j.status === 'completed').length,
            failed: queue.filter(j => j.status === 'failed').length
        };

        res.json(stats);
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// API: Search users
app.get('/api/users/search', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Query required' });
        }

        const query = `
            SELECT id, username, display_name
            FROM users
            WHERE username ILIKE $1 OR display_name ILIKE $1
            LIMIT 10
        `;

        const result = await pool.query(query, [`%${q}%`]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

// API: Manually trigger analysis for a user
app.post('/api/user/:id/trigger', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // Verify user exists
        const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Load current queue
        const queue = await loadQueueState();

        // Check if already in queue
        if (queue.some(j => j.userId === userId)) {
            return res.status(400).json({ error: 'User already in queue' });
        }

        // Add to queue with high priority (manual trigger)
        queue.unshift({
            userId,
            status: 'pending',
            addedAt: new Date().toISOString(),
            manual: true,
            triggeredBy: 'dashboard'
        });

        await saveQueueState(queue);

        res.json({
            success: true,
            message: `User ${userId} added to processing queue`,
            position: 1
        });
    } catch (error) {
        console.error('Error triggering analysis:', error);
        res.status(500).json({ error: 'Failed to trigger analysis' });
    }
});

// API: Reanalyze all posts
app.post('/api/posts/reanalyze-all', async (req, res) => {
    try {
        console.log('[Dashboard] Triggering reanalysis of all posts...');

        // 1. Get all posts without themes (or all posts if forced)
        const result = await pool.query('SELECT id, content FROM posts ORDER BY created_at DESC');
        const posts = result.rows;

        console.log(`[Dashboard] Found ${posts.length} posts to analyze`);

        // 2. Add to queue
        const queue = await loadQueueState();
        let addedCount = 0;

        for (const post of posts) {
            // Check if already in queue
            const exists = queue.some(j => j.type === 'analyze_post' && j.postId === post.id);
            if (!exists) {
                queue.push({
                    id: `post_${post.id}_${Date.now()}`,
                    type: 'analyze_post',
                    postId: post.id,
                    content: post.content,
                    status: 'pending',
                    addedAt: new Date().toISOString()
                });
                addedCount++;
            }
        }

        await saveQueueState(queue);
        console.log(`[Dashboard] Added ${addedCount} posts to analysis queue`);

        res.json({
            success: true,
            total: posts.length,
            added: addedCount,
            message: `Queued ${addedCount} posts for analysis`
        });
    } catch (error) {
        console.error('Error triggering reanalysis:', error);
        res.status(500).json({ error: 'Failed to trigger reanalysis' });
    }
});

// API: Get all discovered themes
app.get('/api/themes', async (req, res) => {
    try {
        const query = `
            SELECT 
                key as theme,
                COUNT(*) as post_count,
                ROUND(AVG((value::text)::numeric), 2) as avg_score
            FROM posts, jsonb_each(themes)
            WHERE themes IS NOT NULL AND themes != '{}'::jsonb
            GROUP BY key
            ORDER BY post_count DESC, avg_score DESC
        `;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error getting themes:', error);
        res.status(500).json({ error: 'Failed to get themes' });
    }
});

// API: Clear failed jobs from queue
app.post('/api/queue/clear-failed', async (req, res) => {
    try {
        const queue = await loadQueueState();
        const before = queue.length;
        const cleaned = queue.filter(j => j.status !== 'failed');
        await saveQueueState(cleaned);

        console.log(`[Dashboard] Cleared ${before - cleaned.length} failed jobs`);
        res.json({
            removed: before - cleaned.length,
            remaining: cleaned.length
        });
    } catch (error) {
        console.error('Error clearing failed jobs:', error);
        res.status(500).json({ error: 'Failed to clear failed jobs' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🎛️  LLM Dashboard running on http://localhost:${PORT}`);
    console.log(`👤 Username: ${process.env.LLM_DASHBOARD_USER || 'admin'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    pool.end(() => {
        console.log('Database pool closed');
        process.exit(0);
    });
});
