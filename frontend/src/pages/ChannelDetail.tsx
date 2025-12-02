import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import ChannelUpdate from '@/components/channels/ChannelUpdate';

interface Channel {
    id: number;
    name: string;
    description?: string;
    avatar_url?: string;
    follower_count: number;
    is_verified?: boolean;
    is_following?: boolean;
    creator_id: number;
    creator_username: string;
    creator_display_name: string;
    creator_avatar?: string;
}

interface Update {
    id: number;
    content: string;
    media_url?: string;
    created_at: string;
}

const ChannelDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [channel, setChannel] = useState<Channel | null>(null);
    const [updates, setUpdates] = useState<Update[]>([]);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState(false);
    const [newUpdate, setNewUpdate] = useState('');
    const [posting, setPosting] = useState(false);

    const isOwner = user && channel && user.id === channel.creator_id;

    const fetchChannel = async () => {
        try {
            const response = await api.get(`/channels/${id}`, {
                params: { user_id: user?.id },
            });
            setChannel(response.data);
            setFollowing(response.data.is_following || false);
        } catch (error) {
            console.error('Error fetching channel:', error);
        }
    };

    const fetchUpdates = async () => {
        try {
            const response = await api.get(`/channels/${id}/updates`);
            setUpdates(response.data);
        } catch (error) {
            console.error('Error fetching updates:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchChannel();
            fetchUpdates();
        }
    }, [id, user]);

    const handleFollow = async () => {
        if (!user) {
            alert('Please login to follow channels');
            return;
        }

        try {
            if (following) {
                await api.delete(`/channels/${id}/follow`, {
                    data: { user_id: user.id },
                });
                setFollowing(false);
                if (channel) {
                    setChannel({ ...channel, follower_count: channel.follower_count - 1 });
                }
            } else {
                await api.post(`/channels/${id}/follow`, {
                    user_id: user.id,
                });
                setFollowing(true);
                if (channel) {
                    setChannel({ ...channel, follower_count: channel.follower_count + 1 });
                }
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    };

    const handlePostUpdate = async () => {
        if (!user || !newUpdate.trim()) return;

        setPosting(true);
        try {
            const response = await api.post(`/channels/${id}/updates`, {
                content: newUpdate.trim(),
                user_id: user.id,
            });

            setUpdates([response.data, ...updates]);
            setNewUpdate('');
        } catch (error: any) {
            console.error('Error posting update:', error);
            alert(error.response?.data?.error || 'Failed to post update');
        } finally {
            setPosting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!channel) {
        return (
            <div className="text-center py-20">
                <h3 className="text-xl font-bold text-gray-500">Channel not found</h3>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 z-10">
                <div className="p-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate('/updates')}
                        className="p-2 hover:bg-gray-900 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">{channel.name}</h1>
                        <p className="text-sm text-gray-500">{updates.length} updates</p>
                    </div>
                </div>
            </div>

            {/* Channel Info */}
            <div className="border-b border-gray-800 p-6">
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                        {channel.avatar_url ? (
                            <img
                                src={channel.avatar_url}
                                alt={channel.name}
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            channel.name.charAt(0).toUpperCase()
                        )}
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-bold">{channel.name}</h2>
                            {channel.is_verified && (
                                <CheckCircle className="w-6 h-6 text-primary" />
                            )}
                        </div>
                        <p className="text-gray-500 mb-2">by {channel.creator_display_name}</p>
                        {channel.description && (
                            <p className="text-gray-400 mb-4">{channel.description}</p>
                        )}

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-gray-500">
                                <Users className="w-5 h-5" />
                                <span>{channel.follower_count.toLocaleString()} followers</span>
                            </div>

                            {!isOwner && user && (
                                <button
                                    onClick={handleFollow}
                                    className={`px-6 py-2 rounded-full font-bold transition-colors ${following
                                            ? 'bg-gray-800 hover:bg-gray-700'
                                            : 'bg-primary text-white hover:bg-primary/90'
                                        }`}
                                >
                                    {following ? 'Following' : 'Follow'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Post Update (Owner Only) */}
            {isOwner && (
                <div className="border-b border-gray-800 p-4">
                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {user.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <textarea
                                value={newUpdate}
                                onChange={(e) => setNewUpdate(e.target.value)}
                                placeholder="Post an update to your channel..."
                                className="w-full bg-transparent text-xl outline-none resize-none"
                                rows={3}
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={handlePostUpdate}
                                    disabled={!newUpdate.trim() || posting}
                                    className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-full font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-4 h-4" />
                                    {posting ? 'Posting...' : 'Post Update'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Updates Feed */}
            <div>
                {updates.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-500">No updates yet</p>
                        {isOwner && (
                            <p className="text-gray-600 mt-2">Be the first to post an update!</p>
                        )}
                    </div>
                ) : (
                    updates.map((update) => (
                        <ChannelUpdate key={update.id} {...update} />
                    ))
                )}
            </div>
        </div>
    );
};

export default ChannelDetail;
