import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '@/lib/api';
import type { Post } from '@/types';
import PostCard from './PostCard';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const Feed: React.FC = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [cursor, setCursor] = useState<string | null>(null);
    const observer = useRef<IntersectionObserver | null>(null);

    const fetchPosts = async (isInitial = false, nextCursor: string | null = null) => {
        try {
            if (isInitial) setLoading(true);
            else setLoadingMore(true);

            const params: any = { limit: 20 };
            if (user) params.user_id = user.id;
            if (nextCursor) params.cursor = nextCursor;

            // Use recommended feed if logged in, otherwise public posts
            const endpoint = user ? '/feed/recommended' : '/posts';

            const response = await api.get(endpoint, { params });

            let newPosts: Post[] = [];
            let newCursor: string | null = null;

            if (Array.isArray(response.data)) {
                newPosts = response.data;
                // Simple offset-based or no cursor for array response
                if (newPosts.length < 20) setHasMore(false);
            } else {
                newPosts = response.data.posts || [];
                newCursor = response.data.next_cursor;
                setCursor(newCursor);
                if (!newCursor && newPosts.length === 0) setHasMore(false);
            }

            setPosts(prev => isInitial ? newPosts : [...prev, ...newPosts]);
        } catch (error) {
            console.error('Error fetching feed:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchPosts(true);
    }, [user]);

    // Infinite scroll observer
    const lastPostElementRef = useCallback((node: HTMLDivElement) => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                fetchPosts(false, cursor);
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore, cursor]);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="pb-20">
            {posts.map((post, index) => {
                if (posts.length === index + 1) {
                    return <div ref={lastPostElementRef} key={post.id}><PostCard post={post} /></div>;
                } else {
                    return <PostCard key={post.id} post={post} />;
                }
            })}

            {loadingMore && (
                <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            )}

            {!hasMore && posts.length > 0 && (
                <div className="text-center p-8 text-gray-500">
                    You've reached the end!
                </div>
            )}

            {posts.length === 0 && !loading && (
                <div className="text-center p-8 text-gray-500">
                    No posts found. Be the first to post!
                </div>
            )}
        </div>
    );
};

export default Feed;
