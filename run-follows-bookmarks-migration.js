const { Pool } = require('pg');
require('dotenv').config();

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

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('Running follows and bookmarks migration...');

        // Create follows table
        await client.query(`
            CREATE TABLE IF NOT EXISTS follows (
                id SERIAL PRIMARY KEY,
                follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(follower_id, following_id),
                CHECK (follower_id != following_id)
            )
        `);
        console.log('✅ Created follows table');

        // Create bookmarks table
        await client.query(`
            CREATE TABLE IF NOT EXISTS bookmarks (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, post_id)
            )
        `);
        console.log('✅ Created bookmarks table');

        // Create indexes for follows
        await client.query(`CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at DESC)`);
        console.log('✅ Created indexes for follows table');

        // Create indexes for bookmarks
        await client.query(`CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON bookmarks(post_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at DESC)`);
        console.log('✅ Created indexes for bookmarks table');

        // Create GIN index for hashtag searching
        await client.query(`CREATE INDEX IF NOT EXISTS idx_posts_content_hashtags ON posts USING gin(to_tsvector('english', content))`);
        console.log('✅ Created GIN index for hashtag searching');

        console.log('\n🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration().catch(console.error);
