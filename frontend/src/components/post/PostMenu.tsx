import React, { useState } from 'react';
import { MoreHorizontal, Share2, Link2, Code, Bookmark, Pin, Trash2, Edit, Flag, VolumeX, UserX, Sparkles, Languages, BarChart3, BookmarkCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { Post } from '@/types';
import EditPostModal from '@/components/modals/EditPostModal';
import PostAnalyticsModal from '@/components/modals/PostAnalyticsModal';

interface PostMenuProps {
    post: Post;
    onDelete?: () => void;
    onUpdate?: (post: Post) => void;
}

const PostMenu: React.FC<PostMenuProps> = ({ post, onDelete, onUpdate }) => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const isOwnPost = user?.id === post.user_id;

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Check out this post',
                    url: `${window.location.origin}/post/${post.id}`,
                });
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            handleCopyLink(e);
        }
        setIsOpen(false);
    };

    const handleCopyLink = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}/post/${post.id}`;
        try {
            await navigator.clipboard.writeText(url);
            alert('Link copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy:', error);
        }
        setIsOpen(false);
    };

    const handleEmbed = (e: React.MouseEvent) => {
        e.stopPropagation();
        const embedCode = `<iframe src="${window.location.origin}/embed/post/${post.id}" width="550" height="400"></iframe>`;
        navigator.clipboard.writeText(embedCode);
        alert('Embed code copied to clipboard!');
        setIsOpen(false);
    };

    const handleBookmark = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsBookmarked(!isBookmarked);
        // TODO: Implement bookmark API call
        console.log('Toggle bookmark for post', post.id);
        setIsOpen(false);
    };

    const handlePin = (e: React.MouseEvent) => {
        e.stopPropagation();
        // TODO: Implement pin post
        console.log('Pin post', post.id);
        setIsOpen(false);
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this post?')) return;

        setIsOpen(false);
        onDelete?.();
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(false);
        setShowEditModal(true);
    };

    const handleReport = (e: React.MouseEvent) => {
        e.stopPropagation();
        // TODO: Open report modal
        console.log('Report post', post.id);
        setIsOpen(false);
    };

    const handleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Mute @${post.username}? You won't see their posts in your timeline.`)) {
            // TODO: Implement mute user
            console.log('Mute user', post.username);
        }
        setIsOpen(false);
    };

    const handleBlock = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Block @${post.username}? They won't be able to follow you or see your posts.`)) {
            // TODO: Implement block user
            console.log('Block user', post.username);
        }
        setIsOpen(false);
    };

    const handleAIExplain = (e: React.MouseEvent) => {
        e.stopPropagation();
        // TODO: Open AI explanation modal
        console.log('AI explain post', post.id);
        setIsOpen(false);
    };

    const handleTranslate = (e: React.MouseEvent) => {
        e.stopPropagation();
        // TODO: Implement translation
        console.log('Translate post', post.id);
        setIsOpen(false);
    };

    const handleAnalytics = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(false);
        setShowAnalyticsModal(true);
    };

    return (
        <div className="relative">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-2 hover:bg-primary/10 text-gray-500 hover:text-primary rounded-full transition-colors"
            >
                <MoreHorizontal className="w-5 h-5" />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 top-full mt-1 w-64 bg-black border border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden">
                        {/* Share Actions */}
                        <button
                            onClick={(e) => handleShare(e)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 transition-colors text-left"
                        >
                            <Share2 className="w-5 h-5" />
                            <span>Share post</span>
                        </button>

                        <button
                            onClick={(e) => handleCopyLink(e)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 transition-colors text-left"
                        >
                            <Link2 className="w-5 h-5" />
                            <span>Copy link</span>
                        </button>

                        <button
                            onClick={(e) => handleEmbed(e)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 transition-colors text-left"
                        >
                            <Code className="w-5 h-5" />
                            <span>Embed post</span>
                        </button>

                        <div className="h-px bg-gray-800 my-1" />

                        {/* Bookmark/Pin Actions */}
                        <button
                            onClick={(e) => handleBookmark(e)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 transition-colors text-left"
                        >
                            {isBookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                            <span>{isBookmarked ? 'Remove bookmark' : 'Bookmark post'}</span>
                        </button>

                        {isOwnPost && (
                            <button
                                onClick={(e) => handlePin(e)}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 transition-colors text-left"
                            >
                                <Pin className="w-5 h-5" />
                                <span>Pin to profile</span>
                            </button>
                        )}

                        <div className="h-px bg-gray-800 my-1" />

                        {/* AI Features */}
                        <button
                            onClick={(e) => handleAIExplain(e)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 transition-colors text-left"
                        >
                            <Sparkles className="w-5 h-5 text-purple-500" />
                            <span>Explain with AI</span>
                        </button>

                        <button
                            onClick={(e) => handleTranslate(e)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 transition-colors text-left"
                        >
                            <Languages className="w-5 h-5" />
                            <span>Translate post</span>
                        </button>

                        {isOwnPost && (
                            <>
                                <div className="h-px bg-gray-800 my-1" />

                                {/* Owner Actions */}
                                <button
                                    onClick={(e) => handleAnalytics(e)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 transition-colors text-left"
                                >
                                    <BarChart3 className="w-5 h-5" />
                                    <span>View analytics</span>
                                </button>

                                <button
                                    onClick={(e) => handleEdit(e)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 transition-colors text-left"
                                >
                                    <Edit className="w-5 h-5" />
                                    <span>Edit post</span>
                                </button>

                                <button
                                    onClick={(e) => handleDelete(e)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 transition-colors text-left text-red-500"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    <span>Delete post</span>
                                </button>
                            </>
                        )}

                        {!isOwnPost && (
                            <>
                                <div className="h-px bg-gray-800 my-1" />

                                {/* Moderation Actions */}
                                <button
                                    onClick={(e) => handleReport(e)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 transition-colors text-left"
                                >
                                    <Flag className="w-5 h-5" />
                                    <span>Report post</span>
                                </button>

                                <button
                                    onClick={(e) => handleMute(e)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 transition-colors text-left"
                                >
                                    <VolumeX className="w-5 h-5" />
                                    <span>Mute @{post.username}</span>
                                </button>

                                <button
                                    onClick={(e) => handleBlock(e)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 transition-colors text-left text-red-500"
                                >
                                    <UserX className="w-5 h-5" />
                                    <span>Block @{post.username}</span>
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}

            <EditPostModal
                post={post}
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                onSuccess={(updatedPost) => {
                    onUpdate?.(updatedPost);
                }}
            />

            <PostAnalyticsModal
                post={post}
                isOpen={showAnalyticsModal}
                onClose={() => setShowAnalyticsModal(false)}
            />
        </div>
    );
};

export default PostMenu;
