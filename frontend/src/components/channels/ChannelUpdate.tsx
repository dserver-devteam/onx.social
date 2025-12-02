import React from 'react';
import { formatDistanceToNow } from 'date-fns';

interface ChannelUpdateProps {
    id: number;
    content: string;
    media_url?: string;
    created_at: string;
    channel_name?: string;
    channel_avatar?: string;
}

const ChannelUpdate: React.FC<ChannelUpdateProps> = ({
    content,
    media_url,
    created_at,
}) => {
    return (
        <div className="border-b border-gray-800 p-4 hover:bg-gray-900/50 transition-colors">
            <div className="flex gap-3">
                <div className="flex-1">
                    {/* Content */}
                    <p className="text-white whitespace-pre-wrap mb-3">{content}</p>

                    {/* Media */}
                    {media_url && (
                        <div className="rounded-2xl overflow-hidden mb-3">
                            <img
                                src={media_url}
                                alt="Update media"
                                className="w-full max-h-96 object-cover"
                            />
                        </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ChannelUpdate;
