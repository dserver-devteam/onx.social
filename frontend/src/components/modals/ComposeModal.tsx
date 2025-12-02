import React, { useState, useRef } from 'react';
import { X, Image, Video, Smile, MapPin, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface Post {
    id: number;
    content: string;
    user_id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
}

interface ComposeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    onPostCreated?: () => void;
    replyTo?: Post | null;
    quoteTo?: Post | null;
}

const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSuccess, onPostCreated, replyTo, quoteTo }) => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
    const [isPosting, setIsPosting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const MAX_CHARS = 280;

    if (!isOpen) return null;
    if (!user) return null; // Don't render if not logged in


    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Limit to 4 media files
        const newFiles = [...mediaFiles, ...files].slice(0, 4);
        setMediaFiles(newFiles);

        // Create previews
        const newPreviews: string[] = [];
        newFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                newPreviews.push(reader.result as string);
                if (newPreviews.length === newFiles.length) {
                    setMediaPreviews(newPreviews);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const removeMedia = (index: number) => {
        setMediaFiles(mediaFiles.filter((_, i) => i !== index));
        setMediaPreviews(mediaPreviews.filter((_, i) => i !== index));
    };

    const handlePost = async () => {
        if (!user) {
            alert('You must be logged in to post');
            onClose();
            return;
        }

        if (!content.trim() && mediaFiles.length === 0) return;
        if (content.length > MAX_CHARS) return;

        setIsPosting(true);

        try {
            const formData = new FormData();
            formData.append('content', content);
            formData.append('user_id', user.id.toString());

            if (replyTo) {
                formData.append('parent_id', replyTo.id.toString());
            }

            if (quoteTo) {
                formData.append('quote_id', quoteTo.id.toString());
            }

            mediaFiles.forEach((file) => {
                formData.append('media', file);
            });

            await api.post('/posts', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Reset form
            setContent('');
            setMediaFiles([]);
            setMediaPreviews([]);

            // Notify parent and close
            onPostCreated?.();
            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error('Post creation error:', error);
            alert(error.response?.data?.error || 'Failed to create post');
        } finally {
            setIsPosting(false);
        }
    };

    const charsRemaining = MAX_CHARS - content.length;
    const isOverLimit = charsRemaining < 0;
    const canPost = content.trim().length > 0 || mediaFiles.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-black border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-900 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handlePost}
                        disabled={!canPost || isPosting || isOverLimit}
                        className="bg-primary text-white font-bold py-2 px-6 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPosting ? 'Posting...' : 'Post'}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex gap-3">
                        {/* User Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                            <img
                                src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                                alt={user?.username}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Compose Area */}
                        <div className="flex-1">
                            {replyTo && (
                                <div className="text-gray-500 text-sm mb-2">
                                    Replying to <span className="text-primary">@{replyTo.username}</span>
                                </div>
                            )}
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={replyTo ? "Post your reply" : quoteTo ? "Add a comment..." : "What's happening?"}
                                className="w-full bg-transparent text-xl resize-none outline-none placeholder-gray-500 min-h-[120px]"
                                autoFocus
                            />

                            {/* Quote Preview */}
                            {quoteTo && (
                                <div className="mt-2 border border-gray-800 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-5 h-5 rounded-full bg-gray-700 overflow-hidden">
                                            <img
                                                src={quoteTo.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${quoteTo.username}`}
                                                alt={quoteTo.username}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <span className="font-bold text-sm">{quoteTo.display_name}</span>
                                        <span className="text-gray-500 text-sm">@{quoteTo.username}</span>
                                    </div>
                                    <div className="text-sm text-gray-300 line-clamp-3">
                                        {quoteTo.content}
                                    </div>
                                </div>
                            )}

                            {/* Media Previews */}
                            {mediaPreviews.length > 0 && (
                                <div className={`grid gap-2 mt-4 ${mediaPreviews.length === 1 ? 'grid-cols-1' :
                                    mediaPreviews.length === 2 ? 'grid-cols-2' :
                                        'grid-cols-2'
                                    }`}>
                                    {mediaPreviews.map((preview, index) => (
                                        <div key={index} className="relative group rounded-lg overflow-hidden bg-gray-900">
                                            <img
                                                src={preview}
                                                alt={`Upload ${index + 1}`}
                                                className="w-full h-48 object-cover"
                                            />
                                            <button
                                                onClick={() => removeMedia(index)}
                                                className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black rounded-full transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-800 p-4">
                    <div className="flex items-center justify-between">
                        {/* Media Buttons */}
                        <div className="flex items-center gap-1">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={mediaFiles.length >= 4}
                                className="p-2 hover:bg-primary/10 text-primary rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Add photos or videos"
                            >
                                <Image className="w-5 h-5" />
                            </button>
                            <button
                                className="p-2 hover:bg-primary/10 text-primary rounded-full transition-colors opacity-50 cursor-not-allowed"
                                title="GIF (coming soon)"
                                disabled
                            >
                                <Video className="w-5 h-5" />
                            </button>
                            <button
                                className="p-2 hover:bg-primary/10 text-primary rounded-full transition-colors opacity-50 cursor-not-allowed"
                                title="Emoji (coming soon)"
                                disabled
                            >
                                <Smile className="w-5 h-5" />
                            </button>
                            <button
                                className="p-2 hover:bg-primary/10 text-primary rounded-full transition-colors opacity-50 cursor-not-allowed"
                                title="Location (coming soon)"
                                disabled
                            >
                                <MapPin className="w-5 h-5" />
                            </button>
                            <button
                                className="p-2 hover:bg-primary/10 text-primary rounded-full transition-colors opacity-50 cursor-not-allowed"
                                title="Schedule (coming soon)"
                                disabled
                            >
                                <Calendar className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Character Counter */}
                        <div className="flex items-center gap-3">
                            {content.length > 0 && (
                                <div className={`text-sm font-medium ${isOverLimit ? 'text-red-500' :
                                    charsRemaining < 20 ? 'text-yellow-500' :
                                        'text-gray-500'
                                    }`}>
                                    {charsRemaining}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComposeModal;
