import React, { useState } from 'react';
import { Heart, MessageCircle, Repeat2, Bookmark, PenSquare, Eye } from 'lucide-react';
import type { Post } from '@/types';
import { cn, getProxiedImageUrl } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { likePost, unlikePost, repostPost, unrepostPost, bookmarkPost, unbookmarkPost } from '@/lib/postService';
import ReplyModal from '@/components/modals/ReplyModal';
import ComposeModal from '@/components/modals/ComposeModal';
import PostMenu from '@/components/post/PostMenu';
import { useNavigate } from 'react-router-dom';

interface PostCardProps {
    post: Post;
    isDetailView?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ post, isDetailView }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentPost, setCurrentPost] = useState(post);
    const [liked, setLiked] = useState(post.user_liked || false);
    const [reposted, setReposted] = useState(post.user_reposted || false);
    const [bookmarked, setBookmarked] = useState(post.user_bookmarked || false);
    const [likeCount, setLikeCount] = useState(parseInt(String(post.like_count || 0)));
    const [repostCount, setRepostCount] = useState(parseInt(String(post.repost_count || 0)));
    const [replyCount, setReplyCount] = useState(parseInt(String(post.reply_count || 0)));
    const [showReplyModal, setShowReplyModal] = useState(false);
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [showRepostMenu, setShowRepostMenu] = useState(false);

    const handlePostUpdate = (updatedPost: Post) => {
        setCurrentPost({
            ...updatedPost,
            // Preserve local interaction states if backend doesn't return them correctly or if we want to trust local
            user_liked: liked,
            user_reposted: reposted,
            user_bookmarked: bookmarked,
            // Backend returns updated content/media
        });
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;

        try {
            if (liked) {
                await unlikePost(currentPost.id, user.id);
                setLiked(false);
                setLikeCount(prev => prev - 1);
            } else {
                await likePost(currentPost.id, user.id);
                setLiked(true);
                setLikeCount(prev => prev + 1);
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    };

    const handleRepost = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!user) return;

        try {
            if (reposted) {
                await unrepostPost(currentPost.id, user.id);
                setReposted(false);
                setRepostCount(prev => prev - 1);
            } else {
                await repostPost(currentPost.id, user.id);
                setReposted(true);
                setRepostCount(prev => prev + 1);
            }
            setShowRepostMenu(false);
        } catch (error) {
            console.error('Error toggling repost:', error);
        }
    };

    const handleBookmark = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;

        try {
            if (bookmarked) {
                await unbookmarkPost(currentPost.id, user.id);
                setBookmarked(false);
            } else {
                await bookmarkPost(currentPost.id, user.id);
                setBookmarked(true);
            }
        } catch (error) {
            console.error('Error toggling bookmark:', error);
        }
    };

    const handleReply = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowReplyModal(true);
    };

    const navigateToPost = () => {
        navigate(`/post/${currentPost.id}`);
    };

    return (
        <>
            <div
                onClick={navigateToPost}
                className={cn(
                    "p-4 border-b border-gray-800 hover:bg-gray-900/30 transition-colors cursor-pointer",
                    isDetailView && "hover:bg-transparent cursor-default border-none"
                )}
            >
                <div className={cn("flex gap-4", isDetailView && "flex-col")}>
                    {/* Avatar */}
                    <div className={cn("flex-shrink-0", isDetailView && "flex items-center gap-3")}>
                        <div className={cn("rounded-full overflow-hidden bg-gray-800", isDetailView ? "w-12 h-12" : "w-10 h-10")}>
                            {currentPost.avatar_url ? (
                                <img src={getProxiedImageUrl(currentPost.avatar_url)} alt={currentPost.username} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary to-purple-600" />
                            )}
                        </div>
                        {isDetailView && (
                            <div>
                                <div className="font-bold text-white">{currentPost.display_name}</div>
                                <div className="text-gray-500">@{currentPost.username}</div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* Header (Compact for feed, hidden for detail) */}
                        {!isDetailView && (
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2 truncate">
                                    <span className="font-bold text-white truncate">{currentPost.display_name}</span>
                                    <span className="text-gray-500 truncate">@{currentPost.username}</span>
                                    <span className="text-gray-500">·</span>
                                    <span className="text-gray-500 text-sm hover:underline">
                                        {formatDistanceToNow(new Date(currentPost.created_at))}
                                    </span>
                                    {/* Edited indicator */}
                                    {/* We need is_edited in Post type. Assuming it's there or we add it */}
                                </div>
                                <PostMenu post={currentPost} onUpdate={handlePostUpdate} />
                            </div>
                        )}

                        {/* Content */}
                        <div className={cn("text-white whitespace-pre-wrap mb-3", isDetailView ? "text-xl mt-2" : "text-base")}>
                            {currentPost.content}
                        </div>

                        {/* Media */}
                        {currentPost.media_url && (
                            <div className="mb-3 rounded-2xl overflow-hidden border border-gray-800">
                                {currentPost.media_type === 'video' ? (
                                    <video src={getProxiedImageUrl(currentPost.media_url)} controls className="w-full max-h-[500px] object-cover" />
                                ) : (
                                    <img src={getProxiedImageUrl(currentPost.media_url)} alt="Post media" className="w-full max-h-[500px] object-cover" />
                                )}
                            </div>
                        )}

                        {/* Quoted Post */}
                        {currentPost.quoted_post && (
                            <div
                                className="mb-3 border border-gray-800 rounded-xl p-3 hover:bg-gray-900/50 transition-colors cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/post/${currentPost.quoted_post!.id}`);
                                }}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-5 h-5 rounded-full bg-gray-700 overflow-hidden">
                                        {currentPost.quoted_post.avatar_url ? (
                                            <img src={getProxiedImageUrl(currentPost.quoted_post.avatar_url)} alt={currentPost.quoted_post.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-primary to-purple-600" />
                                        )}
                                    </div>
                                    <span className="font-bold text-sm text-white">{currentPost.quoted_post.display_name}</span>
                                    <span className="text-gray-500 text-sm">@{currentPost.quoted_post.username}</span>
                                    <span className="text-gray-500 text-sm">· {formatDistanceToNow(new Date(currentPost.quoted_post.created_at))}</span>
                                </div>
                                <div className="text-white text-sm whitespace-pre-wrap mb-2">{currentPost.quoted_post.content}</div>
                                {currentPost.quoted_post.media_url && (
                                    <div className="rounded-lg overflow-hidden h-48 w-full">
                                        {currentPost.quoted_post.media_type === 'video' ? (
                                            <video src={getProxiedImageUrl(currentPost.quoted_post.media_url)} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={getProxiedImageUrl(currentPost.quoted_post.media_url)} alt="Quoted media" className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Detail View Metadata */}
                        {isDetailView && (
                            <div className="py-3 border-y border-gray-800 mb-3 text-gray-500 text-sm">
                                {new Date(currentPost.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {new Date(currentPost.created_at).toLocaleDateString()}
                            </div>
                        )}

                        {/* Actions */}
                        <div className={cn("flex justify-between text-gray-500", isDetailView ? "max-w-full justify-around py-2" : "max-w-md")}>
                            <button
                                onClick={handleReply}
                                className="flex items-center gap-2 group hover:text-blue-500 transition-colors"
                            >
                                <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors">
                                    <MessageCircle className="w-4 h-4" />
                                </div>
                                <span className="text-xs">{replyCount || 0}</span>
                            </button>

                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowRepostMenu(!showRepostMenu);
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 group hover:text-green-500 transition-colors",
                                        reposted && "text-green-500"
                                    )}
                                >
                                    <div className="p-2 rounded-full group-hover:bg-green-500/10 transition-colors">
                                        <Repeat2 className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs">{repostCount}</span>
                                </button>
                                {showRepostMenu && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={(e) => {
                                            e.stopPropagation();
                                            setShowRepostMenu(false);
                                        }} />
                                        <div className="absolute bottom-full left-0 mb-2 w-40 bg-black border border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden">
                                            <button
                                                onClick={(e) => handleRepost(e)}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-900 text-white text-sm font-bold flex items-center gap-2"
                                            >
                                                <Repeat2 className="w-4 h-4" />
                                                {reposted ? 'Undo Repost' : 'Repost'}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowRepostMenu(false);
                                                    setShowQuoteModal(true);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-900 text-white text-sm font-bold flex items-center gap-2"
                                            >
                                                <PenSquare className="w-4 h-4" />
                                                Quote Post
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={handleLike}
                                className={cn(
                                    "flex items-center gap-2 group hover:text-pink-500 transition-colors",
                                    liked && "text-pink-500"
                                )}
                            >
                                <div className="p-2 rounded-full group-hover:bg-pink-500/10 transition-colors">
                                    <Heart className={cn("w-4 h-4", liked && "fill-current")} />
                                </div>
                                <span className="text-xs">{likeCount}</span>
                            </button>

                            <div className="flex items-center gap-2 group hover:text-blue-500 transition-colors">
                                <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors">
                                    <Eye className="w-4 h-4" />
                                </div>
                                <span className="text-xs">{(post as any).views_count || 0}</span>
                            </div>

                            <button
                                onClick={handleBookmark}
                                className={cn(
                                    "flex items-center gap-2 group hover:text-blue-500 transition-colors",
                                    bookmarked && "text-blue-500"
                                )}
                            >
                                <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors">
                                    <Bookmark className={cn("w-4 h-4", bookmarked && "fill-current")} />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ReplyModal
                post={post}
                isOpen={showReplyModal}
                onClose={() => setShowReplyModal(false)}
                onReplyCreated={() => {
                    setReplyCount(prev => prev + 1);
                }}
            />

            <ComposeModal
                isOpen={showQuoteModal}
                onClose={() => setShowQuoteModal(false)}
                quoteTo={post}
                onPostCreated={() => {
                    setRepostCount(prev => prev + 1); // Quote reposts also count as reposts? Or separate? Twitter counts them as reposts.
                }}
            />
        </>
    );
};

export default PostCard;
