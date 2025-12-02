import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Link as LinkIcon, ArrowLeft, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, followUser, unfollowUser } from '@/lib/userService';
import PostCard from '@/components/feed/PostCard';
import api from '@/lib/api';
import type { Post } from '@/types';
import { ProfileSkeleton, PostSkeleton } from '@/components/ui/LoadingStates';
import { getProxiedImageUrl } from '@/lib/utils';

interface UserProfile {
    id: number;
    username: string;
    display_name: string;
    banner_url: string | null;
    avatar_url: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    created_at: string;
    followers_count: number;
    following_count: number;
    posts_count: number;
    is_following?: boolean;
}

type TabType = 'posts' | 'replies' | 'media' | 'likes';

const Profile: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('posts');

    useEffect(() => {
        loadProfile();
    }, [username]);

    useEffect(() => {
        if (profile) {
            loadPosts();
        }
    }, [activeTab, profile]);

    const loadProfile = async () => {
        if (!username) return;

        try {
            setLoading(true);
            const profileRes = await getUserProfile(username, currentUser?.id);
            setProfile(profileRes.data);
            setIsFollowing(profileRes.data.is_following || false);
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPosts = async () => {
        if (!username) return;

        try {
            setPostsLoading(true);
            let endpoint = '';

            switch (activeTab) {
                case 'posts':
                    const postsRes = await api.get(`/users/by-username/${username}/posts`, {
                        params: { user_id: currentUser?.id }
                    });
                    setPosts(postsRes.data);
                    break;
                case 'replies':
                    endpoint = `/users/${username}/replies`;
                    break;
                case 'media':
                    endpoint = `/users/${username}/media`;
                    break;
                case 'likes':
                    endpoint = `/users/${username}/likes`;
                    break;
            }

            if (endpoint) {
                const response = await api.get(endpoint, {
                    params: { current_user_id: currentUser?.id }
                });
                setPosts(response.data);
            }
        } catch (error) {
            console.error('Error loading posts:', error);
            setPosts([]);
        } finally {
            setPostsLoading(false);
        }
    };

    const handleFollow = async () => {
        if (!currentUser || !profile) return;

        try {
            if (isFollowing) {
                await unfollowUser(profile.id, currentUser.id);
                setIsFollowing(false);
                setProfile({ ...profile, followers_count: profile.followers_count - 1 });
            } else {
                await followUser(profile.id, currentUser.id);
                setIsFollowing(true);
                setProfile({ ...profile, followers_count: profile.followers_count + 1 });
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    };

    if (loading) {
        return <ProfileSkeleton />;
    }

    if (!profile) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-gray-500">User not found</div>
            </div>
        );
    }

    const isOwnProfile = currentUser?.username === username;

    const tabs: { id: TabType; label: string }[] = [
        { id: 'posts', label: 'Posts' },
        { id: 'replies', label: 'Replies' },
        { id: 'media', label: 'Media' },
        { id: 'likes', label: 'Likes' },
    ];

    return (
        <div>
            {/* Header */}
            <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-gray-800 z-10">
                <div className="flex items-center gap-8 p-4">
                    <button onClick={() => navigate(-1)} className="hover:bg-gray-900 p-2 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">{profile.display_name}</h1>
                        <p className="text-sm text-gray-500">{profile.posts_count} posts</p>
                    </div>
                </div>
            </div>

            {/* Profile Info */}
            <div className="border-b border-gray-800">
                {/* Cover Image */}
                <div className="h-48 bg-gray-800 overflow-hidden">
                    {profile.banner_url ? (
                        <img
                            src={getProxiedImageUrl(profile.banner_url)}
                            alt="Cover"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-blue-900 to-purple-900" />
                    )}
                </div>

                <div className="px-4 pb-4">
                    {/* Avatar */}
                    <div className="flex justify-between items-start -mt-16 mb-4">
                        <div className="w-32 h-32 rounded-full border-4 border-black bg-gray-700 overflow-hidden">


                            <img
                                src={profile.avatar_url ? getProxiedImageUrl(profile.avatar_url) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                                alt={profile.username}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {!isOwnProfile && currentUser && (
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={() => navigate(`/messages/${profile.id}`)}
                                    className="px-6 py-2 rounded-full font-bold transition-colors bg-transparent border border-gray-600 text-white hover:bg-primary/10 hover:border-primary flex items-center gap-2"
                                >
                                    <Mail className="w-4 h-4" />
                                    Message
                                </button>
                                <button
                                    onClick={handleFollow}
                                    className={`px-6 py-2 rounded-full font-bold transition-colors ${isFollowing
                                        ? 'bg-transparent border border-gray-600 text-white hover:bg-red-900/20 hover:border-red-600 hover:text-red-600'
                                        : 'bg-white text-black hover:bg-gray-200'
                                        }`}
                                >
                                    {isFollowing ? 'Following' : 'Follow'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* User Info */}
                    <div className="mb-4">
                        <h2 className="text-2xl font-bold">{profile.display_name}</h2>
                        <p className="text-gray-500">@{profile.username}</p>
                    </div>

                    {profile.bio && (
                        <p className="mb-4 whitespace-pre-wrap">{profile.bio}</p>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-4 text-gray-500 text-sm mb-4">
                        {profile.location && (
                            <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{profile.location}</span>
                            </div>
                        )}
                        {profile.website && (
                            <div className="flex items-center gap-1">
                                <LinkIcon className="w-4 h-4" />
                                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    {profile.website}
                                </a>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 text-sm">
                        <button
                            onClick={() => navigate(`/profile/${username}/following?tab=following`)}
                            className="hover:underline"
                        >
                            <span className="font-bold text-white">{profile.following_count}</span>
                            <span className="text-gray-500"> Following</span>
                        </button>
                        <button
                            onClick={() => navigate(`/profile/${username}/following?tab=followers`)}
                            className="hover:underline"
                        >
                            <span className="font-bold text-white">{profile.followers_count}</span>
                            <span className="text-gray-500"> Followers</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-800">
                <div className="flex">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab(tab.id);
                            }}
                            className={`flex-1 text-center py-4 font-bold transition-colors relative ${activeTab === tab.id
                                ? 'text-white'
                                : 'text-gray-500 hover:bg-white/5'
                                }`}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Posts */}
            <div>
                {postsLoading ? (
                    <>
                        <PostSkeleton />
                        <PostSkeleton />
                        <PostSkeleton />
                    </>
                ) : posts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No {activeTab} yet
                    </div>
                ) : (
                    posts.map(post => <PostCard key={post.id} post={post} />)
                )}
            </div>
        </div>
    );
};

export default Profile;
