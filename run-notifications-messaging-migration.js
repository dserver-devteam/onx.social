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
        console.log('Running notifications and messaging migration...');

        // Create notifications table
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL CHECK (type IN ('like', 'repost', 'reply', 'follow', 'message_request', 'message_unlock')),
                actor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
                conversation_id INTEGER,
                message TEXT,
                read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created notifications table');

        // Create conversations table
        await client.query(`
            CREATE TABLE IF NOT EXISTS conversations (
                id SERIAL PRIMARY KEY,
                user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
                encryption_key TEXT NOT NULL,
                unlocked_by_support BOOLEAN DEFAULT FALSE,
                unlocked_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user1_id, user2_id),
                CHECK (user1_id < user2_id)
            )
        `);
        console.log('✅ Created conversations table');

        // Create messages table
        await client.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                encrypted_content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created messages table');

        // Create indexes
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)`);
        console.log('✅ Created indexes for notifications table');

        await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON conversations(user1_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON conversations(user2_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status)`);
        console.log('✅ Created indexes for conversations table');

        await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC)`);
        console.log('✅ Created indexes for messages table');

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
