# Task Runner Documentation

This document describes the task runner system for managing data in onx.social.

## Overview

The `tasks.js` file provides a comprehensive set of commands for managing your application's data, including S3 storage and PostgreSQL database operations.

## Available Commands

### `npm run task clear:s3`
**Clear all S3 buckets**

Deletes all objects from all S3 buckets:
- `profile-picture`
- `profile-banner`
- `picture-data`
- `temp-data`
- `llm-data`
- `user-data`

This removes all uploaded files but keeps the bucket structure intact.

### `npm run task clear:db`
**Clear all database data**

Truncates all tables in the database, removing all data while preserving the table structure and schema. This is useful when you want to reset data but keep the database structure.

Features:
- Temporarily disables foreign key constraints
- Truncates all tables with `RESTART IDENTITY CASCADE`
- Re-enables foreign key constraints
- Shows count of deleted rows per table

### `npm run task clear:all`
**Clear both S3 and database**

Runs both `clear:s3` and `clear:db` in sequence. This removes all uploaded files and all database records while keeping the schema intact.

### `npm run task reinstall:db`
**Drop and reinstall database schema**

Completely drops all database tables and reinstalls them from scratch using:
1. Base schema (`db/schema.sql`)
2. All migration files
3. Smart recommendation tables

This is useful when you need to reset the database structure itself.

### `npm run task clear:data:all` ⚠️
**NUCLEAR OPTION: Complete data wipe and reinstall**

This is the most destructive command and does the following:
1. Deletes all objects from all S3 buckets
2. Drops all database tables
3. Reinstalls the complete database schema

**Warning:** This command includes a 3-second delay before execution to allow you to cancel with `Ctrl+C`.

After running this command, you will have a completely fresh installation with:
- Empty S3 buckets
- Fresh database schema
- No user data, posts, or uploaded files

## Usage Examples

```bash
# View help and available commands
npm run task

# Clear only S3 buckets
npm run task clear:s3

# Clear only database data (keeps schema)
npm run task clear:db

# Clear both S3 and database data
npm run task clear:all

# Reinstall database schema
npm run task reinstall:db

# Complete reset (nuclear option)
npm run task clear:data:all
```

## Safety Features

1. **Colored output**: Commands use color-coded console output for better visibility
   - 🟢 Green: Success messages
   - 🔴 Red: Error messages
   - 🟡 Yellow: Warnings
   - 🔵 Cyan: Information

2. **Confirmation delay**: The `clear:data:all` command includes a 3-second delay before execution

3. **Detailed logging**: All operations provide detailed feedback about what's being deleted

4. **Error handling**: Graceful error handling with informative error messages

## What Gets Deleted

### S3 Buckets Cleared
- All profile pictures
- All profile banners
- All post media (images/videos)
- All temporary files
- All LLM data
- All user data files

### Database Tables Affected
- `users` - All user accounts
- `posts` - All posts
- `likes` - All likes
- `reposts` - All reposts
- `replies` - All replies
- `follows` - All follow relationships
- `bookmarks` - All bookmarks
- `conversations` - All message conversations
- `messages` - All direct messages
- `reports` - All content reports
- `admin_actions` - All admin action logs
- `deletion_queue` - All deletion tasks
- `system_settings` - System configuration (reinstalled with defaults)
- `user_post_views` - All view tracking data
- `user_preferences` - All user preference data

## When to Use Each Command

### Development
- **`clear:db`**: When you want to reset test data but keep the schema
- **`clear:s3`**: When you want to remove test uploads
- **`clear:all`**: Quick reset of all data for testing

### Production Migration
- **`reinstall:db`**: When deploying schema changes
- **`clear:data:all`**: When you need a complete fresh start

### Testing
- **`clear:all`**: Between test runs to ensure clean state

## Environment Variables Required

Make sure your `.env` file contains:

```env
# Database
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# S3
S3_ENDPOINT=http://your_s3_endpoint:3900
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
```

## Troubleshooting

### "NoSuchBucket" errors
This is normal if a bucket doesn't exist yet. The command will skip it and continue.

### Foreign key constraint errors
The `clear:db` command temporarily disables foreign key checks to avoid these errors.

### Connection errors
Ensure your database and S3 services are running and accessible.

## Warning ⚠️

**All these operations are DESTRUCTIVE and CANNOT BE UNDONE!**

Always ensure you have backups before running these commands in production environments.

## Technical Details

The task runner:
- Uses the same database pool configuration as your main application
- Uses the same S3 client configuration as your upload system
- Properly closes database connections after completion
- Handles errors gracefully and provides exit codes
- Can be imported as a module for programmatic use

## Programmatic Usage

You can also import and use these functions in your own scripts:

```javascript
const { clearAllS3Buckets, clearDatabaseData, clearDataAll } = require('./tasks');

// Use in your own scripts
async function myCustomTask() {
    await clearDatabaseData();
    // Your custom logic here
}
```
