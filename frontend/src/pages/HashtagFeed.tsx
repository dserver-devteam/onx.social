import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import PostCard from '@/components/feed/PostCard';
import type { Post } from '@/types';

const HashtagFeed: React.FC = () => {
    const { hashtag } = useParams<{ hashtag: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ post_count: 0 });

    useEffect(() => {
        if (hashtag) {
            fetchHashtagPosts();
        }
    }, [hashtag, user]);

    const fetchHashtagPosts = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/trending/posts/${hashtag}`, {
                params: { user_id: user?.id, limit: 50 }
            });
            setPosts(response.data);
            setStats({ post_count: response.data.length });
        } catch (error) {
            console.error('Error fetching hashtag posts:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!hashtag) {
        return null;
    }

    return (
        <div className="min-h-screen pb-20">
            {/* Header */}
            <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-gray-800 z-10">
                <div className="p-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-900 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <Hash className="w-6 h-6 text-primary" />
                            <h1 className="text-2xl font-bold">{hashtag}</h1>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            {stats.post_count.toLocaleString()} {stats.post_count === 1 ? 'post' : 'posts'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Banner */}
            <div className="border-b border-gray-800 p-4 bg-gray-900/30">
                <div className="flex items-center gap-2 text-gray-400">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-sm">Trending topic</span>
                </div>
            </div>

            {/* Posts Feed */}
            <div>
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : posts.length > 0 ? (
                    posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))
                ) : (
                    <div className="text-center py-20 text-gray-500">
                        <Hash className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-xl font-bold mb-2">No posts found</p>
                        <p className="text-sm">Be the first to post about #{hashtag}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HashtagFeed;
