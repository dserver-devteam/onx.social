require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');
const { loadQueueState, saveQueueState, logProcessing } = require('./utils/llm-storage');

// Configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';
const PROCESS_INTERVAL = 2000; // Check every 2 seconds (fast processing)

// Database pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

let processingQueue = [];
let currentlyProcessing = new Set();

/**
 * Start the background processor
 */
async function startProcessor() {
    console.log('🤖 LLM Post Analyzer starting...');

    // Load queue state from S3
    try {
        processingQueue = await loadQueueState();
        console.log(`📋 Loaded ${processingQueue.length} jobs from queue`);
    } catch (error) {
        console.error('Error loading queue state:', error);
        processingQueue = [];
    }

    // Test database connection
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }

    console.log(`🚀 LLM Processor running (checking every ${PROCESS_INTERVAL / 1000}s)`);

    // Continuous processing loop
    processLoop();
}

/**
 * Continuous processing loop
 */
// Continuous processing loop
async function processLoop() {
    console.log('🔄 [Processor] Loop start');
    try {
        // Reload queue state to pick up new jobs
        try {
            console.log('  📥 Loading queue state...');
            const loadedQueue = await loadQueueState();
            processingQueue = loadedQueue;
            console.log(`  ✅ Queue loaded: ${processingQueue.length} jobs`);
        } catch (err) {
            console.error('Error reloading queue:', err);
        }

        // Clear stuck jobs (processing for more than 5 minutes)
        const now = Date.now();
        processingQueue.forEach(job => {
            if (job.status === 'processing' && job.startedAt) {
                const elapsed = now - new Date(job.startedAt).getTime();
                if (elapsed > 5 * 60 * 1000) {
                    console.log(`⚠️  Clearing stuck job ${job.id}`);
                    job.status = 'failed';
                    job.error = 'Timeout';
                    currentlyProcessing.delete(job.id);
                }
            }
        });

        // Find pending jobs (limit 1 concurrent for debugging)
        const CONCURRENT_JOBS = 1;
        const pendingJobs = processingQueue
            .filter(j => j.status === 'pending' && !currentlyProcessing.has(j.id))
            .slice(0, CONCURRENT_JOBS);

        if (pendingJobs.length > 0) {
            console.log(`🚀 Starting batch of ${pendingJobs.length} post analysis jobs...`);
            await Promise.all(pendingJobs.map(job => processJob(job)));
        } else {
            console.log('  💤 No pending jobs');
        }

        // Wait before next check
        setTimeout(processLoop, PROCESS_INTERVAL);
    } catch (error) {
        console.error('Error in processing loop:', error);
        setTimeout(processLoop, 5000);
    }
}

/**
 * Process a single job
 */
async function processJob(job) {
    try {
        currentlyProcessing.add(job.id);
        job.status = 'processing';
        job.startedAt = new Date().toISOString();
        await saveQueueState(processingQueue);

        if (job.type === 'analyze_post') {
            await analyzePost(job.postId, job.content);
        }

        // Mark as completed
        job.status = 'completed';
        job.completedAt = new Date().toISOString();

        // Remove completed jobs from queue to keep it clean
        processingQueue = processingQueue.filter(j => j.id !== job.id);
        await saveQueueState(processingQueue);

        console.log(`✅ Completed job ${job.id}`);
    } catch (error) {
        console.error(`❌ Error processing job ${job.id}:`, error);
        job.status = 'failed';
        job.error = error.message;
        await saveQueueState(processingQueue);
    } finally {
        currentlyProcessing.delete(job.id);
    }
}

/**
 * Analyze a post to extract themes
 */
async function analyzePost(postId, content) {
    console.log(`  🔍 Analyzing post ${postId}: "${content.substring(0, 50)}..."`);

    const prompt = `Analyze this social media post and classify it into specific categories and niches.
    
    Return a JSON object with:
    - "categories": object mapping category/niche names (lowercase) to relevance scores (0.0-1.0). Include both broad categories and specific niches.
    - "confidence": float (0.0-1.0) indicating how confident you are in this classification
    
    IMPORTANT: 
    - Only include categories that are actually relevant to the post. Do NOT include categories with 0 relevance.
    - Prioritize specific niches over generic labels where possible.
    
    Example 1 (Gaming):
    Post: "I love Counter Strike more than #CS:GO"
    Output: { "categories": { "gaming": 0.9, "fps": 0.85, "counter-strike": 0.8 }, "confidence": 0.95 }
    
    Example 2 (Lifestyle):
    Post: "Why is nobody smoking anymore? It kinda fell off."
    Output: { "categories": { "culture": 0.8, "health": 0.7, "trends": 0.9, "smoking": 0.95 }, "confidence": 0.9 }
    
    POST: "${content}"
    
    Respond with ONLY the JSON object.`;

    try {
        const response = await callOllama(prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            console.log(`  🏷️  Analysis for post ${postId}:`, JSON.stringify(result));

            // Transform to storage format: { k: [], w: [], c: 0.0 }
            const categories = Object.keys(result.categories || {});
            // Sort categories by weight descending
            categories.sort((a, b) => (result.categories[b] || 0) - (result.categories[a] || 0));

            // Take top 3
            const topCategories = categories.slice(0, 3);
            const weights = topCategories.map(c => result.categories[c] || 0);
            const confidence = result.confidence || 0.5;

            const analysisData = {
                k: topCategories,
                w: weights,
                c: confidence
            };

            // Update post in database - store both legacy themes and new analysis_data
            await pool.query(
                'UPDATE posts SET themes = $1, analysis_data = $2 WHERE id = $3',
                [result.categories, analysisData, postId]
            );
        } else {
            console.warn(`  ⚠️  Could not parse JSON for post ${postId}`);
        }
    } catch (error) {
        console.error(`  ❌ Failed to analyze post ${postId}:`, error);
        throw error;
    }
}

/**
 * Call Ollama API
 */
async function callOllama(prompt) {
    try {
        const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
            model: OLLAMA_MODEL,
            prompt: prompt,
            stream: false
        });
        return response.data.response;
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            throw new Error('Ollama is not running or not accessible');
        }
        throw error;
    }
}

// Handle shutdown
process.on('SIGINT', async () => {
    console.log('\nSIGINT received, saving queue state...');
    await saveQueueState(processingQueue);
    await pool.end();
    process.exit(0);
});

// Handle shutdown
process.on('SIGINT', async () => {
    console.log('\nSIGINT received, saving queue state...');
    await saveQueueState(processingQueue);
    await pool.end();
    process.exit(0);
});

// Start
if (require.main === module) {
    startProcessor();
}

module.exports = {
    analyzePost,
    startProcessor
};
