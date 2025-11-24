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
        console.log('🚀 Starting Social feature migration...');

        await client.query('BEGIN');

        // Create social_posts table
        console.log('Creating social_posts table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS social_posts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created social_posts table');

        // Create indexes
        console.log('Creating indexes...');
        await client.query(`CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON social_posts(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON social_posts(created_at DESC)`);
        console.log('✅ Created indexes');

        await client.query('COMMIT');
        console.log('✅ Social feature migration completed successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration().catch(console.error);
