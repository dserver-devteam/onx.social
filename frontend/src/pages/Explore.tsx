import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

interface SearchResult {
    posts: Array<{
        id: number;
        content: string;
        username: string;
        display_name: string;
    }>;
    users: Array<{
        id: number;
        username: string;
        display_name: string;
        avatar_url: string | null;
        bio: string | null;
    }>;
}

const Explore: React.FC = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (searchQuery: string) => {
        setQuery(searchQuery);

        if (!searchQuery.trim()) {
            setResults(null);
            return;
        }

        try {
            setLoading(true);
            const response = await api.get('/search', {
                params: { q: searchQuery }
            });
            setResults(response.data);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const clearSearch = () => {
        setQuery('');
        setResults(null);
    };

    return (
        <div className="min-h-screen">
            {/* Search Header */}
            <div className="sticky top-0 bg-black/95 backdrop-blur-md border-b border-gray-800 p-4 z-10">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Search RealTalk"
                        className="w-full bg-gray-900 rounded-full py-3 pl-12 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                    />
                    {query && (
                        <button
                            onClick={clearSearch}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Search Results */}
            <div className="p-4">
                {loading && (
                    <div className="text-center py-8 text-gray-500">Searching...</div>
                )}

                {!loading && !results && !query && (
                    <div className="text-center py-16">
                        <Search className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Search RealTalk</h2>
                        <p className="text-gray-500">Find people, posts, and topics</p>
                    </div>
                )}

                {!loading && results && (
                    <div className="space-y-6">
                        {/* Users */}
                        {results.users && results.users.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                                    People
                                </h3>
                                <div className="space-y-2">
                                    {results.users.map((user) => (
                                        <div
                                            key={user.id}
                                            onClick={() => navigate(`/profile/${user.username}`)}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                                                <img
                                                    src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                                                    alt={user.username}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold truncate">{user.display_name}</div>
                                                <div className="text-sm text-gray-500 truncate">@{user.username}</div>
                                                {user.bio && (
                                                    <div className="text-sm text-gray-400 truncate mt-1">{user.bio}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Posts */}
                        {results.posts && results.posts.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                                    Posts
                                </h3>
                                <div className="space-y-2">
                                    {results.posts.map((post) => (
                                        <div
                                            key={post.id}
                                            className="p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                                        >
                                            <div className="font-bold text-sm mb-1">@{post.username}</div>
                                            <div className="text-sm text-gray-400">
                                                {post.content.length > 150
                                                    ? `${post.content.substring(0, 150)}...`
                                                    : post.content}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {results.users.length === 0 && results.posts.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No results found for "{query}"
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Explore;
