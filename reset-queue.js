const { loadQueueState, saveQueueState } = require('./utils/llm-storage');

async function resetQueue() {
    try {
        // Load current queue
        const queue = await loadQueueState();
        console.log(`Current queue: ${queue.length} jobs`);
        queue.forEach(j => console.log(`  - User ${j.userId}: ${j.status}`));

        // Remove failed jobs
        const cleaned = queue.filter(j => j.status !== 'failed');
        console.log(`\nAfter removing failed: ${cleaned.length} jobs`);

        // Add user 6 as fresh pending job
        cleaned.push({
            userId: 6,
            status: 'pending',
            addedAt: new Date().toISOString(),
            manual: true
        });

        console.log(`\nNew queue: ${cleaned.length} jobs`);
        cleaned.forEach(j => console.log(`  - User ${j.userId}: ${j.status}`));

        // Save
        await saveQueueState(cleaned);
        console.log('\n✅ Queue updated!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

resetQueue();
