-- Add support panel moderation features
-- Add ban_until column to users table for temporary bans

ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'));

-- Add index for checking banned users
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_ban_until ON users(ban_until);

-- Add comment for documentation
COMMENT ON COLUMN users.ban_until IS 'Timestamp when temporary ban expires';
COMMENT ON COLUMN users.status IS 'User account status: active, suspended (temp ban), or banned (permanent)';
