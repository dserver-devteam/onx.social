#!/usr/bin/env node

/**
 * Task Runner for onx.social
 * 
 * Available tasks:
 * - clear:s3 - Clear all S3 buckets
 * - clear:db - Clear all database data (keeps schema)
 * - clear:all - Clear both S3 and database
 * - reinstall:db - Drop and recreate all database tables
 * - clear:data:all - Nuclear option: Clear S3, drop all tables, and reinstall schema
 */

require('dotenv').config();
const { Pool } = require('pg');
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand, ListBucketsCommand } = require('@aws-sdk/client-s3');
const { BUCKETS } = require('./utils/s3');

// PostgreSQL connection pool
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    }
});

// S3 Client
const s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || 'http://192.168.178.199:3900',
    region: 'local',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED'
});

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'cyan');
}

/**
 * Clear all objects from a specific S3 bucket
 */
async function clearS3Bucket(bucketName) {
    try {
        logInfo(`Clearing bucket: ${bucketName}`);

        // List all objects in the bucket
        const listCommand = new ListObjectsV2Command({
            Bucket: bucketName
        });

        const listResponse = await s3Client.send(listCommand);

        if (!listResponse.Contents || listResponse.Contents.length === 0) {
            logInfo(`  Bucket ${bucketName} is already empty`);
            return 0;
        }

        // Delete all objects
        const objectsToDelete = listResponse.Contents.map(obj => ({ Key: obj.Key }));

        const deleteCommand = new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: {
                Objects: objectsToDelete,
                Quiet: false
            }
        });

        const deleteResponse = await s3Client.send(deleteCommand);
        const deletedCount = deleteResponse.Deleted?.length || 0;

        logSuccess(`  Deleted ${deletedCount} objects from ${bucketName}`);
        return deletedCount;
    } catch (error) {
        if (error.name === 'NoSuchBucket') {
            logWarning(`  Bucket ${bucketName} does not exist`);
            return 0;
        }
        logError(`  Error clearing bucket ${bucketName}: ${error.message}`);
        throw error;
    }
}

/**
 * Clear all S3 buckets
 */
async function clearAllS3Buckets() {
    log('\n🗑️  Clearing all S3 buckets...', 'bright');

    let totalDeleted = 0;
    const bucketNames = Object.values(BUCKETS);

    for (const bucketName of bucketNames) {
        const deleted = await clearS3Bucket(bucketName);
        totalDeleted += deleted;
    }

    logSuccess(`\nTotal objects deleted from S3: ${totalDeleted}`);
}

/**
 * Get all table names from the database
 */
async function getAllTables() {
    const result = await pool.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    `);
    return result.rows.map(row => row.tablename);
}

/**
 * Clear all data from database tables (keeps schema)
 */
async function clearDatabaseData() {
    log('\n🗑️  Clearing all database data...', 'bright');

    try {
        const tables = await getAllTables();

        if (tables.length === 0) {
            logWarning('No tables found in database');
            return;
        }

        logInfo(`Found ${tables.length} tables`);

        // Disable foreign key checks temporarily
        await pool.query('SET session_replication_role = replica;');

        let totalRowsDeleted = 0;

        for (const table of tables) {
            const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            const rowCount = parseInt(countResult.rows[0].count);

            if (rowCount > 0) {
                await pool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
                logSuccess(`  Cleared ${rowCount} rows from ${table}`);
                totalRowsDeleted += rowCount;
            } else {
                logInfo(`  Table ${table} is already empty`);
            }
        }

        // Re-enable foreign key checks
        await pool.query('SET session_replication_role = DEFAULT;');

        logSuccess(`\nTotal rows deleted: ${totalRowsDeleted}`);
    } catch (error) {
        logError(`Error clearing database: ${error.message}`);
        throw error;
    }
}

/**
 * Drop all tables from the database
 */
async function dropAllTables() {
    log('\n🗑️  Dropping all database tables...', 'bright');

    try {
        const tables = await getAllTables();

        if (tables.length === 0) {
            logWarning('No tables found in database');
            return;
        }

        logInfo(`Found ${tables.length} tables to drop`);

        // Drop all tables with CASCADE
        for (const table of tables) {
            await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
            logSuccess(`  Dropped table: ${table}`);
        }

        logSuccess(`\nAll tables dropped successfully`);
    } catch (error) {
        logError(`Error dropping tables: ${error.message}`);
        throw error;
    }
}

/**
 * Reinstall database schema
 */
async function reinstallDatabaseSchema() {
    log('\n📦 Reinstalling database schema...', 'bright');

    const fs = require('fs');
    const path = require('path');

    try {
        // Read and execute schema.sql
        const schemaPath = path.join(__dirname, 'db', 'schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

        await pool.query(schemaSQL);
        logSuccess('  Base schema installed');

        // Execute migration files in order
        // Note: add_notifications_messaging.sql supersedes add_messaging_tables.sql
        // It has the more complete conversations table with status column
        const migrationFiles = [
            'add_follows_bookmarks.sql',
            'add_notifications_messaging.sql',  // This creates conversations and messages tables with status
            'add_post_menu_features.sql',
            'add_social_feature.sql',
            'add_statuses.sql',
            'add_update_channels.sql',
            'add_media_support.sql'
        ];

        for (const migrationFile of migrationFiles) {
            const migrationPath = path.join(__dirname, 'db', migrationFile);

            if (fs.existsSync(migrationPath)) {
                const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
                await pool.query(migrationSQL);
                logSuccess(`  Applied migration: ${migrationFile}`);
            } else {
                logWarning(`  Migration file not found: ${migrationFile}`);
            }
        }

        // Create smart recommendation tables (from server.js)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_post_views (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, post_id)
            );
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_user_views ON user_post_views(user_id, viewed_at DESC);
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_post_views ON user_post_views(post_id);
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                liked_topics JSONB DEFAULT '[]',
                liked_users JSONB DEFAULT '[]',
                interaction_count INTEGER DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_liked_topics ON user_preferences USING GIN (liked_topics);
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_liked_users ON user_preferences USING GIN (liked_users);
        `);

        logSuccess('  Smart recommendation tables created');

        logSuccess('\n✅ Database schema reinstalled successfully');
    } catch (error) {
        logError(`Error reinstalling schema: ${error.message}`);
        throw error;
    }
}

