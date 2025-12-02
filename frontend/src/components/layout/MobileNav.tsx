import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bell, User, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import ComposeModal from '@/components/modals/ComposeModal';

const MobileNav: React.FC = () => {
    const location = useLocation();
    const { user } = useAuth();
    const [showCompose, setShowCompose] = useState(false);

    const navItems = [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Explore', path: '/explore', icon: Search },
        { name: 'Compose', path: '#', icon: Plus, action: () => setShowCompose(true) },
        { name: 'Notifications', path: '/notifications', icon: Bell },
        { name: 'Profile', path: user ? `/profile/${user.username}` : '/login', icon: User },
    ];

    return (
        <>
            {/* Bottom Navigation Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-40">
                <div className="flex items-center justify-around h-16">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        const isCompose = item.name === 'Compose';

                        if (isCompose) {
                            return (
                                <button
                                    key={item.name}
                                    onClick={item.action}
                                    className="flex flex-col items-center justify-center flex-1 h-full hover:bg-gray-900 transition-colors"
                                >
                                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                </button>
                            );
                        }

                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={cn(
                                    "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                                    isActive ? "text-primary" : "text-gray-500 hover:text-white"
                                )}
                            >
                                <Icon className="w-6 h-6" />
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Floating Action Button (FAB) - Alternative to bottom nav */}
            {user && (
                <button
                    onClick={() => setShowCompose(true)}
                    className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-110 z-30"
                    aria-label="Compose post"
                >
                    <Plus className="w-6 h-6 text-white" />
                </button>
            )}

            {/* Compose Modal */}
            <ComposeModal isOpen={showCompose} onClose={() => setShowCompose(false)} />
        </>
    );
};

export default MobileNav;
