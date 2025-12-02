import React, { useEffect, useState } from 'react';
import { TrendingUp, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

interface TrendingTopic {
    id: number;
    tag: string;
    post_count: string;
    last_used: string;
}

const TrendingWidget: React.FC = () => {
    const navigate = useNavigate();
    const [topics, setTopics] = useState<TrendingTopic[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTrending = async () => {
        try {
            const response = await api.get('/trending/topics', {
                params: { limit: 10 }
            });
            setTopics(response.data);
        } catch (error) {
            console.error('Error fetching trending topics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrending();

        // Refresh every 5 minutes
        const interval = setInterval(fetchTrending, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const handleTopicClick = (tag: string) => {
        navigate(`/hashtag/${tag}`);
    };

    if (loading) {
        return (
            <div className="bg-gray-900/50 rounded-2xl p-4 border border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5" />
                    <h2 className="text-xl font-bold">Trending</h2>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (topics.length === 0) {
        return null;
    }

    return (
        <div className="bg-gray-900/50 rounded-2xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Trending</h2>
            </div>

            <div className="space-y-1">
                {topics.map((topic, index) => (
                    <button
                        key={topic.id}
                        onClick={() => handleTopicClick(topic.tag)}
                        className="w-full text-left p-3 hover:bg-gray-800/50 rounded-xl transition-colors group"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-gray-500 text-sm">#{index + 1}</span>
                                    <Hash className="w-4 h-4 text-gray-500" />
                                </div>
                                <div className="font-bold text-white group-hover:text-primary transition-colors truncate">
                                    #{topic.tag}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {parseInt(topic.post_count).toLocaleString()} posts
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <button
                onClick={() => navigate('/explore')}
                className="w-full mt-3 p-3 text-primary hover:bg-primary/10 rounded-xl transition-colors text-sm font-medium"
            >
                Show more
            </button>
        </div>
    );
};

export default TrendingWidget;
