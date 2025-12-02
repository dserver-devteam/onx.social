import React from 'react';
import { Download, Link2, BarChart3 } from 'lucide-react';

const DataTab: React.FC = () => {
    const handleDownloadData = () => {
        // TODO: Implement data export request
        console.log('Requesting data export...');
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold">Data & Privacy</h3>

            {/* Download Your Data */}
            <div className="p-4 bg-gray-900 rounded-lg space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download My Data
                </h4>
                <p className="text-sm text-gray-500">
                    Request a copy of your data (posts, media, profile info). We will email you a download link valid for 7 days.
                </p>
                <button
                    onClick={handleDownloadData}
                    className="w-full bg-transparent border border-primary text-primary font-bold py-3 px-6 rounded-full hover:bg-primary/10 transition-colors"
                >
                    Request Data Export
                </button>
            </div>

            {/* Data Usage Dashboard */}
            <div className="p-4 bg-gray-900 rounded-lg space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Data Usage
                </h4>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Posts</span>
                        <span className="font-medium">1,234</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Media Files</span>
                        <span className="font-medium">567</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Storage Used</span>
                        <span className="font-medium">2.4 GB</span>
                    </div>
                </div>
            </div>

            {/* Connected Apps */}
            <div className="p-4 bg-gray-900 rounded-lg space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Connected Apps & Permissions
                </h4>
                <p className="text-sm text-gray-500">
                    Manage third-party applications that have access to your account.
                </p>
                <button className="text-sm text-primary hover:underline">
                    Manage Connected Apps
                </button>
            </div>

            {/* Ad Preferences */}
            <div className="p-4 bg-gray-900 rounded-lg space-y-3">
                <h4 className="font-semibold">Ad Preferences</h4>
                <p className="text-sm text-gray-500">
                    Control how your data is used for advertising purposes.
                </p>
                <button className="text-sm text-primary hover:underline">
                    Manage Ad Preferences
                </button>
            </div>
        </div>
    );
};

export default DataTab;
