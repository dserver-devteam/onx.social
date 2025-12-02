import React from 'react';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-3',
        lg: 'w-12 h-12 border-4'
    };

    return (
        <div className={`animate-spin rounded-full border-primary border-t-transparent ${sizeClasses[size]}`} />
    );
};

export const FullPageLoader: React.FC = () => (
    <div className="flex items-center justify-center min-h-screen bg-black">
        <LoadingSpinner size="lg" />
    </div>
);

export const PostSkeleton: React.FC = () => (
    <div className="p-4 border-b border-gray-800 animate-pulse">
        <div className="flex gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-full" />
            <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                    <div className="h-4 bg-gray-800 rounded w-1/4" />
                    <div className="h-4 bg-gray-800 rounded w-1/6" />
                </div>
                <div className="h-4 bg-gray-800 rounded w-3/4" />
                <div className="h-4 bg-gray-800 rounded w-1/2" />
                <div className="h-64 bg-gray-800 rounded w-full mt-2" />
            </div>
        </div>
    </div>
);

export const ProfileSkeleton: React.FC = () => (
    <div className="animate-pulse">
        <div className="h-48 bg-gray-800" />
        <div className="px-4 pb-4">
            <div className="w-32 h-32 rounded-full border-4 border-black bg-gray-800 -mt-16 mb-4" />
            <div className="space-y-3 mb-6">
                <div className="h-6 bg-gray-800 rounded w-1/3" />
                <div className="h-4 bg-gray-800 rounded w-1/4" />
                <div className="h-4 bg-gray-800 rounded w-2/3" />
            </div>
            <div className="flex gap-4">
                <div className="h-4 bg-gray-800 rounded w-20" />
                <div className="h-4 bg-gray-800 rounded w-20" />
            </div>
        </div>
    </div>
);
