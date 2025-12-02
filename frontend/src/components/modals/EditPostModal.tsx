import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { Post } from '@/types';

interface EditPostModalProps {
    post: Post;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (updatedPost: Post) => void;
}

const EditPostModal: React.FC<EditPostModalProps> = ({ post, isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [content, setContent] = useState(post.content);
    const [isSaving, setIsSaving] = useState(false);
    const MAX_CHARS = 280;

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!content.trim() || isSaving) return;
        if (content.length > MAX_CHARS) return;

        setIsSaving(true);

        try {
            const response = await api.put(`/posts/${post.id}`, {
                user_id: user?.id,
                content: content
            });

            onSuccess?.(response.data);
            onClose();
        } catch (error: any) {
            console.error('Error editing post:', error);
            alert(error.response?.data?.error || 'Failed to edit post');
        } finally {
            setIsSaving(false);
        }
    };

    const charsRemaining = MAX_CHARS - content.length;
    const isOverLimit = charsRemaining < 0;
    const canSave = content.trim().length > 0 && content !== post.content;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-black border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-900 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-bold">Edit Post</h2>
                    <button
                        onClick={handleSave}
                        disabled={!canSave || isSaving || isOverLimit}
                        className="bg-primary text-white font-bold py-2 px-6 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <div className="flex gap-3">
                        {/* User Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                            <img
                                src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                                alt={user?.username}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Edit Area */}
                        <div className="flex-1">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full bg-transparent text-xl resize-none outline-none placeholder-gray-500 min-h-[120px]"
                                autoFocus
                            />

                            {/* Media Preview (Read-only) */}
                            {post.media_url && (
                                <div className="mt-2 rounded-lg overflow-hidden border border-gray-800 opacity-70">
                                    {post.media_type === 'video' ? (
                                        <video src={post.media_url} className="w-full h-48 object-cover" />
                                    ) : (
                                        <img src={post.media_url} alt="Post media" className="w-full h-48 object-cover" />
                                    )}
                                    <div className="p-2 text-xs text-gray-500 text-center bg-gray-900">
                                        Media cannot be edited
                                    </div>
                                </div>
                            )}

                            <div className={`text-right mt-2 text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
                                {charsRemaining}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditPostModal;
