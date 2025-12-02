import React, { useEffect, useState } from 'react';
import { Bookmark as BookmarkIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PostCard from '@/components/feed/PostCard';
import api from '@/lib/api';
import type { Post } from '@/types';

const Bookmarks: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [bookmarks, setBookmarks] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadBookmarks();
    }, [user]);

    const loadBookmarks = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const response = await api.get(`/users/${user.id}/bookmarks`);
            setBookmarks(response.data);
        } catch (error) {
            console.error('Error loading bookmarks:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-gray-500">Loading bookmarks...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4 z-10">
                <h1 className="text-xl font-bold">Bookmarks</h1>
            </div>
            {bookmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                    <BookmarkIcon className="w-16 h-16 text-gray-700 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Save posts for later</h2>
                    <p className="text-gray-500 text-center">
                        Bookmark posts to easily find them again in the future.
                    </p>
                </div>
            ) : (
                <div>
                    {bookmarks.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Bookmarks;
