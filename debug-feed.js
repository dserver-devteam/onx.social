require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

async function debug() {
    try {
        console.log('🌱 Seeding User 6 profile for FOOD...');
        await pool.query(`
            UPDATE users 
            SET interest_profile = '{"lifestyle": 1.0, "creative": 0.5}'::jsonb 
            WHERE id = 6
        `);
        console.log('✅ User 6 profile updated (Food/Lifestyle)');

        console.log('🔍 Inspecting User 6...');
        const userRes = await pool.query('SELECT id, username, interest_profile FROM users WHERE id = 6');
        console.log('User Profile:', JSON.stringify(userRes.rows[0], null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

debug();
