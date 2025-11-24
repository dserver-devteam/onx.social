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

async function testSimilarity() {
    try {
        const query = 'foud';
        const text = 'I love delicious food and drinks';

        console.log(`Query: "${query}"`);
        console.log(`Text: "${text}"`);

        const res = await pool.query(`
            SELECT 
                similarity($1, $2) as standard_similarity,
                word_similarity($1, $2) as word_sim,
                strict_word_similarity($1, $2) as strict_word_sim,
                $2 <-> $1 as distance
        `, [query, text]);

        console.log('Results:', res.rows[0]);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        pool.end();
    }
}

testSimilarity();
