import React from 'react';
import Feed from '@/components/feed/Feed';
import ComposeBox from '@/components/feed/ComposeBox';

const Home: React.FC = () => {
    return (
        <div>
            <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4 z-10">
                <h1 className="text-xl font-bold">Home</h1>
            </div>
            <ComposeBox onPostCreated={() => window.location.reload()} />
            <Feed />
        </div>
    );
};

export default Home;
