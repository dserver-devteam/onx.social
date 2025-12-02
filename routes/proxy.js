const express = require('express');
const { getFileStream, getExtensionFromMimeType } = require('../utils/s3');
const router = express.Router();

// GET /api/proxy/image/:bucket/:key - Proxy S3 file
router.get('/image/:bucket/:key(*)', async (req, res) => {
    try {
        const { bucket, key } = req.params;

        if (!bucket || !key) {
            return res.status(400).json({ error: 'Bucket and key are required' });
        }

        try {
            const fileStream = await getFileStream(bucket, key);

            // Set appropriate headers based on file extension
            // This is a basic implementation. For better mime type handling, 
            // we could store the mime type in metadata or use a library like 'mime-types'
            const ext = key.split('.').pop().toLowerCase();
            let contentType = 'application/octet-stream';

            if (['jpg', 'jpeg'].includes(ext)) contentType = 'image/jpeg';
            else if (ext === 'png') contentType = 'image/png';
            else if (ext === 'gif') contentType = 'image/gif';
            else if (ext === 'webp') contentType = 'image/webp';
            else if (ext === 'mp4') contentType = 'video/mp4';
            else if (ext === 'webm') contentType = 'video/webm';

            res.setHeader('Content-Type', contentType);

            // Pipe the S3 stream to the response
            fileStream.pipe(res);
        } catch (s3Error) {
            console.error('S3 Error:', s3Error);
            if (s3Error.name === 'NoSuchKey') {
                return res.status(404).json({ error: 'File not found' });
            }
            throw s3Error;
        }
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Failed to retrieve file' });
    }
});

module.exports = router;
