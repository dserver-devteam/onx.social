import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import TrendingWidget from '@/components/widgets/TrendingWidget';
import WhoToFollowWidget from '@/components/widgets/WhoToFollowWidget';

const Layout: React.FC = () => {
    return (
        <div className="min-h-screen bg-black text-white">
            <div className="max-w-7xl mx-auto flex">
                {/* Sidebar - Hidden on mobile */}
                <div className="hidden md:block">
                    <Sidebar />
                </div>

                {/* Main Content */}
                <main className="flex-1 border-x border-gray-800 min-h-screen pb-16 md:pb-0">
                    <Outlet />
                </main>

                {/* Right Sidebar - Hidden on mobile and tablet */}
                <div className="hidden lg:block w-80 px-4 py-4">
                    <div className="sticky top-4 space-y-4">
                        <TrendingWidget />
                        <WhoToFollowWidget />
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            <MobileNav />
        </div>
    );
};

export default Layout;
