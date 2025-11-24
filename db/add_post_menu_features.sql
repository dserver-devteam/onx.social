-- Add post menu features: view tracking and muted users
-- Run this migration to add support for tracking viewed posts and muting users

-- Track which posts users have viewed
CREATE TABLE IF NOT EXISTS post_views (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
);

-- Track muted users
CREATE TABLE IF NOT EXISTS muted_users (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    muted_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, muted_user_id),
    CHECK (user_id != muted_user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON post_views(user_id);
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_at ON post_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_muted_users_user_id ON muted_users(user_id);
CREATE INDEX IF NOT EXISTS idx_muted_users_muted_user_id ON muted_users(muted_user_id);

-- Add comment for documentation
COMMENT ON TABLE post_views IS 'Tracks which posts each user has viewed to avoid showing them again';
COMMENT ON TABLE muted_users IS 'Tracks which users have been muted by other users';
