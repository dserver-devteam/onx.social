import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface SuggestedUser {
    id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
    bio?: string;
    follower_count: string;
}

const WhoToFollowWidget: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<SuggestedUser[]>([]);
    const [following, setFollowing] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);

    const fetchSuggestions = async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            const response = await api.get('/users/suggestions', {
                params: { user_id: user.id, limit: 3 }
            });
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching user suggestions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuggestions();
    }, [user]);

    const handleFollow = async (userId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;

        try {
            await api.post('/follow', {
                follower_id: user.id,
                following_id: userId
            });
            setFollowing(prev => new Set(prev).add(userId));
        } catch (error) {
            console.error('Error following user:', error);
        }
    };

    const handleRefresh = () => {
        setLoading(true);
        fetchSuggestions();
    };

    if (!user || loading) {
        return null;
    }

    if (users.length === 0) {
        return null;
    }

    return (
        <div className="bg-gray-900/50 rounded-2xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Who to follow</h2>
            </div>

            <div className="space-y-3">
                {users.map((suggestedUser) => (
                    <div
                        key={suggestedUser.id}
                        className="flex items-start gap-3 p-2 hover:bg-gray-800/50 rounded-xl transition-colors cursor-pointer"
                        onClick={() => navigate(`/profile/${suggestedUser.username}`)}
                    >
                        <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                            {suggestedUser.avatar_url ? (
                                <img
                                    src={suggestedUser.avatar_url}
                                    alt={suggestedUser.username}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary to-purple-600" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-white truncate">
                                {suggestedUser.display_name}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                                @{suggestedUser.username}
                            </div>
                            {suggestedUser.bio && (
                                <div className="text-sm text-gray-400 mt-1 line-clamp-2">
                                    {suggestedUser.bio}
                                </div>
                            )}
                        </div>

                        {!following.has(suggestedUser.id) && (
                            <button
                                onClick={(e) => handleFollow(suggestedUser.id, e)}
                                className="px-4 py-1.5 bg-white text-black rounded-full font-bold text-sm hover:bg-gray-200 transition-colors flex-shrink-0"
                            >
                                Follow
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <button
                onClick={handleRefresh}
                className="w-full mt-3 p-3 text-primary hover:bg-primary/10 rounded-xl transition-colors text-sm font-medium"
            >
                Show more
            </button>
        </div>
    );
};

export default WhoToFollowWidget;
