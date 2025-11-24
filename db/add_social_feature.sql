-- Migration: Add Social feature
-- This migration adds support for mini posts shared between mutual followers

-- Create social_posts table for mini updates (max 50 characters)
CREATE TABLE IF NOT EXISTS social_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON social_posts(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE social_posts IS 'Mini posts (max 50 chars) shared in Social feature between mutual followers';
COMMENT ON COLUMN social_posts.content IS 'Mini post content, maximum 50 characters';
