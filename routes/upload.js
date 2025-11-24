const express = require('express');
const multer = require('multer');
const { uploadToS3, BUCKETS, isValidMediaType, isValidFileSize } = require('../utils/s3');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max
    }
});

// POST /upload/profile-picture - Upload profile picture
router.post('/profile-picture', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Validate file type
        if (!isValidMediaType(req.file.mimetype)) {
            return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
        }

        // Validate it's an image
        if (!req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ error: 'Only images are allowed for profile pictures' });
        }

        // Validate file size (5MB for profile pictures)
        if (!isValidFileSize(req.file.size, 'image')) {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }

        // Upload to S3
        const fileUrl = await uploadToS3(
            req.file.buffer,
            BUCKETS.PROFILE_PICTURE,
            req.file.mimetype,
            'avatar-'
        );

        res.json({ url: fileUrl });
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// POST /upload/profile-banner - Upload profile banner
router.post('/profile-banner', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Validate file type
        if (!isValidMediaType(req.file.mimetype)) {
            return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
        }

        // Validate it's an image
        if (!req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ error: 'Only images are allowed for profile banners' });
        }

        // Validate file size
        if (!isValidFileSize(req.file.size, 'image')) {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }

        // Upload to S3
        const fileUrl = await uploadToS3(
            req.file.buffer,
            BUCKETS.PROFILE_BANNER,
            req.file.mimetype,
            'banner-'
        );

        res.json({ url: fileUrl });
    } catch (error) {
        console.error('Error uploading profile banner:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// POST /upload/post-media - Upload post media (image or video)
router.post('/post-media', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Validate file type
        if (!isValidMediaType(req.file.mimetype)) {
            return res.status(400).json({ error: 'Invalid file type. Only images and videos are allowed.' });
        }

        // Determine if it's image or video
        const isImage = req.file.mimetype.startsWith('image/');
        const isVideo = req.file.mimetype.startsWith('video/');

        if (!isImage && !isVideo) {
            return res.status(400).json({ error: 'Only images and videos are allowed' });
        }

        // Validate file size
        const mediaType = isImage ? 'image' : 'video';
        if (!isValidFileSize(req.file.size, mediaType)) {
            const maxSize = isImage ? '5MB' : '50MB';
            return res.status(400).json({ error: `File too large. Maximum size is ${maxSize}.` });
        }

        // Upload to S3
        const prefix = isImage ? 'img-' : 'vid-';
        const fileUrl = await uploadToS3(
            req.file.buffer,
            BUCKETS.PICTURE_DATA,
            req.file.mimetype,
            prefix
        );

        res.json({
            url: fileUrl,
            type: mediaType
        });
    } catch (error) {
        console.error('Error uploading post media:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

module.exports = router;
