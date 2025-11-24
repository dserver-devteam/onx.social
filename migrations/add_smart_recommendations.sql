-- Migration: Smart Recommendation System
-- Creates tables for tracking viewed posts and user preferences

-- Table to track which posts each user has viewed
CREATE TABLE IF NOT EXISTS user_post_views (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id)
);

-- Index for fast lookups of user's viewed posts
CREATE INDEX IF NOT EXISTS idx_user_views ON user_post_views(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_views ON user_post_views(post_id);

-- Table to store learned user preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    liked_topics JSONB DEFAULT '[]',
    liked_users JSONB DEFAULT '[]',
    interaction_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_liked_topics ON user_preferences USING GIN (liked_topics);
CREATE INDEX IF NOT EXISTS idx_liked_users ON user_preferences USING GIN (liked_users);
