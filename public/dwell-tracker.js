/**
 * Dwell Time Tracker for onx.social
 * 
 * Tracks how long users view posts using IntersectionObserver.
 * Sends dwell events to the algorithm service for personalization.
 */

class DwellTracker {
    constructor(apiBase = '/api') {
        this.apiBase = apiBase;
        this.dwellData = new Map(); // post_id -> {startTime, totalDwell, element}
        this.observer = null;
        this.batchQueue = [];
        this.batchTimeout = null;
        this.BATCH_DELAY_MS = 2000; // Send batched events every 2 seconds
        this.MIN_DWELL_SECONDS = 2; // Minimum dwell time to track
    }

    /**
     * Initialize the dwell tracker
     */
    init() {
        if (this.observer) {
            console.warn('[DwellTracker] Already initialized');
            return;
        }

        // Create IntersectionObserver to track post visibility
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const postId = entry.target.dataset.postId;
                if (!postId) return;

                if (entry.isIntersecting) {
                    this.handlePostEnterViewport(postId, entry.target);
                } else {
                    this.handlePostLeaveViewport(postId);
                }
            });
        }, {
            threshold: 0.5, // Post must be 50% visible
            rootMargin: '0px'
        });

        console.log('[DwellTracker] Initialized');
    }

    /**
     * Start tracking a post element
     */
    trackPost(postElement) {
        if (!this.observer) {
            console.error('[DwellTracker] Not initialized. Call init() first.');
            return;
        }

        const postId = postElement.dataset.postId;
        if (!postId) {
            console.warn('[DwellTracker] Post element missing data-post-id attribute');
            return;
        }

        this.observer.observe(postElement);
    }

    /**
     * Track all posts currently in the DOM
     */
    trackAllPosts() {
        const posts = document.querySelectorAll('.post[data-post-id]');
        posts.forEach(post => this.trackPost(post));
        console.log(`[DwellTracker] Tracking ${posts.length} posts`);
    }

    /**
     * Handle post entering viewport
     */
    handlePostEnterViewport(postId, element) {
        const now = Date.now();

        let data = this.dwellData.get(postId);
        if (!data) {
            data = {
                startTime: now,
                totalDwell: 0,
                element: element
            };
            this.dwellData.set(postId, data);
        } else {
            // Post re-entered viewport
            data.startTime = now;
        }

        // console.log(`[DwellTracker] Post ${postId} entered viewport`);
    }

    /**
     * Handle post leaving viewport
     */
    handlePostLeaveViewport(postId) {
        const data = this.dwellData.get(postId);
        if (!data || !data.startTime) return;

        const dwellTime = (Date.now() - data.startTime) / 1000; // Convert to seconds
        data.totalDwell += dwellTime;
        data.startTime = null; // Mark as not currently visible

        // Only track if dwell time is significant
        if (dwellTime >= this.MIN_DWELL_SECONDS) {
            this.queueDwellEvent(postId, Math.floor(dwellTime));
            // console.log(`[DwellTracker] Post ${postId} viewed for ${dwellTime.toFixed(1)}s`);
        }
    }

    /**
     * Queue a dwell event for batch sending
     */
    queueDwellEvent(postId, dwellSeconds) {
        this.batchQueue.push({
            post_id: postId,
            dwell_seconds: dwellSeconds,
            timestamp: Date.now()
        });

        // Schedule batch send if not already scheduled
        if (!this.batchTimeout) {
            this.batchTimeout = setTimeout(() => {
                this.sendBatchedEvents();
            }, this.BATCH_DELAY_MS);
        }
    }

    /**
     * Send batched dwell events to server
     */
    async sendBatchedEvents() {
        if (this.batchQueue.length === 0) return;

        const events = [...this.batchQueue];
        this.batchQueue = [];
        this.batchTimeout = null;

        try {
            // Get current user
            const userStr = localStorage.getItem('user');
            if (!userStr) return; // Not logged in

            const user = JSON.parse(userStr);

            // Send each event (in production, use a batch endpoint)
            for (const event of events) {
                await fetch(`${this.apiBase}/interactions/track`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: user.id,
                        post_id: event.post_id,
                        action: event.dwell_seconds >= 30 ? 'dwell_30sec' : 'view',
                        dwell_time_seconds: event.dwell_seconds
                    })
                }).catch(err => {
                    console.error('[DwellTracker] Failed to send event:', err);
                });
            }

            console.log(`[DwellTracker] Sent ${events.length} dwell events`);
        } catch (error) {
            console.error('[DwellTracker] Error sending batched events:', error);
        }
    }

    /**
     * Track interaction (like, retweet, reply)
     */
    async trackInteraction(postId, action) {
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;

            const user = JSON.parse(userStr);

            await fetch(`${this.apiBase}/interactions/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: user.id,
                    post_id: postId,
                    action: action,
                    dwell_time_seconds: 0
                })
            });

            console.log(`[DwellTracker] Tracked ${action} on post ${postId}`);
        } catch (error) {
            console.error('[DwellTracker] Error tracking interaction:', error);
        }
    }

    /**
     * Cleanup when page unloads
     */
    cleanup() {
        // Send any remaining events
        if (this.batchQueue.length > 0) {
            this.sendBatchedEvents();
        }

        // Calculate final dwell times for visible posts
        for (const [postId, data] of this.dwellData.entries()) {
            if (data.startTime) {
                this.handlePostLeaveViewport(postId);
            }
        }

        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Create global instance
window.dwellTracker = new DwellTracker();

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.dwellTracker.init();
    });
} else {
    window.dwellTracker.init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    window.dwellTracker.cleanup();
});
