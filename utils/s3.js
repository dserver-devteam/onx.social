const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Upload } = require('@aws-sdk/lib-storage');
const crypto = require('crypto');

// Initialize S3 client for Garage
const s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || 'http://192.168.178.199:3900',
    region: 'local', // Garage region
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    },
    forcePathStyle: true // Required for Garage
});

// Bucket names
const BUCKETS = {
    PROFILE_PICTURE: 'profile-picture',
    PROFILE_BANNER: 'profile-banner',
    PICTURE_DATA: 'picture-data',
    TEMP_DATA: 'temp-data',
    LLM_DATA: process.env.LLM_DATA_BUCKET || 'llm-data',
    USER_DATA: process.env.USER_DATA_BUCKET || 'user-data'
};

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} bucket - Bucket name
 * @param {string} contentType - MIME type
 * @param {string} prefix - Optional prefix for the filename
 * @returns {Promise<string>} - URL of uploaded file
 */
async function uploadToS3(fileBuffer, bucket, contentType, prefix = '') {
    // Generate unique filename
    const fileExtension = getExtensionFromMimeType(contentType);
    const filename = `${prefix}${crypto.randomBytes(16).toString('hex')}${fileExtension}`;

    const upload = new Upload({
        client: s3Client,
        params: {
            Bucket: bucket,
            Key: filename,
            Body: fileBuffer,
            ContentType: contentType
        }
    });

    await upload.done();

    // Return public URL
    const endpoint = process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT || 'http://192.168.178.199:3900';
    return `${endpoint}/${bucket}/${filename}`;
}

/**
 * Delete a file from S3
 * @param {string} fileUrl - Full URL of the file
 * @returns {Promise<void>}
 */
async function deleteFromS3(fileUrl) {
    try {
        // Extract bucket and key from URL
        const url = new URL(fileUrl);
        const pathParts = url.pathname.split('/').filter(p => p);

        if (pathParts.length < 2) {
            throw new Error('Invalid S3 URL');
        }

        const bucket = pathParts[0];
        const key = pathParts.slice(1).join('/');

        const command = new DeleteObjectCommand({
            Bucket: bucket,
            Key: key
        });

        await s3Client.send(command);
    } catch (error) {
        console.error('Error deleting from S3:', error);
        throw error;
    }
}

/**
 * Get file extension from MIME type
 * @param {string} mimeType - MIME type
 * @returns {string} - File extension with dot
 */
function getExtensionFromMimeType(mimeType) {
    const mimeMap = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'video/mp4': '.mp4',
        'video/webm': '.webm',
        'video/quicktime': '.mov'
    };

    return mimeMap[mimeType] || '';
}

/**
 * Validate file type
 * @param {string} mimeType - MIME type
 * @returns {boolean}
 */
function isValidMediaType(mimeType) {
    const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/quicktime'
    ];

    return validTypes.includes(mimeType);
}

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @param {string} type - 'image' or 'video'
 * @returns {boolean}
 */
function isValidFileSize(size, type) {
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

    if (type === 'image') {
        return size <= MAX_IMAGE_SIZE;
    } else if (type === 'video') {
        return size <= MAX_VIDEO_SIZE;
    }

    return false;
}

/**
 * Generate a pre-signed URL for an S3 object
 * @param {string} bucket - Bucket name
 * @param {string} key - Object key
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} - Pre-signed URL
 */
async function generatePresignedUrl(bucket, key, expiresIn = 3600) {
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
}

module.exports = {
    s3Client,
    BUCKETS,
    uploadToS3,
    deleteFromS3,
    isValidMediaType,
    isValidFileSize,
    getExtensionFromMimeType,
    generatePresignedUrl
};
