import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { Post } from '@/types';

interface ReplyModalProps {
    post: Post;
    isOpen: boolean;
    onClose: () => void;
    onReplyCreated?: () => void;
}

const ReplyModal: React.FC<ReplyModalProps> = ({ post, isOpen, onClose, onReplyCreated }) => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;
    if (!user) return null; // Don't render if not logged in


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !content.trim() || isSubmitting) return;

        try {
            setIsSubmitting(true);
            await api.post(`/posts/${post.id}/reply`, {
                user_id: user.id,
                content: content.trim()
            });

            setContent('');
            onReplyCreated?.();
            onClose();
        } catch (error) {
            console.error('Error creating reply:', error);
            alert('Failed to post reply');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-black border border-gray-800 rounded-2xl w-full max-w-[600px] max-h-[80vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-black/95 backdrop-blur-md border-b border-gray-800 p-4 flex items-center justify-between z-10">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-900 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-bold">Reply</h2>
                    <div className="w-9" /> {/* Spacer for centering */}
                </div>

                {/* Original Post */}
                <div className="p-4 border-b border-gray-800">
                    <div className="flex gap-3">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                                <img
                                    src={post.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.username}`}
                                    alt={post.username}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold">{post.display_name}</span>
                                <span className="text-gray-500">@{post.username}</span>
                            </div>
                            <p className="text-white whitespace-pre-wrap">{post.content}</p>
                            <div className="mt-2 text-gray-500 text-sm">
                                Replying to <span className="text-primary">@{post.username}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSubmit} className="p-4">
                    <div className="flex gap-3">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                                <img
                                    src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                                    alt={user?.username}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Post your reply"
                                className="w-full bg-transparent text-white text-xl placeholder-gray-500 resize-none outline-none min-h-[100px]"
                                autoFocus
                                maxLength={280}
                            />
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-gray-500">
                                    {content.length}/280
                                </div>
                                <button
                                    type="submit"
                                    disabled={!content.trim() || isSubmitting}
                                    className="bg-primary text-white font-bold py-2 px-6 rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSubmitting ? 'Replying...' : 'Reply'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReplyModal;
