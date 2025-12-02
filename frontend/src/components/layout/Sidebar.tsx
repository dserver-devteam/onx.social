import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bell, Bookmark, User, Settings, Layers, Users, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn, getProxiedImageUrl } from '@/lib/utils';
import SettingsModal from '@/components/modals/SettingsModal';
import ComposeModal from '@/components/modals/ComposeModal';


const Sidebar: React.FC = () => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const [showSettings, setShowSettings] = useState(false);
    const [showCompose, setShowCompose] = useState(false);

    const navItems = [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Explore', path: '/explore', icon: Search },
        { name: 'Notifications', path: '/notifications', icon: Bell },
        { name: 'Updates', path: '/updates', icon: Layers },
        { name: 'Social', path: '/social', icon: Users },
        { name: 'Bookmarks', path: '/bookmarks', icon: Bookmark },
        { name: 'Profile', path: user ? `/profile/${user.username}` : '/login', icon: User },
    ];

    return (
        <>
            <aside className="flex flex-col w-[275px] h-screen sticky top-0 px-4 py-4 overflow-y-auto">
                {/* Logo */}
                <div className="mb-4 px-3">
                    <Link to="/" className="flex items-center gap-3 w-fit p-3 rounded-full hover:bg-gray-900 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-white font-bold text-lg">R</span>
                        </div>
                        <span className="text-xl font-bold">RealTalk</span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-2 mb-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-4 px-4 py-3 rounded-full transition-colors relative",
                                    isActive
                                        ? "bg-gray-900 font-bold"
                                        : "hover:bg-gray-900"
                                )}
                            >
                                <Icon className="w-6 h-6" />
                                <span className="text-xl">{item.name}</span>
                            </Link>
                        );
                    })}

                    {/* Settings Button - Only show when logged in */}
                    {user && (
                        <button
                            onClick={() => setShowSettings(true)}
                            className="flex items-center gap-4 px-4 py-3 rounded-full hover:bg-gray-900 transition-colors"
                        >
                            <Settings className="w-6 h-6" />
                            <span className="text-xl">Settings</span>
                        </button>
                    )}

                    {/* Admin Panel - Only show for admins */}
                    {user?.role === 'admin' && (
                        <a
                            href="http://localhost:3033"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 px-4 py-3 rounded-full hover:bg-gray-900 transition-colors"
                        >
                            <Shield className="w-6 h-6" />
                            <span className="text-xl">Admin</span>
                        </a>
                    )}

                </nav>

                {/* Post Button */}
                {user && (
                    <button
                        onClick={() => setShowCompose(true)}
                        className="w-full bg-primary text-white font-bold py-3 px-6 rounded-full hover:bg-primary/90 transition-colors mb-4"
                    >
                        Post
                    </button>
                )}

                {/* User Profile */}
                {user && (
                    <div className="mt-auto">
                        <div className="flex items-center gap-3 p-3 rounded-full hover:bg-gray-900 transition-colors cursor-pointer">
                            <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                                <img
                                    src={user.avatar_url ? getProxiedImageUrl(user.avatar_url) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                                    alt={user.username}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold truncate">{user.display_name || user.username}</div>
                                <div className="text-sm text-gray-500 truncate">@{user.username}</div>
                            </div>
                            <button
                                onClick={logout}
                                className="text-gray-500 hover:text-red-500 transition-colors"
                                title="Logout"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Guest Actions */}
                {!user && (
                    <div className="mt-auto space-y-3">
                        <Link
                            to="/login"
                            className="block w-full text-center bg-transparent border border-primary text-primary font-bold py-3 px-6 rounded-full hover:bg-primary/10 transition-colors"
                        >
                            Sign In
                        </Link>
                        <Link
                            to="/register"
                            className="block w-full text-center bg-primary text-white font-bold py-3 px-6 rounded-full hover:bg-primary/90 transition-colors"
                        >
                            Sign Up
                        </Link>
                    </div>
                )}
            </aside>

            {/* Settings Modal */}
            <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

            {/* Compose Modal */}
            <ComposeModal isOpen={showCompose} onClose={() => setShowCompose(false)} />
        </>
    );
};

export default Sidebar;
