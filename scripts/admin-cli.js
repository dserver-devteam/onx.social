require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
});

const command = process.argv[2];
const subCommand = process.argv[3];
const username = process.argv[4];

async function main() {
    if (command === 'user' && subCommand === 'add' && username) {
        try {
            const res = await pool.query('UPDATE users SET role = $1 WHERE username = $2 RETURNING *', ['admin', username]);
            if (res.rows.length > 0) {
                console.log(`User ${username} is now an admin.`);
            } else {
                console.log(`User ${username} not found.`);
            }
        } catch (err) {
            console.error('Error updating user:', err);
        }
    } else {
        console.log('Usage: node scripts/admin-cli.js user add <username>');
    }
    pool.end();
}

main();
