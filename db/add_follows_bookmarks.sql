-- Migration: Add follows and bookmarks tables
-- This migration adds support for user follows and post bookmarks

-- Create follows table for user relationships
CREATE TABLE IF NOT EXISTS follows (
    id SERIAL PRIMARY KEY,
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
);

-- Add media support to posts table (if not already exists)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) CHECK (media_type IN ('image', 'video'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at DESC);

-- Add index for hashtag searching (using GIN index for pattern matching)
CREATE INDEX IF NOT EXISTS idx_posts_content_hashtags ON posts USING gin(to_tsvector('english', content));
