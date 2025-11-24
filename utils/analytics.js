const { s3Client, BUCKETS } = require('./s3');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

const ENABLED = process.env.ENABLE_ANALYTICS !== 'false';

// In-memory session storage
const activeSessions = new Map();

/**
 * Generate unique session ID
 */
function generateSessionId() {
    return `sess_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Parse user agent for device info
 */
function parseUserAgent(userAgent) {
    if (!userAgent) return { type: 'unknown', os: 'unknown', browser: 'unknown' };

    const ua = userAgent.toLowerCase();

    // Device type
    let type = 'desktop';
    if (/mobile|android|iphone|ipad|ipod/.test(ua)) type = 'mobile';
    if (/tablet|ipad/.test(ua)) type = 'tablet';

    // OS
    let os = 'unknown';
    if (/windows/.test(ua)) os = 'Windows';
    else if (/mac os x/.test(ua)) os = 'macOS';
    else if (/linux/.test(ua)) os = 'Linux';
    else if (/android/.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/.test(ua)) os = 'iOS';

    // Browser
    let browser = 'unknown';
    if (/edg/.test(ua)) browser = 'Edge';
    else if (/chrome/.test(ua)) browser = 'Chrome';
    else if (/safari/.test(ua)) browser = 'Safari';
    else if (/firefox/.test(ua)) browser = 'Firefox';

    return { type, os, browser };
}

/**
 * Track generic event
 */
async function trackEvent(userId, eventType, data = {}, req = null) {
    if (!ENABLED) return;

    try {
        const event = {
            userId,
            eventType,
            timestamp: new Date().toISOString(),
            sessionId: req?.session?.sessionId || 'unknown',
            ip: req?.clientIp || 'unknown',
            userAgent: req?.userAgent || 'unknown',
            device: parseUserAgent(req?.userAgent),
            location: {
                page: req?.path || data.page || 'unknown',
                referrer: req?.get?.('Referrer') || 'unknown'
            },
            data
        };

        // Save to S3
        const date = new Date().toISOString().split('T')[0];
        const timestamp = Date.now();
        const key = `events/${date}/user-${userId}-${timestamp}.json`;

        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKETS.USER_DATA,
            Key: key,
            Body: JSON.stringify(event, null, 2),
            ContentType: 'application/json'
        }));

        // Also append to raw event stream (NDJSON)
        const rawKey = `raw/${date}/events-${Math.floor(timestamp / 1000)}.ndjson`;
        try {
            await s3Client.send(new PutObjectCommand({
                Bucket: BUCKETS.USER_DATA,
                Key: rawKey,
                Body: JSON.stringify(event) + '\n',
                ContentType: 'application/x-ndjson'
            }));
        } catch (error) {
            // Raw stream is optional
        }

    } catch (error) {
        console.error('[Analytics] Error tracking event:', error);
    }
}

/**
 * Track login
 */
async function trackLogin(userId, ip, userAgent) {
    return trackEvent(userId, 'login', {}, { clientIp: ip, userAgent });
}

/**
 * Track logout
 */
async function trackLogout(userId, req) {
    return trackEvent(userId, 'logout', {}, req);
}

/**
 * Track page view
 */
async function trackPageView(userId, page, referrer, req) {
    return trackEvent(userId, 'page_view', { page, referrer }, req);
}

/**
 * Track post view
 */
async function trackPostView(userId, postId, req) {
    return trackEvent(userId, 'post_view', { postId }, req);
}

/**
 * Track post interaction
 */
async function trackInteraction(userId, action, targetId, req) {
    return trackEvent(userId, `post_${action}`, { targetId, action }, req);
}

/**
 * Track time spent
 */
async function trackTimeSpent(userId, targetType, targetId, timeSpent, req) {
    return trackEvent(userId, 'time_spent', { targetType, targetId, timeSpent }, req);
}

/**
 * Track search
 */
async function trackSearch(userId, query, results, req) {
    return trackEvent(userId, 'search', { query, resultCount: results }, req);
}

/**
 * Start session
 */
async function startSession(userId, ip, userAgent) {
    if (!ENABLED) return null;

    const sessionId = generateSessionId();
    const session = {
        sessionId,
        userId,
        startTime: new Date().toISOString(),
        ip,
        userAgent,
        device: parseUserAgent(userAgent),
        events: []
    };

    activeSessions.set(sessionId, session);

    // Track session start event
    await trackEvent(userId, 'session_start', { sessionId }, { clientIp: ip, userAgent });

    return sessionId;
}

/**
 * End session
 */
async function endSession(sessionId) {
    if (!ENABLED || !sessionId) return;

    const session = activeSessions.get(sessionId);
    if (!session) return;

    session.endTime = new Date().toISOString();
    session.duration = new Date(session.endTime) - new Date(session.startTime);

    // Save session to S3
    try {
        const key = `sessions/user-${session.userId}/session-${sessionId}.json`;
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKETS.USER_DATA,
            Key: key,
            Body: JSON.stringify(session, null, 2),
            ContentType: 'application/json'
        }));

        // Track session end event
        await trackEvent(session.userId, 'session_end', {
            sessionId,
            duration: session.duration,
            eventCount: session.events.length
        }, { clientIp: session.ip, userAgent: session.userAgent });

    } catch (error) {
        console.error('[Analytics] Error saving session:', error);
    }

    activeSessions.delete(sessionId);
}

/**
 * Get session data
 */
function getSessionData(sessionId) {
    return activeSessions.get(sessionId);
}

/**
 * Middleware to track page views
 */
function analyticsMiddleware(req, res, next) {
    if (!ENABLED) return next();

    // Add client IP and user agent to request
    req.clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;
    req.userAgent = req.headers['user-agent'];

    // Track page view for authenticated users
    if (req.session && req.session.userId) {
        // Don't track API calls, only page views
        if (!req.path.startsWith('/api/')) {
            trackPageView(req.session.userId, req.path, req.get('Referrer'), req);
        }
    }

    next();
}

/**
 * Clean up old sessions (call periodically)
 */
function cleanupSessions() {
    const now = Date.now();
    const timeout = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of activeSessions.entries()) {
        const age = now - new Date(session.startTime).getTime();
        if (age > timeout) {
            endSession(sessionId);
        }
    }
}

// Cleanup sessions every 10 minutes
if (ENABLED) {
    setInterval(cleanupSessions, 10 * 60 * 1000);
}

module.exports = {
    trackEvent,
    trackLogin,
    trackLogout,
    trackPageView,
    trackPostView,
    trackInteraction,
    trackTimeSpent,
    trackSearch,
    startSession,
    endSession,
    getSessionData,
    analyticsMiddleware
};
