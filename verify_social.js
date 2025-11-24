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

async function verifySocialTab() {
    try {
        console.log('🧪 Verifying Social Tab (Friends Hub)...');

        // 1. Create Test Users
        console.log('\n👤 Creating test users...');
        const user1 = await createUser('user1_social');
        const user2 = await createUser('user2_social'); // Mutual
        const user3 = await createUser('user3_social'); // Followed but not mutual

        console.log(`   Created: ${user1.username} (ID: ${user1.id})`);
        console.log(`   Created: ${user2.username} (ID: ${user2.id})`);
        console.log(`   Created: ${user3.username} (ID: ${user3.id})`);

        // 2. Setup Relationships
        console.log('\n🔗 Setting up relationships...');
        // User 1 <-> User 2 (Mutual)
        await follow(user1.id, user2.id);
        await follow(user2.id, user1.id);
        console.log('   User 1 <-> User 2 (Mutual)');

        // User 1 -> User 3 (One-way)
        await follow(user1.id, user3.id);
        console.log('   User 1 -> User 3 (One-way)');

        // 3. Create Posts
        console.log('\n📝 Creating posts...');
        const post2 = await createPost(user2.id, 'Post from Mutual Friend');
        const post3 = await createPost(user3.id, 'Post from One-way Follow');
        console.log(`   User 2 posted: "${post2.content}"`);
        console.log(`   User 3 posted: "${post3.content}"`);

        // 4. Fetch Social Feed for User 1
        console.log('\n📉 Fetching Social Feed for User 1...');
        // We need to mock the request or just run the query logic directly?
        // Let's run the query logic directly to verify the SQL.

        const query = `
            WITH Mutuals AS (
                SELECT f1.following_id as user_id
                FROM follows f1
                JOIN follows f2 ON f1.following_id = f2.follower_id
                WHERE f1.follower_id = $1 AND f2.following_id = $1
            )
            SELECT p.content, u.username
            FROM posts p
            JOIN Mutuals m ON p.user_id = m.user_id
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        `;

        const res = await pool.query(query, [user1.id]);

        console.log('\n📊 Feed Results:');
        res.rows.forEach(row => {
            console.log(`   - @${row.username}: "${row.content}"`);
        });

        // Verification
        const hasMutual = res.rows.some(r => r.username === user2.username);
        const hasOneWay = res.rows.some(r => r.username === user3.username);

        if (hasMutual && !hasOneWay) {
            console.log('\n✅ SUCCESS: Feed contains mutuals only!');
        } else {
            console.log('\n❌ FAILURE: Feed content is incorrect.');
            if (!hasMutual) console.log('   - Missing mutual post');
            if (hasOneWay) console.log('   - Contains one-way post (should not)');
        }

        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await pool.query('DELETE FROM posts WHERE id IN ($1, $2)', [post2.id, post3.id]);
        await pool.query('DELETE FROM follows WHERE follower_id IN ($1, $2, $3) OR following_id IN ($1, $2, $3)', [user1.id, user2.id, user3.id]);
        await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [user1.id, user2.id, user3.id]);

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        await pool.end();
    }
}

async function createUser(username) {
    const res = await pool.query(`
        INSERT INTO users (username, email, password_hash, display_name)
        VALUES ($1, $2, 'hash', $1)
        RETURNING id, username
    `, [username + Date.now(), `${username}_${Date.now()}@test.com`]);
    return res.rows[0];
}

async function follow(follower, following) {
    await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [follower, following]);
}

async function createPost(userId, content) {
    const res = await pool.query('INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING id, content', [userId, content]);
    return res.rows[0];
}

verifySocialTab();
