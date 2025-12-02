import React, { useState, useEffect } from 'react';
import { Search, Plus, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import ChannelCard from '@/components/channels/ChannelCard';
import CreateChannelModal from '@/components/modals/CreateChannelModal';

interface Channel {
    id: number;
    name: string;
    description?: string;
    avatar_url?: string;
    follower_count: number;
    is_verified?: boolean;
    is_following?: boolean;
    creator_username: string;
    creator_display_name: string;
}

const Updates: React.FC = () => {
    const { user } = useAuth();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchChannels = async () => {
        setLoading(true);
        try {
            const response = await api.get('/channels', {
                params: { user_id: user?.id },
            });
            setChannels(response.data);
        } catch (error) {
            console.error('Error fetching channels:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChannels();
    }, [user]);

    const filteredChannels = channels.filter((channel) =>
        channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        channel.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 z-10">
                <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold">Updates</h1>
                        {user && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full font-bold hover:bg-primary/90 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                <span className="hidden sm:inline">Create Channel</span>
                            </button>
                        )}
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search channels..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-full focus:outline-none focus:border-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : filteredChannels.length === 0 ? (
                    <div className="text-center py-20">
                        <TrendingUp className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-500 mb-2">
                            {searchQuery ? 'No channels found' : 'No channels yet'}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {searchQuery
                                ? 'Try a different search term'
                                : 'Be the first to create a channel!'}
                        </p>
                        {user && !searchQuery && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-primary text-white px-6 py-3 rounded-full font-bold hover:bg-primary/90 transition-colors"
                            >
                                Create Channel
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="mb-6">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                {searchQuery ? 'Search Results' : 'Trending Channels'}
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredChannels.map((channel) => (
                                <ChannelCard key={channel.id} {...channel} />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Create Channel Modal */}
            <CreateChannelModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={fetchChannels}
            />
        </div>
    );
};

export default Updates;
