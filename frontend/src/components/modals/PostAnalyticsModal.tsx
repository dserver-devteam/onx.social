import React, { useEffect, useState } from 'react';
import { X, BarChart3, Heart, Repeat2, MessageCircle, Bookmark } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { Post } from '@/types';

interface PostAnalyticsModalProps {
    post: Post;
    isOpen: boolean;
    onClose: () => void;
}

interface AnalyticsData {
    impressions: number;
    likes: number;
    reposts: number;
    replies: number;
    bookmarks: number;
    engagements: number;
    engagement_rate: string;
}

const PostAnalyticsModal: React.FC<PostAnalyticsModalProps> = ({ post, isOpen, onClose }) => {
    const { user } = useAuth();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && user) {
            fetchAnalytics();
        }
    }, [isOpen, user]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/posts/${post.id}/analytics`, {
                params: { user_id: user?.id }
            });
            setData(response.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-black border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Post Analytics
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-900 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : data ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                                    <div className="text-gray-500 text-sm mb-1">Impressions</div>
                                    <div className="text-2xl font-bold">{data.impressions}</div>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                                    <div className="text-gray-500 text-sm mb-1">Engagements</div>
                                    <div className="text-2xl font-bold">{data.engagements}</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-400 text-sm uppercase tracking-wider">Engagement Breakdown</h3>

                                <div className="flex items-center justify-between p-3 hover:bg-gray-900/30 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Heart className="w-5 h-5 text-pink-500" />
                                        <span>Likes</span>
                                    </div>
                                    <span className="font-bold">{data.likes}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 hover:bg-gray-900/30 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Repeat2 className="w-5 h-5 text-green-500" />
                                        <span>Reposts</span>
                                    </div>
                                    <span className="font-bold">{data.reposts}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 hover:bg-gray-900/30 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <MessageCircle className="w-5 h-5 text-blue-500" />
                                        <span>Replies</span>
                                    </div>
                                    <span className="font-bold">{data.replies}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 hover:bg-gray-900/30 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Bookmark className="w-5 h-5 text-blue-400" />
                                        <span>Bookmarks</span>
                                    </div>
                                    <span className="font-bold">{data.bookmarks}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-800">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Engagement Rate</span>
                                    <span className="font-bold text-primary">{data.engagement_rate}%</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            Failed to load analytics
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PostAnalyticsModal;
