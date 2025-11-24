require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

async function migrate() {
    try {
        console.log('🔌 Connecting to database...');
        const client = await pool.connect();
        console.log('✅ Connected.');

        console.log('🔄 Adding themes column to posts...');
        await client.query(`
            ALTER TABLE posts 
            ADD COLUMN IF NOT EXISTS themes JSONB DEFAULT '{}'::jsonb;
        `);
        console.log('✅ Added themes column.');

        console.log('🔄 Adding interest_profile column to users...');
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS interest_profile JSONB DEFAULT '{}'::jsonb;
        `);
        console.log('✅ Added interest_profile column.');

        // Create index for faster querying
        console.log('🔄 Creating GIN index on themes...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_posts_themes ON posts USING gin (themes);
        `);
        console.log('✅ Created index.');

        client.release();
        console.log('✨ Migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
