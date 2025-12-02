import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
    id: number;
    type: 'like' | 'repost' | 'reply' | 'follow';
    actor_username: string;
    actor_display_name: string;
    actor_avatar_url: string | null;
    post_content?: string;
    created_at: string;
    read: boolean;
}

const Notifications: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadNotifications();
    }, [user]);

    const loadNotifications = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const response = await api.get(`/users/${user.id}/notifications`);
            // Ensure we always set an array
            setNotifications(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error loading notifications:', error);
            // Set empty array on error
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'like': return '❤️';
            case 'repost': return '🔁';
            case 'reply': return '💬';
            case 'follow': return '👤';
            default: return '🔔';
        }
    };

    const getNotificationText = (type: string) => {
        switch (type) {
            case 'like': return 'liked your post';
            case 'repost': return 'reposted your post';
            case 'reply': return 'replied to your post';
            case 'follow': return 'started following you';
            default: return 'interacted with you';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-gray-500">Loading notifications...</div>
            </div>
        );
    }

    if (notifications.length === 0) {
        return (
            <div>
                <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4 z-10">
                    <h1 className="text-xl font-bold">Notifications</h1>
                </div>
                <div className="flex flex-col items-center justify-center py-16 px-4">
                    <Bell className="w-16 h-16 text-gray-700 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">No notifications yet</h2>
                    <p className="text-gray-500 text-center">
                        When someone likes, reposts, or replies to your posts, you'll see it here.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4 z-10">
                <h1 className="text-xl font-bold">Notifications</h1>
            </div>
            <div>
                {notifications.map((notif) => (
                    <div
                        key={notif.id}
                        className={`border-b border-gray-800 p-4 hover:bg-white/5 transition-colors cursor-pointer ${!notif.read ? 'bg-primary/5' : ''
                            }`}
                        onClick={() => navigate(`/profile/${notif.actor_username}`)}
                    >
                        <div className="flex gap-3">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                                    <img
                                        src={notif.actor_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.actor_username}`}
                                        alt={notif.actor_username}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xl">{getNotificationIcon(notif.type)}</span>
                                    <span className="font-bold">{notif.actor_display_name}</span>
                                    <span className="text-gray-500">@{notif.actor_username}</span>
                                    <span className="text-gray-500">·</span>
                                    <span className="text-gray-500 text-sm">
                                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                                <div className="text-gray-400 mb-2">{getNotificationText(notif.type)}</div>
                                {notif.post_content && (
                                    <div className="bg-gray-900 rounded-lg p-3 text-sm text-gray-400">
                                        {notif.post_content}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Notifications;
