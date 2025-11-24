// ===== NOTIFICATIONS ENDPOINTS =====

// GET /api/users/:id/notifications - Get user's notifications
router.get('/users/:id/notifications', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50 } = req.query;

        const query = `
            SELECT 
                n.*,
                u.username as actor_username,
                u.display_name as actor_display_name,
                u.avatar_url as actor_avatar_url,
                p.content as post_content
            FROM notifications n
            LEFT JOIN users u ON n.actor_id = u.id
            LEFT JOIN posts p ON n.post_id = p.id
            WHERE n.user_id = $1
            ORDER BY n.created_at DESC
            LIMIT $2
        `;

        const result = await pool.query(query, [id, limit]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// POST /api/notifications/:id/read - Mark notification as read
router.post('/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query('UPDATE notifications SET read = TRUE WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// POST /api/notifications/read-all - Mark all notifications as read
router.post('/notifications/read-all', async (req, res) => {
    try {
        const { user_id } = req.body;

        await pool.query('UPDATE notifications SET read = TRUE WHERE user_id = $1', [user_id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});

// Helper function to create notification
async function createNotification(userId, type, actorId, postId = null, conversationId = null, message = null) {
    try {
        const query = `
            INSERT INTO notifications (user_id, type, actor_id, post_id, conversation_id, message)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        await pool.query(query, [userId, type, actorId, postId, conversationId, message]);
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

// ===== MESSAGING ENDPOINTS =====

// GET /api/users/:id/conversations - Get user's conversations
router.get('/users/:id/conversations', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id);

        const query = `
            SELECT 
                c.*,
                CASE 
                    WHEN c.user1_id = $1 THEN u2.id
                    ELSE u1.id
                END as other_user_id,
                CASE 
                    WHEN c.user1_id = $1 THEN u2.username
                    ELSE u1.username
                END as other_username,
                CASE 
                    WHEN c.user1_id = $1 THEN u2.display_name
                    ELSE u1.display_name
                END as other_display_name,
                CASE 
                    WHEN c.user1_id = $1 THEN u2.avatar_url
                    ELSE u1.avatar_url
                END as other_avatar_url,
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
            FROM conversations c
            JOIN users u1 ON c.user1_id = u1.id
            JOIN users u2 ON c.user2_id = u2.id
            WHERE (c.user1_id = $1 OR c.user2_id = $1)
            AND c.status = 'accepted'
            ORDER BY c.updated_at DESC
        `;

        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// GET /api/users/:id/message-requests - Get pending message requests
router.get('/users/:id/message-requests', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id);

        const query = `
            SELECT 
                c.*,
                CASE 
                    WHEN c.user1_id = $1 THEN u2.id
                    ELSE u1.id
                END as other_user_id,
                CASE 
                    WHEN c.user1_id = $1 THEN u2.username
                    ELSE u1.username
                END as other_username,
                CASE 
                    WHEN c.user1_id = $1 THEN u2.display_name
                    ELSE u1.display_name
                END as other_display_name,
                CASE 
                    WHEN c.user1_id = $1 THEN u2.avatar_url
                    ELSE u1.avatar_url
                END as other_avatar_url
            FROM conversations c
            JOIN users u1 ON c.user1_id = u1.id
            JOIN users u2 ON c.user2_id = u2.id
            WHERE c.user2_id = $1
            AND c.status = 'pending'
            ORDER BY c.created_at DESC
        `;

        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching message requests:', error);
        res.status(500).json({ error: 'Failed to fetch message requests' });
    }
});

// POST /api/conversations - Create or get conversation
router.post('/conversations', async (req, res) => {
    try {
        const { user1_id, user2_id } = req.body;

        // Ensure user1_id < user2_id for uniqueness constraint
        const [smallerId, largerId] = user1_id < user2_id ? [user1_id, user2_id] : [user2_id, user1_id];

        // Check if conversation already exists
        let result = await pool.query(
            'SELECT * FROM conversations WHERE user1_id = $1 AND user2_id = $2',
            [smallerId, largerId]
        );

        if (result.rows.length > 0) {
            return res.json(result.rows[0]);
        }

        // Check if both users follow each other
        const followCheck = await pool.query(
            `SELECT 
                EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2) as user1_follows_user2,
                EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = $1) as user2_follows_user1
            `,
            [user1_id, user2_id]
        );

        const { user1_follows_user2, user2_follows_user1 } = followCheck.rows[0];

        if (!user1_follows_user2 || !user2_follows_user1) {
            return res.status(403).json({ error: 'Both users must follow each other to start a conversation' });
        }

        // Create new conversation with encryption key
        const encryptionKey = generateEncryptionKey();

        result = await pool.query(
            `INSERT INTO conversations (user1_id, user2_id, encryption_key, status)
             VALUES ($1, $2, $3, 'pending')
             RETURNING *`,
            [smallerId, largerId, encryptionKey]
        );

        const conversation = result.rows[0];

        // Create notification for the recipient
        const recipientId = user1_id === smallerId ? largerId : smallerId;
        await createNotification(recipientId, 'message_request', user1_id, null, conversation.id);

        res.json(conversation);
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

// POST /api/conversations/:id/accept - Accept message request
router.post('/conversations/:id/accept', async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            'UPDATE conversations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['accepted', id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error accepting conversation:', error);
        res.status(500).json({ error: 'Failed to accept conversation' });
    }
});

// GET /api/conversations/:id/messages - Get messages in a conversation
router.get('/conversations/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.query;

        // Verify user is part of conversation
        const convResult = await pool.query(
            'SELECT * FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
            [id, user_id]
        );

        if (convResult.rows.length === 0) {
            return res.status(403).json({ error: 'Not authorized to view this conversation' });
        }

        const conversation = convResult.rows[0];

        if (conversation.status !== 'accepted') {
            return res.status(403).json({ error: 'Conversation not accepted yet' });
        }

        // Get messages
        const messagesResult = await pool.query(
            `SELECT m.*, u.username, u.display_name, u.avatar_url
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.conversation_id = $1
             ORDER BY m.created_at ASC`,
            [id]
        );

        // Decrypt messages
        const messages = messagesResult.rows.map(msg => ({
            ...msg,
            content: decrypt(msg.encrypted_content, conversation.encryption_key),
            encrypted_content: undefined
        }));

        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /api/conversations/:id/messages - Send a message
router.post('/conversations/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        const { sender_id, content } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Verify conversation exists and user is part of it
        const convResult = await pool.query(
            'SELECT * FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2) AND status = $3',
            [id, sender_id, 'accepted']
        );

        if (convResult.rows.length === 0) {
            return res.status(403).json({ error: 'Not authorized or conversation not accepted' });
        }

        const conversation = convResult.rows[0];

        // Encrypt message
        const encryptedContent = encrypt(content, conversation.encryption_key);

        // Save message
        const result = await pool.query(
            `INSERT INTO messages (conversation_id, sender_id, encrypted_content)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [id, sender_id, encryptedContent]
        );

        // Update conversation timestamp
        await pool.query(
            'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});
