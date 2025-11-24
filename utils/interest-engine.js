const { Pool } = require('pg');

// Interaction weights
const WEIGHTS = {
    LIKE: 0.03,
    REPOST: 0.06, // Treating repost similar to follow for now, or slightly less than follow
    FOLLOW: 0.06,
    REPLY: 0.04,
    VIEW_LONG: 0.015,
    SKIP: -0.02
};

/**
 * Update user interest profile based on interaction
 * @param {Object} pool - Database pool
 * @param {number} userId - User ID
 * @param {Object} categories - Categories and their weights from the post { "gaming": 0.8, "tech": 0.2 }
 * @param {string} interactionType - Type of interaction (LIKE, REPOST, FOLLOW, etc.)
 */
async function updateInterests(pool, userId, categories, interactionType) {
    try {
        const weight = WEIGHTS[interactionType];
        if (!weight) {
            console.warn(`[Interest Engine] Unknown interaction type: ${interactionType}`);
            return;
        }

        // 1. Get current profile
        const userResult = await pool.query('SELECT interest_profile FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) return;

        let profile = userResult.rows[0].interest_profile || {};

        // 2. Update values
        // For each category in the post, update the user's interest
        for (const [category, catWeight] of Object.entries(categories)) {
            const currentVal = parseFloat(profile[category] || 0);
            // The update is proportional to the category's relevance in the post
            // e.g. if post is 80% gaming, 20% tech, and user likes it:
            // gaming += 0.03 * 0.8
            // tech += 0.03 * 0.2
            const delta = weight * parseFloat(catWeight);

            let newVal = currentVal + delta;

            // Ensure non-negative
            if (newVal < 0) newVal = 0;

            profile[category] = newVal;
        }

        // 3. Normalize vector
        // Sum all values
        let sum = 0;
        for (const val of Object.values(profile)) {
            sum += parseFloat(val);
        }

        // If sum is 0 (shouldn't happen often), do nothing or reset
        if (sum > 0) {
            // Normalize so sum = 1 (or just scale down if it gets too large? 
            // The spec says "value = value / sum(all_values)" which makes the vector sum to 1.
            // This is good for probability distribution but might dilute interests if user has MANY interests.
            // Let's follow the spec.
            for (const key of Object.keys(profile)) {
                profile[key] = parseFloat(profile[key]) / sum;
            }
        }

        // 4. Save back to DB
        await pool.query('UPDATE users SET interest_profile = $1 WHERE id = $2', [profile, userId]);
        console.log(`[Interest Engine] Updated profile for user ${userId} (${interactionType})`);

    } catch (error) {
        console.error('[Interest Engine] Error updating interests:', error);
    }
}

module.exports = {
    updateInterests,
    WEIGHTS
};
