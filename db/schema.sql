-- Drop existing tables if they exist
DROP TABLE IF EXISTS replies CASCADE;
DROP TABLE IF EXISTS reposts CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'support')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned', 'deleted')),
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create posts table
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create likes table
CREATE TABLE likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
);

-- Create reposts table
CREATE TABLE reposts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
);

-- Create replies table
CREATE TABLE replies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_reposts_post_id ON reposts(post_id);
CREATE INDEX idx_reposts_user_id ON reposts(user_id);
CREATE INDEX idx_replies_post_id ON replies(post_id);
CREATE INDEX idx_replies_user_id ON replies(user_id);

-- Create reports table for support panel
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    assigned_to INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admin_actions table for audit logging
CREATE TABLE admin_actions (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id INTEGER,
    description TEXT,
    performed_by VARCHAR(100) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create deletion_queue table for tracking user deletion tasks
CREATE TABLE deletion_queue (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    initiated_by VARCHAR(100) DEFAULT 'admin',
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    items_deleted JSONB DEFAULT '{"posts": 0, "likes": 0, "reposts": 0, "replies": 0, "reports": 0}'::jsonb
);

-- Create system_settings table for global configuration
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('registration_enabled', 'true', 'Enable or disable user registration'),
    ('email_verification_required', 'false', 'Require email verification for new users'),
    ('maintenance_mode', 'false', 'Enable maintenance mode');

-- Create indexes for reports
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_post_id ON reports(post_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- Create indexes for deletion_queue
CREATE INDEX idx_deletion_queue_status ON deletion_queue(status);
CREATE INDEX idx_deletion_queue_user_id ON deletion_queue(user_id);

-- Create indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_users_reset_token ON users(reset_token);
