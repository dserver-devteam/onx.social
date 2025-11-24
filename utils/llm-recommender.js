const { Pool } = require('pg');
const { loadRecommendations } = require('./llm-storage');

// Ollama configuration from environment
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

// In-memory cache for recommendations
const recommendationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Database pool - will be set by the main application
let pool;

const setPool = (dbPool) => {
    pool = dbPool;
};

/**
 * Get recommended posts for a user using hybrid approach
 * @param {number} userId - User ID
 * @param {number} limit - Number of recommendations to return
 * @returns {Promise<number[]>} - Array of post IDs
 */
async function getRecommendationsForUser(userId, limit = 20) {
    // 1. Try to load LLM-processed recommendations from S3
    try {
        const llmRecs = await loadRecommendations(userId);
        if (llmRecs && llmRecs.postIds && llmRecs.postIds.length > 0) {
            console.log(`[Recommender] Using LLM-processed recommendations from S3 for user ${userId}`);
            return llmRecs.postIds.slice(0, limit);
        }
    } catch (error) {
        console.log(`[Recommender] No LLM recommendations in S3 for user ${userId}, using content-based`);
    }

    // 2. Check in-memory cache
    const cacheKey = `${userId}-${limit}`;
    const cached = recommendationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[Recommender] Cache hit for user ${userId}`);
        return cached.postIds;
    }

    console.log(`[Recommender] Generating content-based recommendations for user ${userId}`);

    try {
        // Build user profile
        const userProfile = await buildUserProfile(userId);

        // If user has no activity, return trending/popular posts
        if (userProfile.activityCount === 0) {
            console.log(`[Recommender] Cold start - returning popular posts for user ${userId}`);
            return await getPopularPosts(limit);
        }

        // Get candidate posts (recent posts the user hasn't interacted with)
        const candidatePostsQuery = `
            SELECT p.id, p.content, p.created_at,
                   COUNT(DISTINCT l.id) as like_count,
                   COUNT(DISTINCT r.id) as repost_count
            FROM posts p
            LEFT JOIN likes l ON p.id = l.post_id
            LEFT JOIN reposts r ON p.id = r.post_id
            WHERE p.user_id != $1
              AND p.id NOT IN (
                  SELECT post_id FROM likes WHERE user_id = $1
                  UNION
                  SELECT post_id FROM reposts WHERE user_id = $1
              )
              AND p.created_at > NOW() - INTERVAL '7 days'
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT 100
        `;
        const candidatePosts = await pool.query(candidatePostsQuery, [userId]);

        if (candidatePosts.rows.length === 0) {
            console.log(`[Recommender] No candidate posts - returning popular posts`);
            return await getPopularPosts(limit);
        }

        // Score posts using content-based filtering
        const scoredPosts = scorePostsByContent(userProfile, candidatePosts.rows);

        console.log(`[Recommender] User interests: ${userProfile.hashtags.slice(0, 5).join(', ')}`);
        console.log(`[Recommender] Keywords: ${userProfile.keywords.slice(0, 10).join(', ')}`);

        // Sort by score and return top N post IDs
        const recommendedPostIds = scoredPosts
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(p => p.id);

        // Cache the results
        recommendationCache.set(cacheKey, {
            postIds: recommendedPostIds,
            timestamp: Date.now()
        });

        // Clean up old cache entries
        cleanCache();

        return recommendedPostIds;
    } catch (error) {
        console.error('Error generating recommendations:', error);
        // Fallback to popular posts on error
        return await getPopularPosts(limit);
    }
}

/**
 * Build a user profile based on their activity
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - User profile with interests and preferences
 */
async function buildUserProfile(userId) {
    try {
        // Get user's liked posts
        const likedPostsQuery = `
            SELECT p.content, p.created_at
            FROM posts p
            JOIN likes l ON p.id = l.post_id
            WHERE l.user_id = $1
            ORDER BY l.created_at DESC
            LIMIT 50
        `;
        const likedPosts = await pool.query(likedPostsQuery, [userId]);

        // Get user's reposts
        const repostsQuery = `
            SELECT p.content, p.created_at
            FROM posts p
            JOIN reposts r ON p.id = r.post_id
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
            LIMIT 20
        `;
        const reposts = await pool.query(repostsQuery, [userId]);

        // Combine all content
        const allContent = [
            ...likedPosts.rows.map(p => p.content),
            ...reposts.rows.map(p => p.content)
        ];

        // Extract hashtags
        const hashtags = new Set();
        allContent.forEach(content => {
            const matches = content.match(/#[a-zA-Z0-9_]+/g) || [];
            matches.forEach(tag => hashtags.add(tag.toLowerCase()));
        });

        // Extract keywords (remove common words)
        const keywords = extractKeywords(allContent);

        return {
            userId,
            likedPosts: likedPosts.rows,
            repostedPosts: reposts.rows,
            hashtags: Array.from(hashtags),
            keywords: keywords,
            activityCount: likedPosts.rows.length + reposts.rows.length
        };
    } catch (error) {
        console.error('Error building user profile:', error);
        return {
            userId,
            likedPosts: [],
            repostedPosts: [],
            hashtags: [],
            keywords: [],
            activityCount: 0
        };
    }
}

/**
 * Extract meaningful keywords from content
 * @param {Array<string>} contents - Array of post contents
 * @returns {Array<string>} - Array of keywords
 */
function extractKeywords(contents) {
    // Common stop words to ignore
    const stopWords = new Set([
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
        'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one',
        'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
        'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your',
        'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
        'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new',
        'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had',
        'were', 'said', 'did', 'having', 'may', 'am', 'being', 'does', 'done'
    ]);

    const wordCounts = {};

    contents.forEach(content => {
        // Remove hashtags, URLs, and special characters
        const cleaned = content
            .replace(/#[a-zA-Z0-9_]+/g, '')
            .replace(/https?:\/\/\S+/g, '')
            .replace(/[^a-zA-Z\s]/g, ' ')
            .toLowerCase();

        const words = cleaned.split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));

        words.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
    });

    // Return top keywords by frequency
    return Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([word]) => word);
}

/**
 * Score posts based on content similarity to user profile
 * @param {Object} userProfile - User profile with interests
 * @param {Array} posts - Candidate posts to score
 * @returns {Array} - Posts with scores
 */
function scorePostsByContent(userProfile, posts) {
    return posts.map(post => {
        let score = 0;
        const postContent = post.content.toLowerCase();

        // 1. Hashtag matching (highest weight)
        const postHashtags = (post.content.match(/#[a-zA-Z0-9_]+/g) || []).map(h => h.toLowerCase());
        const hashtagMatches = postHashtags.filter(h => userProfile.hashtags.includes(h)).length;
        score += hashtagMatches * 10; // 10 points per matching hashtag

        // 2. Keyword matching (medium weight)
        let keywordMatches = 0;
        userProfile.keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(postContent)) {
                keywordMatches++;
            }
        });
        score += keywordMatches * 3; // 3 points per matching keyword

        // 3. Engagement boost (small weight)
        score += (post.like_count * 0.5 + post.repost_count * 0.3);

        // 4. Recency boost (prefer newer posts)
        const ageInHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
        const recencyScore = Math.max(0, 5 - (ageInHours / 24)); // Up to 5 points for very recent posts
        score += recencyScore;

        return {
            ...post,
            score: score,
            hashtagMatches,
            keywordMatches
        };
    });
}

/**
 * Get popular posts as fallback
 * @param {number} limit - Number of posts to return
 * @returns {Promise<number[]>} - Array of post IDs
 */
async function getPopularPosts(limit = 20) {
    try {
        const query = `
            SELECT p.id
            FROM posts p
            LEFT JOIN likes l ON p.id = l.post_id
            LEFT JOIN reposts r ON p.id = r.post_id
            WHERE p.created_at > NOW() - INTERVAL '7 days'
            GROUP BY p.id
            ORDER BY (COUNT(DISTINCT l.id) * 2 + COUNT(DISTINCT r.id)) DESC, p.created_at DESC
            LIMIT $1
        `;
        const result = await pool.query(query, [limit]);
        return result.rows.map(row => row.id);
    } catch (error) {
        console.error('Error getting popular posts:', error);
        return [];
    }
}

/**
 * Clean up old cache entries
 */
function cleanCache() {
    const now = Date.now();
    for (const [key, value] of recommendationCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            recommendationCache.delete(key);
        }
    }
}

/**
 * Clear cache for a specific user (call when user likes/reposts)
 * @param {number} userId - User ID
 */
function clearUserCache(userId) {
    for (const key of recommendationCache.keys()) {
        if (key.startsWith(`${userId}-`)) {
            recommendationCache.delete(key);
        }
    }
}

module.exports = {
    setPool,
    getRecommendationsForUser,
    clearUserCache
};
