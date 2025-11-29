-- Migration: Add Update Channels Feature
-- Description: Adds tables for announcement/update channels (game releases, etc.)

-- Update channels table
CREATE TABLE IF NOT EXISTS update_channels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    avatar_url TEXT,
    follower_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Channel followers table
CREATE TABLE IF NOT EXISTS channel_followers (
    channel_id INTEGER REFERENCES update_channels(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    followed_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (channel_id, user_id)
);

-- Channel updates/posts table
CREATE TABLE IF NOT EXISTS channel_updates (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES update_channels(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_update_channels_creator ON update_channels(creator_id);
CREATE INDEX IF NOT EXISTS idx_channel_followers_user ON channel_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_followers_channel ON channel_followers(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_updates_channel ON channel_updates(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_updates_created ON channel_updates(created_at DESC);

-- Function to update follower count
CREATE OR REPLACE FUNCTION update_channel_follower_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE update_channels 
        SET follower_count = follower_count + 1 
        WHERE id = NEW.channel_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE update_channels 
        SET follower_count = follower_count - 1 
        WHERE id = OLD.channel_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update follower count
DROP TRIGGER IF EXISTS channel_follower_count_trigger ON channel_followers;
CREATE TRIGGER channel_follower_count_trigger
AFTER INSERT OR DELETE ON channel_followers
FOR EACH ROW EXECUTE FUNCTION update_channel_follower_count();
