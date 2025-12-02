import React from 'react';
import { Search } from 'lucide-react';

const RightSidebar: React.FC = () => {
    return (
        <aside className="flex flex-col w-[350px] h-screen sticky top-0 p-4 overflow-y-auto">
            {/* Search */}
            <div className="sticky top-0 bg-black pb-4 z-10">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search"
                        className="w-full bg-gray-900 rounded-full py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
            </div>

            {/* Trending Topics */}
            <div className="bg-gray-900 rounded-2xl p-4 mb-4">
                <h2 className="text-xl font-bold mb-4">Trends for you</h2>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer">
                            <div className="text-xs text-gray-500">Trending</div>
                            <div className="font-bold">#{`Topic${i}`}</div>
                            <div className="text-xs text-gray-500">{Math.floor(Math.random() * 50)}K posts</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Who to Follow */}
            <div className="bg-gray-900 rounded-2xl p-4">
                <h2 className="text-xl font-bold mb-4">Who to follow</h2>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between hover:bg-white/5 p-2 rounded-lg transition-colors">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="Avatar" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm hover:underline cursor-pointer">Developer {i}</span>
                                    <span className="text-xs text-gray-500">@dev{i}</span>
                                </div>
                            </div>
                            <button className="bg-white text-black font-bold py-1.5 px-4 rounded-full text-sm hover:bg-gray-200 transition-colors">
                                Follow
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );
};

export default RightSidebar;
