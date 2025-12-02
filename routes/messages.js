const express = require('express');
const router = express.Router();

let pool;

function setPool(dbPool) {
    pool = dbPool;
}

// Middleware to check authentication (simple user_id check)
const requireAuth = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    req.userId = parseInt(userId);
    next();
};

// Helper function to get or create conversation between two users
async function getOrCreateConversation(user1Id, user2Id) {
    // Ensure user1_id < user2_id for consistency
    const [smallerId, largerId] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

    // Try to find existing conversation
    let result = await pool.query(
        'SELECT * FROM conversations WHERE user1_id = $1 AND user2_id = $2',
        [smallerId, largerId]
    );

    if (result.rows.length > 0) {
        return result.rows[0];
    }

    // Create new conversation
    result = await pool.query(
        'INSERT INTO conversations (user1_id, user2_id) VALUES ($1, $2) RETURNING *',
        [smallerId, largerId]
    );

    return result.rows[0];
}

// Helper function to get other user in conversation
function getOtherUserId(conversation, currentUserId) {
    return conversation.user1_id === currentUserId ? conversation.user2_id : conversation.user1_id;
}

// GET /api/messages/conversations - List all conversations for authenticated user
router.get('/conversations', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;

        // Get all conversations where user is participant
        const conversationsResult = await pool.query(`
            SELECT 
                c.*,
                u1.id as user1_id, u1.username as user1_username, u1.display_name as user1_display_name, u1.avatar_url as user1_avatar_url,
                u2.id as user2_id, u2.username as user2_username, u2.display_name as user2_display_name, u2.avatar_url as user2_avatar_url,
                (SELECT content FROM messages WHERE conversation_id = c.id AND is_deleted = FALSE ORDER BY created_at DESC LIMIT 1) as last_message_content,
                (SELECT image_url FROM messages WHERE conversation_id = c.id AND is_deleted = FALSE ORDER BY created_at DESC LIMIT 1) as last_message_image,
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != $1 AND is_read = FALSE AND is_deleted = FALSE) as unread_count
            FROM conversations c
            JOIN users u1 ON c.user1_id = u1.id
            JOIN users u2 ON c.user2_id = u2.id
            WHERE c.user1_id = $1 OR c.user2_id = $1
            ORDER BY c.last_message_at DESC
        `, [userId]);

        // Format conversations with other user info
        const conversations = conversationsResult.rows.map(conv => {
            const otherUser = conv.user1_id === userId ? {
                id: conv.user2_id,
                username: conv.user2_username,
                display_name: conv.user2_display_name,
                avatar_url: conv.user2_avatar_url
            } : {
                id: conv.user1_id,
                username: conv.user1_username,
                display_name: conv.user1_display_name,
                avatar_url: conv.user1_avatar_url
            };

            return {
                id: conv.id,
                other_user: otherUser,
                last_message: {
                    content: conv.last_message_content,
                    image_url: conv.last_message_image
                },
                last_message_at: conv.last_message_at,
                unread_count: parseInt(conv.unread_count) || 0,
                created_at: conv.created_at
            };
        });

        res.json({ conversations });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// GET /api/messages/conversation/:userId - Get or create conversation with specific user
router.get('/conversation/:userId', requireAuth, async (req, res) => {
    try {
        const currentUserId = req.userId;
        const otherUserId = parseInt(req.params.userId);

        if (currentUserId === otherUserId) {
            return res.status(400).json({ error: 'Cannot create conversation with yourself' });
        }

        // Check if other user exists
        const userCheck = await pool.query('SELECT id, username, display_name, avatar_url FROM users WHERE id = $1', [otherUserId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const conversation = await getOrCreateConversation(currentUserId, otherUserId);

        res.json({
            conversation: {
                id: conversation.id,
                other_user: userCheck.rows[0],
                last_message: {
                    content: null,
                    image_url: null
                },
                last_message_at: conversation.last_message_at || conversation.created_at,
                unread_count: 0,
                created_at: conversation.created_at
            }
        });
    } catch (error) {
        console.error('Get/create conversation error:', error);
        res.status(500).json({ error: 'Failed to get conversation' });
    }
});

// GET /api/messages/:conversationId - Get messages in a conversation
router.get('/:conversationId', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const conversationId = parseInt(req.params.conversationId);
        const limit = parseInt(req.query.limit) || 50;
        const before = req.query.before; // Message ID for pagination

        // Verify user is part of this conversation
        const convCheck = await pool.query(
            'SELECT * FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
            [conversationId, userId]
        );

        if (convCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied to this conversation' });
        }

        // Get messages
        let query = `
            SELECT 
                m.*,
                u.username, u.display_name, u.avatar_url
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = $1 AND m.is_deleted = FALSE
        `;
        const params = [conversationId];

        if (before) {
            query += ' AND m.id < $2';
            params.push(before);
        }

        query += ' ORDER BY m.created_at DESC LIMIT $' + (params.length + 1);
        params.push(limit);

        const messagesResult = await pool.query(query, params);

        // Reverse to show oldest first
        const messages = messagesResult.rows.reverse().map(msg => ({
            id: msg.id,
            conversation_id: msg.conversation_id,
            sender: {
                id: msg.sender_id,
                username: msg.username,
                display_name: msg.display_name,
                avatar_url: msg.avatar_url
            },
            content: msg.content,
            image_url: msg.image_url,
            is_read: msg.is_read,
            created_at: msg.created_at,
            read_at: msg.read_at
        }));

        res.json({ messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /api/messages/send - Send a new message
router.post('/send', requireAuth, async (req, res) => {
    try {
        const senderId = req.userId;
        const { recipient_id, content, image_url } = req.body;

        if (!recipient_id) {
            return res.status(400).json({ error: 'Recipient ID is required' });
        }

        if (!content && !image_url) {
            return res.status(400).json({ error: 'Message must have content or image' });
        }

        // Get or create conversation
        const conversation = await getOrCreateConversation(senderId, parseInt(recipient_id));

        // Insert message
        const result = await pool.query(`
            INSERT INTO messages (conversation_id, sender_id, content, image_url)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [conversation.id, senderId, content || null, image_url || null]);

        const message = result.rows[0];

        // Get sender info
        const senderInfo = await pool.query(
            'SELECT username, display_name, avatar_url FROM users WHERE id = $1',
            [senderId]
        );

        res.status(201).json({
            message: {
                id: message.id,
                conversation_id: message.conversation_id,
                sender: {
                    id: senderId,
                    ...senderInfo.rows[0]
                },
                content: message.content,
                image_url: message.image_url,
                is_read: message.is_read,
                created_at: message.created_at
            }
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// PUT /api/messages/:messageId/read - Mark message as read
router.put('/:messageId/read', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const messageId = parseInt(req.params.messageId);

        // Get message and verify user is recipient
        const msgCheck = await pool.query(`
            SELECT m.*, c.user1_id, c.user2_id
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE m.id = $1
        `, [messageId]);

        if (msgCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }

        const message = msgCheck.rows[0];

        // Verify user is part of conversation and not the sender
        if (message.sender_id === userId) {
            return res.status(400).json({ error: 'Cannot mark own message as read' });
        }

        if (message.user1_id !== userId && message.user2_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Mark as read
        await pool.query(
            'UPDATE messages SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = $1',
            [messageId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Failed to mark message as read' });
    }
});

// PUT /api/messages/conversation/:conversationId/read-all - Mark all messages in conversation as read
router.put('/conversation/:conversationId/read-all', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const conversationId = parseInt(req.params.conversationId);

        // Verify user is part of conversation
        const convCheck = await pool.query(
            'SELECT * FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
            [conversationId, userId]
        );

        if (convCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Mark all messages from other user as read
        await pool.query(`
            UPDATE messages 
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
            WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE
        `, [conversationId, userId]);

        res.json({ success: true });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});

// DELETE /api/messages/:messageId - Delete a message (soft delete)
router.delete('/:messageId', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const messageId = parseInt(req.params.messageId);

        // Verify user is sender
        const msgCheck = await pool.query(
            'SELECT sender_id FROM messages WHERE id = $1',
            [messageId]
        );

        if (msgCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }

        if (msgCheck.rows[0].sender_id !== userId) {
            return res.status(403).json({ error: 'Can only delete your own messages' });
        }

        // Soft delete
        await pool.query(
            'UPDATE messages SET is_deleted = TRUE WHERE id = $1',
            [messageId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

// GET /api/messages/unread-count - Get total unread message count
router.get('/unread-count', requireAuth, async (req, res) => {
    try {
        const userId = req.userId;

        const result = await pool.query(`
            SELECT COUNT(*) as count
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE (c.user1_id = $1 OR c.user2_id = $1)
            AND m.sender_id != $1
            AND m.is_read = FALSE
            AND m.is_deleted = FALSE
        `, [userId]);

        res.json({ unread_count: parseInt(result.rows[0].count) || 0 });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

module.exports = { router, setPool };
