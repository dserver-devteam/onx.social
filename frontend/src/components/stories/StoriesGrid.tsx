import React from 'react';
import { Plus } from 'lucide-react';

interface StoryUser {
    user_id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
    story_count: number;
    has_unviewed: boolean;
}

interface StoriesGridProps {
    stories: StoryUser[];
    currentUserId?: number;
    onCreateStory: () => void;
    onViewStory: (userId: number) => void;
}

const StoriesGrid: React.FC<StoriesGridProps> = ({
    stories,
    currentUserId,
    onCreateStory,
    onViewStory,
}) => {
    const hasOwnStory = stories.some(s => s.user_id === currentUserId);

    return (
        <div className="border-b border-gray-800 p-4 overflow-x-auto">
            <div className="flex gap-4">
                {/* Your Story / Add Story */}
                {currentUserId && (
                    <div
                        onClick={onCreateStory}
                        className="flex-shrink-0 cursor-pointer group"
                    >
                        <div className={`relative w-16 h-16 rounded-full ${hasOwnStory
                                ? 'ring-2 ring-primary ring-offset-2 ring-offset-black'
                                : 'ring-2 ring-gray-700 ring-offset-2 ring-offset-black'
                            }`}>
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                                <Plus className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <p className="text-xs text-center mt-1 text-gray-400 group-hover:text-white transition-colors">
                            {hasOwnStory ? 'Add' : 'Your Story'}
                        </p>
                    </div>
                )}

                {/* Other Users' Stories */}
                {stories.filter(s => s.user_id !== currentUserId).map((story) => (
                    <div
                        key={story.user_id}
                        onClick={() => onViewStory(story.user_id)}
                        className="flex-shrink-0 cursor-pointer group"
                    >
                        <div className={`relative w-16 h-16 rounded-full ${story.has_unviewed
                                ? 'ring-2 ring-primary ring-offset-2 ring-offset-black'
                                : 'ring-2 ring-gray-700 ring-offset-2 ring-offset-black'
                            }`}>
                            {story.avatar_url ? (
                                <img
                                    src={story.avatar_url}
                                    alt={story.display_name}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                    {story.display_name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-center mt-1 text-gray-400 group-hover:text-white transition-colors truncate w-16">
                            {story.display_name}
                        </p>
                    </div>
                ))}

                {stories.length === 0 && !currentUserId && (
                    <div className="text-center py-4 text-gray-500">
                        <p>No stories available</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoriesGrid;
