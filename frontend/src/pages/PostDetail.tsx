import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import PostCard from '@/components/feed/PostCard';
import ComposeModal from '@/components/modals/ComposeModal';
import type { Post } from '@/types';

const PostDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [post, setPost] = useState<Post | null>(null);
    const [replies, setReplies] = useState<Post[]>([]);
    const [parentPost, setParentPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [showReplyModal, setShowReplyModal] = useState(false);

    const fetchPostDetails = async () => {
        setLoading(true);
        try {
            // Fetch main post
            const postRes = await api.get(`/posts/${id}`, {
                params: { user_id: user?.id }
            });
            setPost(postRes.data);

            // Fetch parent if exists
            if (postRes.data.parent_id) {
                const parentRes = await api.get(`/posts/${postRes.data.parent_id}`, {
                    params: { user_id: user?.id }
                });
                setParentPost(parentRes.data);
            } else {
                setParentPost(null);
            }

            // Fetch replies
            const repliesRes = await api.get(`/posts/${id}/replies`, {
                params: { user_id: user?.id }
            });
            setReplies(repliesRes.data);
        } catch (error) {
            console.error('Error fetching post details:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchPostDetails();
        }
    }, [id, user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="text-center py-20">
                <h3 className="text-xl font-bold text-gray-500">Post not found</h3>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            {/* Header */}
            <div className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 z-10">
                <div className="p-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-900 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold">Post</h1>
                </div>
            </div>

            {/* Parent Post (if any) */}
            {parentPost && (
                <div className="relative">
                    <PostCard post={parentPost} />
                    <div className="absolute left-8 bottom-0 top-16 w-0.5 bg-gray-800 -z-10" />
                </div>
            )}

            {/* Main Post */}
            <div className="border-b border-gray-800">
                <PostCard post={post} isDetailView />
            </div>

            {/* Reply Input Trigger */}
            <div
                onClick={() => setShowReplyModal(true)}
                className="p-4 border-b border-gray-800 flex gap-4 cursor-text hover:bg-gray-900/30 transition-colors"
            >
                <div className="w-10 h-10 rounded-full bg-gray-800 flex-shrink-0 overflow-hidden">
                    {user?.avatar_url ? (
                        <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-purple-600" />
                    )}
                </div>
                <div className="flex-1 py-2 text-gray-500 text-lg">
                    Post your reply...
                </div>
                <button
                    className="px-4 py-1.5 bg-primary text-white rounded-full font-bold disabled:opacity-50"
                    disabled
                >
                    Reply
                </button>
            </div>

            {/* Replies Feed */}
            <div>
                {replies.map((reply) => (
                    <PostCard key={reply.id} post={reply} />
                ))}
                {replies.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        No replies yet. Be the first to reply!
                    </div>
                )}
            </div>

            {/* Reply Modal */}
            <ComposeModal
                isOpen={showReplyModal}
                onClose={() => setShowReplyModal(false)}
                onSuccess={() => {
                    fetchPostDetails();
                    setShowReplyModal(false);
                }}
                replyTo={post}
            />
        </div>
    );
};

export default PostDetail;
