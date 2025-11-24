-- Add messaging tables for encrypted direct messages
-- Messages are encrypted but support can decrypt with the encryption_key

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encryption_key VARCHAR(255) NOT NULL, -- Key for support to decrypt messages
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user1_id, user2_id),
    CHECK (user1_id < user2_id) -- Ensure consistent ordering
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_content TEXT NOT NULL, -- Encrypted message content
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP -- When message was read (for read receipts)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN conversations.encryption_key IS 'Encryption key for support staff to decrypt messages';
COMMENT ON COLUMN messages.encrypted_content IS 'AES encrypted message content';
COMMENT ON COLUMN messages.read_at IS 'Timestamp when message was read by recipient';