/**
 * Nuclear option: Clear everything and reinstall
 */
async function clearDataAll() {
    log('\n💥 NUCLEAR OPTION: Clearing ALL data and reinstalling schema...', 'red');
    log('This will:', 'yellow');
    log('  1. Delete all objects from all S3 buckets', 'yellow');
    log('  2. Drop all database tables', 'yellow');
    log('  3. Reinstall the database schema', 'yellow');
    log('  4. Leave you with a completely fresh installation\n', 'yellow');

    // Wait 3 seconds to allow user to cancel
    logWarning('Starting in 3 seconds... Press Ctrl+C to cancel');
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
        // Step 1: Clear S3
        await clearAllS3Buckets();

        // Step 2: Drop all tables
        await dropAllTables();

        // Step 3: Reinstall schema
        await reinstallDatabaseSchema();

        log('\n🎉 Complete! Your database is now fresh and empty.', 'green');
    } catch (error) {
        logError(`\nFailed to complete clear:data:all: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Show usage information
 */
function showUsage() {
    console.log(`
${colors.bright}onx.social Task Runner${colors.reset}

${colors.cyan}Usage:${colors.reset}
  npm run task <command>

${colors.cyan}Available Commands:${colors.reset}
  ${colors.green}clear:s3${colors.reset}         - Clear all S3 buckets (delete all uploaded files)
  ${colors.green}clear:db${colors.reset}         - Clear all database data (keeps table structure)
  ${colors.green}clear:all${colors.reset}        - Clear both S3 and database data
  ${colors.green}reinstall:db${colors.reset}     - Drop all tables and reinstall schema
  ${colors.red}clear:data:all${colors.reset}   - ${colors.bright}NUCLEAR OPTION${colors.reset}: Clear S3, drop tables, reinstall schema

${colors.cyan}Examples:${colors.reset}
  npm run task clear:s3
  npm run task clear:db
  npm run task clear:data:all

${colors.yellow}Warning:${colors.reset} These operations are ${colors.red}DESTRUCTIVE${colors.reset} and ${colors.red}CANNOT BE UNDONE${colors.reset}!
`);
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        showUsage();
        process.exit(0);
    }

    const command = args[0];

    try {
        switch (command) {
            case 'clear:s3':
                await clearAllS3Buckets();
                break;

            case 'clear:db':
                await clearDatabaseData();
                break;

            case 'clear:all':
                await clearAllS3Buckets();
                await clearDatabaseData();
                break;

            case 'reinstall:db':
                await dropAllTables();
                await reinstallDatabaseSchema();
                break;

            case 'clear:data:all':
                await clearDataAll();
                break;

            default:
                logError(`Unknown command: ${command}`);
                showUsage();
                process.exit(1);
        }

        // Close database connection
        await pool.end();
        log('\n✅ Task completed successfully!', 'green');
        process.exit(0);

    } catch (error) {
        logError(`\nTask failed: ${error.message}`);
        console.error(error);
        await pool.end();
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    clearAllS3Buckets,
    clearDatabaseData,
    dropAllTables,
    reinstallDatabaseSchema,
    clearDataAll
};
