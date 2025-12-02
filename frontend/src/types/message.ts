export interface Message {
    id: number;
    conversation_id: number;
    sender: {
        id: number;
        username: string;
        display_name: string;
        avatar_url: string;
    };
    content: string | null;
    image_url: string | null;
    is_read: boolean;
    created_at: string;
    read_at: string | null;
}

export interface Conversation {
    id: number;
    other_user: {
        id: number;
        username: string;
        display_name: string;
        avatar_url: string;
    };
    last_message: {
        content: string | null;
        image_url: string | null;
    };
    last_message_at: string;
    unread_count: number;
    created_at: string;
}

export interface SendMessageRequest {
    recipient_id: number;
    content?: string;
    image_url?: string;
}
