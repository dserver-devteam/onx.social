import React from 'react';
import { Users, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChannelCardProps {
    id: number;
    name: string;
    description?: string;
    avatar_url?: string;
    follower_count: number;
    is_verified?: boolean;
    is_following?: boolean;
    creator_username: string;
    creator_display_name: string;
}

const ChannelCard: React.FC<ChannelCardProps> = ({
    id,
    name,
    description,
    avatar_url,
    follower_count,
    is_verified,
    is_following,
    creator_display_name,
}) => {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate(`/updates/${id}`);
    };

    return (
        <div
            onClick={handleClick}
            className="bg-gray-900 rounded-xl p-6 hover:bg-gray-800 transition-all cursor-pointer border border-gray-800 hover:border-gray-700"
        >
            {/* Channel Avatar */}
            <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {avatar_url ? (
                        <img src={avatar_url} alt={name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        name.charAt(0).toUpperCase()
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg truncate">{name}</h3>
                        {is_verified && (
                            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                    </div>
                    <p className="text-sm text-gray-500">by {creator_display_name}</p>
                </div>
            </div>

            {/* Description */}
            {description && (
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {description}
                </p>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{follower_count.toLocaleString()} followers</span>
                </div>

                {is_following && (
                    <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full">
                        Following
                    </span>
                )}
            </div>
        </div>
    );
};

export default ChannelCard;
