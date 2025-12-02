import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Trash2, Users, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import CreateChannelModal from '@/components/modals/CreateChannelModal';

interface Channel {
    id: number;
    name: string;
    description?: string;
    avatar_url?: string;
    follower_count: number;
    created_at: string;
}

const ChannelManage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchMyChannels = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const response = await api.get('/my-channels', {
                params: { user_id: user.id },
            });
            setChannels(response.data);
        } catch (error) {
            console.error('Error fetching channels:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyChannels();
    }, [user]);

    const handleDelete = async (channelId: number, channelName: string) => {
        if (!confirm(`Are you sure you want to delete "${channelName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await api.delete(`/channels/${channelId}`, {
                data: { user_id: user?.id },
            });
            setChannels(channels.filter(c => c.id !== channelId));
            alert('Channel deleted successfully');
        } catch (error: any) {
            console.error('Error deleting channel:', error);
            alert(error.response?.data?.error || 'Failed to delete channel');
        }
    };

    if (!user) {
        return (
            <div className="text-center py-20">
                <h3 className="text-xl font-bold text-gray-500">Please login to manage channels</h3>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 z-10">
                <div className="p-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">My Channels</h1>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full font-bold hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">Create Channel</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : channels.length === 0 ? (
                    <div className="text-center py-20">
                        <Settings className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-500 mb-2">No channels yet</h3>
                        <p className="text-gray-600 mb-6">Create your first channel to start posting updates</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-primary text-white px-6 py-3 rounded-full font-bold hover:bg-primary/90 transition-colors"
                        >
                            Create Channel
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {channels.map((channel) => (
                            <div
                                key={channel.id}
                                className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Avatar */}
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
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

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg mb-1">{channel.name}</h3>
                                        {channel.description && (
                                            <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                                                {channel.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                                            <Users className="w-4 h-4" />
                                            <span>{channel.follower_count.toLocaleString()} followers</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => navigate(`/updates/${channel.id}`)}
                                            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                                            title="View channel"
                                        >
                                            <Settings className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(channel.id, channel.name)}
                                            className="p-2 hover:bg-red-900/20 text-red-500 rounded-full transition-colors"
                                            title="Delete channel"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Channel Modal */}
            <CreateChannelModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={fetchMyChannels}
            />
        </div>
    );
};

export default ChannelManage;
