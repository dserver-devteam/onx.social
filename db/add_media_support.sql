-- Add media support to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) CHECK (media_type IN ('image', 'video', NULL));

-- Add banner_url to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Create index for media queries
CREATE INDEX IF NOT EXISTS idx_posts_media_type ON posts(media_type) WHERE media_type IS NOT NULL;
