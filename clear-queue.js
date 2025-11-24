require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function clearQueue() {
    try {
        const emptyQueue = [];
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.LLM_DATA_BUCKET || 'llm-data',
            Key: 'queue/processing-queue.json',
            Body: JSON.stringify(emptyQueue),
            ContentType: 'application/json'
        }));
        console.log('✅ Queue cleared successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing queue:', error);
        process.exit(1);
    }
}

clearQueue();
