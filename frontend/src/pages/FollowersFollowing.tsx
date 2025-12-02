import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingStates';
import { getProxiedImageUrl } from '@/lib/utils';

interface User {
    id: number;
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    followers_count: number;
    following_count: number;
    is_following?: boolean;
}

const FollowersFollowing: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [followingState, setFollowingState] = useState<Record<number, boolean>>({});

    const tab = searchParams.get('tab') || 'followers';

    useEffect(() => {
        loadUsers();
    }, [username, tab]);

    const loadUsers = async () => {
        if (!username) return;

        try {
            setLoading(true);
            const endpoint = tab === 'followers'
                ? `/users/${username}/followers`
                : `/users/${username}/following`;

            const response = await api.get(endpoint, {
                params: { current_user_id: currentUser?.id }
            });

            setUsers(response.data);

            // Initialize following state
            const initialState: Record<number, boolean> = {};
            response.data.forEach((user: User) => {
                if (user.is_following !== undefined) {
                    initialState[user.id] = user.is_following;
                }
            });
            setFollowingState(initialState);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (userId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUser) return;

        try {
            if (followingState[userId]) {
                await api.delete(`/users/${userId}/follow`, {
                    params: { user_id: currentUser.id }
                });
                setFollowingState(prev => ({ ...prev, [userId]: false }));
            } else {
                await api.post(`/users/${userId}/follow`, {
                    user_id: currentUser.id
                });
                setFollowingState(prev => ({ ...prev, [userId]: true }));
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    };

    const switchTab = (newTab: 'followers' | 'following') => {
        setSearchParams({ tab: newTab });
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-gray-800 z-10">
                <div className="p-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-900 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">@{username}</h1>
                        <p className="text-sm text-gray-500">
                            {tab === 'followers' ? 'Followers' : 'Following'}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-800">
                    <button
                        onClick={() => switchTab('followers')}
                        className={`flex-1 text-center py-4 font-bold transition-colors relative ${tab === 'followers'
                            ? 'text-white'
                            : 'text-gray-500 hover:bg-white/5'
                            }`}
                    >
                        Followers
                        {tab === 'followers' && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
                        )}
                    </button>
                    <button
                        onClick={() => switchTab('following')}
                        className={`flex-1 text-center py-4 font-bold transition-colors relative ${tab === 'following'
                            ? 'text-white'
                            : 'text-gray-500 hover:bg-white/5'
                            }`}
                    >
                        Following
                        {tab === 'following' && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
                        )}
                    </button>
                </div>
            </div>

            {/* User List */}
            <div>
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                        <Users className="w-16 h-16 text-gray-700 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">
                            No {tab === 'followers' ? 'followers' : 'following'} yet
                        </h2>
                        <p className="text-gray-500 text-center">
                            {tab === 'followers'
                                ? 'When someone follows this account, they\'ll show up here.'
                                : 'This account isn\'t following anyone yet.'}
                        </p>
                    </div>
                ) : (
                    users.map((user) => (
                        <div
                            key={user.id}
                            className="flex items-start gap-3 p-4 border-b border-gray-800 hover:bg-white/5 transition-colors cursor-pointer"
                            onClick={() => navigate(`/profile/${user.username}`)}
                        >
                            <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                                {user.avatar_url ? (
                                    <img
                                        src={getProxiedImageUrl(user.avatar_url)}
                                        alt={user.username}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary to-purple-600" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-white truncate">
                                            {user.display_name}
                                        </div>
                                        <div className="text-sm text-gray-500 truncate">
                                            @{user.username}
                                        </div>
                                    </div>

                                    {currentUser && user.id !== currentUser.id && (
                                        <button
                                            onClick={(e) => handleFollow(user.id, e)}
                                            className={`ml-3 px-4 py-1.5 rounded-full font-bold text-sm transition-colors flex-shrink-0 ${followingState[user.id]
                                                ? 'bg-transparent border border-gray-600 text-white hover:bg-red-900/20 hover:border-red-600 hover:text-red-600'
                                                : 'bg-white text-black hover:bg-gray-200'
                                                }`}
                                        >
                                            {followingState[user.id] ? 'Following' : 'Follow'}
                                        </button>
                                    )}
                                </div>

                                {user.bio && (
                                    <div className="text-sm text-gray-400 mt-1 line-clamp-2">
                                        {user.bio}
                                    </div>
                                )}

                                <div className="flex gap-3 text-sm text-gray-500 mt-2">
                                    <div>
                                        <span className="font-bold text-white">{user.following_count}</span> Following
                                    </div>
                                    <div>
                                        <span className="font-bold text-white">{user.followers_count}</span> Followers
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FollowersFollowing;
