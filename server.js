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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Analytics middleware (tracks page views automatically)
app.use(analyticsMiddleware);

// Serve static files with cache control
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, path) => {
        // Disable caching for JS and CSS files to ensure latest version is always loaded
        if (path.endsWith('.js') || path.endsWith('.css')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// API routes
app.use('/api', apiRouter);
app.use('/auth', authRouter);
app.use('/upload', require('./routes/upload'));

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Auth routes (Frontend)
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/verify-email', (req, res) => {
    res.sendFile(path.join(__dirname, 'verify-email.html'));
});

app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'forgot-password.html'));
});

app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'reset-password.html'));
});

// Post detail route
app.get('/post/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'post.html'));
});

// Profile route
app.get('/profile/:username', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Hashtag route
app.get('/hashtag/:tag', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 N.Social server running on http://localhost:${PORT}`);
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
