require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');
const { router: apiRouter, setPool } = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Test database connection and create tables
(async () => {
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('✅ Database connected successfully at:', new Date().toISOString());

        // Create smart recommendation tables if they don't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_post_views (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, post_id)
            );
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_user_views ON user_post_views(user_id, viewed_at DESC);
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_post_views ON user_post_views(post_id);
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                liked_topics JSONB DEFAULT '[]',
                liked_users JSONB DEFAULT '[]',
                interaction_count INTEGER DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_liked_topics ON user_preferences USING GIN (liked_topics);
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_liked_users ON user_preferences USING GIN (liked_users);
        `);

        console.log('✅ Smart recommendation tables ready');
    } catch (error) {
        console.error('❌ Database error:', error.message);
    }
})();

// Set pool for API routes
const { router: authRouter, setPool: setAuthPool } = require('./routes/auth');
const { setPool: setLLMPool } = require('./utils/llm-recommender');
const { analyticsMiddleware } = require('./utils/analytics');
setPool(pool);
setAuthPool(pool);
setLLMPool(pool);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Analytics middleware (tracks page views automatically)
app.use(analyticsMiddleware);

// Serve static files with cache control
// Serve static files from React build
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Serve uploads if they exist locally
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api', apiRouter);
app.use('/auth', authRouter);
app.use('/upload', require('./routes/upload'));
app.use('/api/proxy', require('./routes/proxy'));

// Channels routes with pool middleware
const channelsRouter = require('./routes/channels');
app.use('/api', (req, res, next) => {
    req.pool = pool;
    next();
}, channelsRouter);

// Stories routes with pool middleware
const storiesRouter = require('./routes/stories');
app.use('/api', (req, res, next) => {
    req.pool = pool;
    next();
}, storiesRouter);

// Trending routes with pool middleware
const trendingRouter = require('./routes/trending');
app.use('/api', (req, res, next) => {
    req.pool = pool;
    next();
}, trendingRouter);

// Messages routes with pool middleware
const { router: messagesRouter, setPool: setMessagesPool } = require('./routes/messages');
setMessagesPool(pool);
app.use('/api/messages', messagesRouter);


// Serve index.html for root route
// SPA Fallback - Serve index.html for all other routes
app.get('*', (req, res) => {
    // Don't intercept API routes (though they should be handled above)
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 RealTalk server running on http://localhost:${PORT}`);
    console.log(`📊 Database: ${process.env.DB_NAME}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    pool.end(() => {
        console.log('Database pool closed');
        process.exit(0);
    });
});
