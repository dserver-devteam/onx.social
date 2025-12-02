import React, { useState } from 'react';
import { AlertTriangle, Pause, Trash2 } from 'lucide-react';

const DangerZone: React.FC = () => {
    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDeactivate = () => {
        // TODO: Implement account deactivation
        console.log('Deactivating account...');
    };

    const handleDelete = () => {
        // TODO: Implement account deletion
        console.log('Deleting account...');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-lg font-bold">Danger Zone</h3>
            </div>

            <p className="text-sm text-gray-500">
                These actions are irreversible. Please proceed with caution.
            </p>

            {/* Deactivate Account */}
            <div className="border-2 border-yellow-600 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-yellow-500">
                    <Pause className="w-4 h-4" />
                    Deactivate Account
                </h4>
                <p className="text-sm text-gray-400">
                    Temporarily deactivate your account. Your profile and posts will be hidden, but you can reactivate anytime by logging back in.
                </p>
                {!showDeactivateConfirm ? (
                    <button
                        onClick={() => setShowDeactivateConfirm(true)}
                        className="w-full bg-transparent border border-yellow-600 text-yellow-500 font-bold py-3 px-6 rounded-full hover:bg-yellow-600/10 transition-colors"
                    >
                        Deactivate Account
                    </button>
                ) : (
                    <div className="space-y-2">
                        <p className="text-sm text-yellow-500 font-medium">Are you sure?</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowDeactivateConfirm(false)}
                                className="flex-1 bg-gray-800 text-white font-bold py-2 px-4 rounded-full hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeactivate}
                                className="flex-1 bg-yellow-600 text-white font-bold py-2 px-4 rounded-full hover:bg-yellow-700 transition-colors"
                            >
                                Yes, Deactivate
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Account */}
            <div className="border-2 border-red-600 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-red-500">
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                </h4>
                <p className="text-sm text-gray-400">
                    Permanently delete your account and all your content. This action cannot be undone. Your account will be deleted after a 30-day grace period.
                </p>
                {!showDeleteConfirm ? (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-full hover:bg-red-700 transition-colors"
                    >
                        Delete Account
                    </button>
                ) : (
                    <div className="space-y-2">
                        <p className="text-sm text-red-500 font-medium">⚠️ This action cannot be undone!</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 bg-gray-800 text-white font-bold py-2 px-4 rounded-full hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 bg-red-600 text-white font-bold py-2 px-4 rounded-full hover:bg-red-700 transition-colors"
                            >
                                Yes, Delete Forever
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DangerZone;
