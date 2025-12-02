export interface User {
    id: number;
    username: string;
    display_name: string;
    email: string;
    avatar_url?: string;
    banner_url?: string;
    bio?: string;
    location?: string;
    website?: string;
    email_verified: boolean;
    role?: string;
    status?: string;
}

export interface Post {
    id: number;
    content: string;
    media_url?: string;
    media_type?: 'image' | 'video';
    created_at: string;
    user_id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
    like_count: number;
    repost_count: number;
    retweets_count?: number;
    reply_count: number;
    user_liked?: boolean;
    user_reposted?: boolean;
    user_bookmarked?: boolean;
    parent_id?: number;
    quote_id?: number;
    quoted_post?: Post;
}
