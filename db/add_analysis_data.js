const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        console.log('🔄 Starting schema migration for Personalized Feed...');

        // 1. Add analysis_data column to posts table
        console.log('  Adding analysis_data column to posts table...');
        await pool.query(`
            ALTER TABLE posts 
            ADD COLUMN IF NOT EXISTS analysis_data JSONB DEFAULT NULL;
        `);

        // 2. Create an index on analysis_data for faster querying (optional but good for future)
        console.log('  Creating GIN index on analysis_data...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_posts_analysis_data ON posts USING GIN (analysis_data);
        `);

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

runMigration();
