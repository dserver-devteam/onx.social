-- Add statuses table for 12-hour temporary statuses
CREATE TABLE IF NOT EXISTS statuses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) <= 280),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_statuses_user_id ON statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_statuses_expires_at ON statuses(expires_at);
CREATE INDEX IF NOT EXISTS idx_statuses_created_at ON statuses(created_at DESC);

-- Add constraint to ensure expires_at is always 12 hours from created_at
-- This will be enforced in the application layer
