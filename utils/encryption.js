const crypto = require('crypto');

// Algorithm for encryption
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Generate a random encryption key
 * @returns {string} - Base64 encoded encryption key
 */
function generateEncryptionKey() {
    return crypto.randomBytes(32).toString('base64');
}

/**
 * Encrypt text using AES-256-CBC
 * @param {string} text - Plain text to encrypt
 * @param {string} keyBase64 - Base64 encoded encryption key
 * @returns {string} - Encrypted text with IV prepended
 */
function encrypt(text, keyBase64) {
    const key = Buffer.from(keyBase64, 'base64');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Prepend IV to encrypted data
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt text using AES-256-CBC
 * @param {string} encryptedText - Encrypted text with IV prepended
 * @param {string} keyBase64 - Base64 encoded encryption key
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedText, keyBase64) {
    const key = Buffer.from(keyBase64, 'base64');
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

module.exports = {
    generateEncryptionKey,
    encrypt,
    decrypt
};
