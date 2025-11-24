const { s3Client, BUCKETS } = require('./s3');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

/**
 * Save user recommendations to S3
 * @param {number} userId - User ID
 * @param {number[]} postIds - Array of recommended post IDs
 * @param {Object} metadata - Additional metadata (scores, reasoning, etc.)
 * @returns {Promise<void>}
 */
async function saveRecommendations(userId, postIds, metadata = {}) {
    try {
        const data = {
            userId,
            postIds,
            metadata,
            generatedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };

        const command = new PutObjectCommand({
            Bucket: BUCKETS.LLM_DATA,
            Key: `recommendations/user-${userId}.json`,
            Body: JSON.stringify(data, null, 2),
            ContentType: 'application/json'
        });

        await s3Client.send(command);
        console.log(`[LLM Storage] Saved recommendations for user ${userId}`);
    } catch (error) {
        console.error(`[LLM Storage] Error saving recommendations for user ${userId}:`, error);
        throw error;
    }
}

/**
 * Load user recommendations from S3
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} - Recommendations object or null if not found/expired
 */
async function loadRecommendations(userId) {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKETS.LLM_DATA,
            Key: `recommendations/user-${userId}.json`
        });

        const response = await s3Client.send(command);
        const body = await streamToString(response.Body);
        const data = JSON.parse(body);

        // Check if expired
        if (new Date(data.expiresAt) < new Date()) {
            console.log(`[LLM Storage] Recommendations expired for user ${userId}`);
            return null;
        }

        console.log(`[LLM Storage] Loaded recommendations for user ${userId}`);
        return data;
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            console.log(`[LLM Storage] No recommendations found for user ${userId}`);
            return null;
        }
        console.error(`[LLM Storage] Error loading recommendations for user ${userId}:`, error);
        return null;
    }
}

/**
 * Save user analysis results to S3
 * @param {number} userId - User ID
 * @param {Object} analysis - Analysis results (topics, keywords, reasoning, etc.)
 * @returns {Promise<void>}
 */
async function saveAnalysis(userId, analysis) {
    try {
        const data = {
            userId,
            analysis,
            analyzedAt: new Date().toISOString()
        };

        const command = new PutObjectCommand({
            Bucket: BUCKETS.LLM_DATA,
            Key: `analysis/user-${userId}/latest.json`,
            Body: JSON.stringify(data, null, 2),
            ContentType: 'application/json'
        });

        await s3Client.send(command);
        console.log(`[LLM Storage] Saved analysis for user ${userId}`);
    } catch (error) {
        console.error(`[LLM Storage] Error saving analysis for user ${userId}:`, error);
        throw error;
    }
}

/**
 * Load user analysis from S3
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} - Analysis object or null if not found
 */
async function loadAnalysis(userId) {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKETS.LLM_DATA,
            Key: `analysis/user-${userId}/latest.json`
        });

        const response = await s3Client.send(command);
        const body = await streamToString(response.Body);
        const data = JSON.parse(body);

        console.log(`[LLM Storage] Loaded analysis for user ${userId}`);
        return data;
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            console.log(`[LLM Storage] No analysis found for user ${userId}`);
            return null;
        }
        console.error(`[LLM Storage] Error loading analysis for user ${userId}:`, error);
        return null;
    }
}

/**
 * Save processing queue state to S3
 * @param {Array} queue - Array of job objects
 * @returns {Promise<void>}
 */
async function saveQueueState(queue) {
    try {
        const data = {
            queue,
            updatedAt: new Date().toISOString()
        };

        const command = new PutObjectCommand({
            Bucket: BUCKETS.LLM_DATA,
            Key: 'queue/state.json',
            Body: JSON.stringify(data, null, 2),
            ContentType: 'application/json'
        });

        await s3Client.send(command);
        console.log(`[LLM Storage] Saved queue state (${queue.length} jobs)`);
    } catch (error) {
        console.error('[LLM Storage] Error saving queue state:', error);
        throw error;
    }
}

/**
 * Load processing queue state from S3
 * @returns {Promise<Array>} - Array of job objects
 */
async function loadQueueState() {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKETS.LLM_DATA,
            Key: 'queue/state.json'
        });

        const response = await s3Client.send(command);
        const body = await streamToString(response.Body);
        const data = JSON.parse(body);

        console.log(`[LLM Storage] Loaded queue state (${data.queue.length} jobs)`);
        return data.queue;
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            console.log('[LLM Storage] No queue state found, starting fresh');
            return [];
        }
        console.error('[LLM Storage] Error loading queue state:', error);
        return [];
    }
}

/**
 * Log processing event to S3
 * @param {number} userId - User ID
 * @param {string} event - Event type (started, completed, failed)
 * @param {Object} data - Event data
 * @returns {Promise<void>}
 */
async function logProcessing(userId, event, data = {}) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const logEntry = {
            timestamp: new Date().toISOString(),
            userId,
            event,
            data
        };

        // Append to daily log file
        const key = `logs/${today}.json`;

        let logs = [];
        try {
            const getCommand = new GetObjectCommand({
                Bucket: BUCKETS.LLM_DATA,
                Key: key
            });
            const response = await s3Client.send(getCommand);
            const body = await streamToString(response.Body);
            logs = JSON.parse(body);
        } catch (error) {
            // File doesn't exist yet, start fresh
        }

        logs.push(logEntry);

        const putCommand = new PutObjectCommand({
            Bucket: BUCKETS.LLM_DATA,
            Key: key,
            Body: JSON.stringify(logs, null, 2),
            ContentType: 'application/json'
        });

        await s3Client.send(putCommand);
    } catch (error) {
        console.error('[LLM Storage] Error logging processing event:', error);
        // Don't throw - logging failures shouldn't break the system
    }
}

/**
 * Helper function to convert stream to string
 * @param {Stream} stream - Readable stream
 * @returns {Promise<string>}
 */
async function streamToString(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
}

module.exports = {
    saveRecommendations,
    loadRecommendations,
    saveAnalysis,
    loadAnalysis,
    saveQueueState,
    loadQueueState,
    logProcessing
};
