const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
});

async function checkExtension() {
    try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        console.log('✅ pg_trgm extension enabled successfully');

        // Test it
        const res = await pool.query("SELECT similarity('food', 'fud') as score");
        console.log('Test similarity score (food vs fud):', res.rows[0].score);
    } catch (err) {
        console.error('❌ Failed to enable pg_trgm:', err.message);
    } finally {
        pool.end();
    }
}

checkExtension();
