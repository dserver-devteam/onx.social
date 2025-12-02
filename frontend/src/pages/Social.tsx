import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import StoriesGrid from '@/components/stories/StoriesGrid';
import StoryViewer from '@/components/stories/StoryViewer';
import CreateStoryModal from '@/components/modals/CreateStoryModal';
import PostCard from '@/components/feed/PostCard';
import type { Post } from '@/types';

interface StoryUser {
    user_id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
    story_count: number;
    has_unviewed: boolean;
}

const Social: React.FC = () => {
    const { user } = useAuth();
    const [stories, setStories] = useState<StoryUser[]>([]);
    const [myPosts, setMyPosts] = useState<Post[]>([]);
    const [followedPosts, setFollowedPosts] = useState<Post[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [viewingUserId, setViewingUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [feedLoading, setFeedLoading] = useState(true);

    const fetchStories = async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const response = await api.get('/stories', {
                params: { user_id: user.id },
            });
            setStories(response.data);
        } catch (error) {
            console.error('Error fetching stories:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFeed = async () => {
        if (!user) {
            setFeedLoading(false);
            return;
        }

        setFeedLoading(true);

        // Fetch user's own posts
        try {
            const myPostsResponse = await api.get('/posts', {
                params: {
                    user_id: user.id,
                    current_user_id: user.id,
                    limit: 5
                }
            });
            setMyPosts(myPostsResponse.data);
        } catch (error) {
            console.error('Error fetching my posts:', error);
            setMyPosts([]);
        }

        // Fetch posts from followed users
        try {
            const followedResponse = await api.get('/posts/following', {
                params: {
                    user_id: user.id,
                    limit: 20
                }
            });
            setFollowedPosts(followedResponse.data);
        } catch (error) {
            console.error('Error fetching following feed:', error);
            setFollowedPosts([]);
        }

        setFeedLoading(false);
    };

    useEffect(() => {
        fetchStories();
        fetchFeed();
    }, [user]);

    const handleCreateStory = () => {
        if (!user) {
            alert('Please login to create stories');
            return;
        }
        setShowCreateModal(true);
    };

    const handleViewStory = (userId: number) => {
        setViewingUserId(userId);
    };

    const handleCloseViewer = () => {
        setViewingUserId(null);
        fetchStories(); // Refresh to update viewed status
    };

    return (
        <div className="min-h-screen pb-20">
            {/* Header */}
            <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4 z-10">
                <h1 className="text-xl font-bold">Social</h1>
            </div>

            {/* Stories Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <StoriesGrid
                    stories={stories}
                    currentUserId={user?.id}
                    onCreateStory={handleCreateStory}
                    onViewStory={handleViewStory}
                />
            )}

            {/* Main Feed */}
            <div>
                {feedLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <>
                        {/* My Posts Section */}
                        {myPosts.length > 0 && (
                            <div>
                                <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/30">
                                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Your Posts</h2>
                                </div>
                                {myPosts.map((post) => (
                                    <PostCard key={post.id} post={post} />
                                ))}
                            </div>
                        )}

                        {/* Followed Posts Section */}
                        {followedPosts.length > 0 && (
                            <div>
                                <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/30">
                                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">From People You Follow</h2>
                                </div>
                                {followedPosts.map((post) => (
                                    <PostCard key={post.id} post={post} />
                                ))}
                            </div>
                        )}

                        {/* Empty State */}
                        {myPosts.length === 0 && followedPosts.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                <p>No posts yet</p>
                                <p className="text-sm mt-2">Start following people or create your first post!</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Create Story Modal */}
            <CreateStoryModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    fetchStories();
                    setShowCreateModal(false);
                }}
            />

            {/* Story Viewer */}
            {viewingUserId && (
                <StoryViewer
                    userId={viewingUserId}
                    onClose={handleCloseViewer}
                />
            )}
        </div>
    );
};

export default Social;
