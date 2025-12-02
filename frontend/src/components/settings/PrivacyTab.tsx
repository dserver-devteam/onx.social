import React, { useState } from 'react';
import { Lock, UserX, VolumeX } from 'lucide-react';

const PrivacyTab: React.FC = () => {
    const [accountVisibility, setAccountVisibility] = useState<'public' | 'private'>('public');
    const [whoCanReply, setWhoCanReply] = useState<'everyone' | 'followers' | 'mentions'>('everyone');
    const [whoCanMessage, setWhoCanMessage] = useState<'everyone' | 'followers'>('everyone');
    const [photoTagging, setPhotoTagging] = useState(true);

    const blockedUsers = [
        { id: 1, username: 'spammer123', displayName: 'Spammer' },
        { id: 2, username: 'troll456', displayName: 'Troll User' },
    ];

    const mutedUsers = [
        { id: 1, username: 'noisy_user', displayName: 'Noisy User' },
    ];

    const mutedWords = ['spoiler', 'politics'];

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold">Privacy Settings</h3>

            {/* Account Visibility */}
            <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Account Visibility
                </h4>
                <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-800">
                        <input
                            type="radio"
                            name="visibility"
                            value="public"
                            checked={accountVisibility === 'public'}
                            onChange={() => setAccountVisibility('public')}
                            className="w-4 h-4 text-primary"
                        />
                        <div>
                            <p className="font-medium">Public</p>
                            <p className="text-sm text-gray-500">Anyone can see your posts</p>
                        </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-800">
                        <input
                            type="radio"
                            name="visibility"
                            value="private"
                            checked={accountVisibility === 'private'}
                            onChange={() => setAccountVisibility('private')}
                            className="w-4 h-4 text-primary"
                        />
                        <div>
                            <p className="font-medium">Private</p>
                            <p className="text-sm text-gray-500">Only approved followers can see your posts</p>
                        </div>
                    </label>
                </div>
            </div>

            <hr className="border-gray-800" />

            {/* Who Can Reply */}
            <div className="space-y-3">
                <h4 className="font-semibold">Who can reply to your posts</h4>
                <select
                    value={whoCanReply}
                    onChange={(e) => setWhoCanReply(e.target.value as any)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-primary"
                >
                    <option value="everyone">Everyone</option>
                    <option value="followers">People you follow</option>
                    <option value="mentions">Only people you mention</option>
                </select>
            </div>

            {/* Who Can Message */}
            <div className="space-y-3">
                <h4 className="font-semibold">Who can send you direct messages</h4>
                <select
                    value={whoCanMessage}
                    onChange={(e) => setWhoCanMessage(e.target.value as any)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-primary"
                >
                    <option value="everyone">Everyone</option>
                    <option value="followers">People you follow</option>
                </select>
            </div>

            {/* Photo Tagging */}
            <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                <div>
                    <p className="font-medium">Photo Tagging</p>
                    <p className="text-sm text-gray-500">Allow others to tag you in photos</p>
                </div>
                <button
                    onClick={() => setPhotoTagging(!photoTagging)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${photoTagging ? 'bg-primary' : 'bg-gray-700'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${photoTagging ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            <hr className="border-gray-800" />

            {/* Blocked Users */}
            <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                    <UserX className="w-4 h-4" />
                    Blocked Users ({blockedUsers.length})
                </h4>
                {blockedUsers.length > 0 ? (
                    <div className="space-y-2">
                        {blockedUsers.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                                <div>
                                    <p className="font-medium">{user.displayName}</p>
                                    <p className="text-sm text-gray-500">@{user.username}</p>
                                </div>
                                <button className="text-sm text-red-500 hover:text-red-400">
                                    Unblock
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">No blocked users</p>
                )}
            </div>

            {/* Muted Users */}
            <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                    <VolumeX className="w-4 h-4" />
                    Muted Users ({mutedUsers.length})
                </h4>
                {mutedUsers.length > 0 ? (
                    <div className="space-y-2">
                        {mutedUsers.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                                <div>
                                    <p className="font-medium">{user.displayName}</p>
                                    <p className="text-sm text-gray-500">@{user.username}</p>
                                </div>
                                <button className="text-sm text-primary hover:underline">
                                    Unmute
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">No muted users</p>
                )}
            </div>

            {/* Muted Words */}
            <div className="space-y-3">
                <h4 className="font-semibold">Muted Words & Phrases</h4>
                <div className="flex flex-wrap gap-2">
                    {mutedWords.map((word, index) => (
                        <span key={index} className="px-3 py-1 bg-gray-900 rounded-full text-sm flex items-center gap-2">
                            {word}
                            <button className="text-gray-500 hover:text-red-500">×</button>
                        </span>
                    ))}
                </div>
                <button className="text-sm text-primary hover:underline">
                    + Add muted word
                </button>
            </div>
        </div>
    );
};

export default PrivacyTab;
