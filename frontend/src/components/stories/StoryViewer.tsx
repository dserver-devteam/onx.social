import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface Story {
    id: number;
    user_id: number;
    media_url: string;
    media_type: 'image' | 'video';
    caption?: string;
    created_at: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    viewed: boolean;
}

interface StoryViewerProps {
    userId: number;
    onClose: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ userId, onClose }) => {
    const { user } = useAuth();
    const [stories, setStories] = useState<Story[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    const currentStory = stories[currentIndex];
    const isOwner = user && currentStory && user.id === currentStory.user_id;

    useEffect(() => {
        fetchStories();
    }, [userId]);

    useEffect(() => {
        if (!currentStory) return;

        // Mark as viewed
        if (user && !currentStory.viewed) {
            api.post(`/stories/${currentStory.id}/view`, {
                viewer_id: user.id,
            }).catch(console.error);
        }

        // Auto-advance timer (5 seconds for images)
        if (currentStory.media_type === 'image') {
            const duration = 5000;
            const interval = 50;
            let elapsed = 0;

            const timer = setInterval(() => {
                elapsed += interval;
                setProgress((elapsed / duration) * 100);

                if (elapsed >= duration) {
                    handleNext();
                }
            }, interval);

            return () => clearInterval(timer);
        }
    }, [currentIndex, currentStory]);

    const fetchStories = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/stories/${userId}`, {
                params: { viewer_id: user?.id },
            });
            setStories(response.data);
        } catch (error) {
            console.error('Error fetching stories:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setProgress(0);
        } else {
            onClose();
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setProgress(0);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this story?')) return;

        try {
            await api.delete(`/stories/${currentStory.id}`, {
                data: { user_id: user?.id },
            });

            const newStories = stories.filter((_, i) => i !== currentIndex);
            if (newStories.length === 0) {
                onClose();
            } else {
                setStories(newStories);
                if (currentIndex >= newStories.length) {
                    setCurrentIndex(newStories.length - 1);
                }
            }
        } catch (error) {
            console.error('Error deleting story:', error);
            alert('Failed to delete story');
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const third = rect.width / 3;

        if (x < third) {
            handlePrevious();
        } else {
            handleNext();
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
        );
    }

    if (!currentStory) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black z-50">
            {/* Progress Bars */}
            <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
                {stories.map((_, index) => (
                    <div key={index} className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white transition-all"
                            style={{
                                width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%',
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                        {currentStory.avatar_url ? (
                            <img src={currentStory.avatar_url} alt={currentStory.display_name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                {currentStory.display_name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="font-bold text-white">{currentStory.display_name}</p>
                        <p className="text-xs text-gray-300">
                            {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isOwner && (
                        <button
                            onClick={handleDelete}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <Trash2 className="w-5 h-5 text-white" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>
            </div>

            {/* Story Content */}
            <div
                onClick={handleClick}
                className="w-full h-full flex items-center justify-center cursor-pointer"
            >
                {currentStory.media_type === 'image' ? (
                    <img
                        src={currentStory.media_url}
                        alt="Story"
                        className="max-w-full max-h-full object-contain"
                    />
                ) : (
                    <video
                        src={currentStory.media_url}
                        autoPlay
                        className="max-w-full max-h-full"
                        onEnded={handleNext}
                    />
                )}
            </div>

            {/* Caption */}
            {currentStory.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white text-center">{currentStory.caption}</p>
                </div>
            )}
        </div>
    );
};

export default StoryViewer;
