import React, { useState } from 'react';
import { Shield, Smartphone, Clock } from 'lucide-react';

const SecurityTab: React.FC = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        // TODO: Implement password change
        console.log('Changing password...');
    };

    const activeSessions = [
        { id: 1, device: 'Chrome on Windows', location: 'New York, US', lastActive: '2 minutes ago', current: true },
        { id: 2, device: 'Safari on iPhone', location: 'New York, US', lastActive: '1 hour ago', current: false },
    ];

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold">Security & Password</h3>

            {/* Change Password */}
            <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Change Password
                </h4>

                <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium mb-2">
                        Current Password
                    </label>
                    <input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-primary"
                        placeholder="Enter current password"
                    />
                </div>

                <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
                        New Password
                    </label>
                    <input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-primary"
                        placeholder="Enter new password"
                    />
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                        Confirm New Password
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-primary"
                        placeholder="Confirm new password"
                    />
                </div>

                <button
                    onClick={handleChangePassword}
                    className="w-full bg-primary text-white font-bold py-3 px-6 rounded-full hover:bg-primary/90 transition-colors"
                >
                    Change Password
                </button>
            </div>

            <hr className="border-gray-800" />

            {/* Two-Factor Authentication */}
            <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Two-Factor Authentication
                </h4>
                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                    <div>
                        <p className="font-medium">Enable 2FA</p>
                        <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                    </div>
                    <button
                        onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${twoFactorEnabled ? 'bg-primary' : 'bg-gray-700'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
            </div>

            <hr className="border-gray-800" />

            {/* Active Sessions */}
            <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Active Sessions
                </h4>
                <div className="space-y-3">
                    {activeSessions.map((session) => (
                        <div key={session.id} className="p-4 bg-gray-900 rounded-lg">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-medium flex items-center gap-2">
                                        {session.device}
                                        {session.current && (
                                            <span className="text-xs bg-green-600 px-2 py-0.5 rounded-full">
                                                Current
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-sm text-gray-500">{session.location}</p>
                                    <p className="text-xs text-gray-600 mt-1">Last active: {session.lastActive}</p>
                                </div>
                                {!session.current && (
                                    <button className="text-sm text-red-500 hover:text-red-400">
                                        Revoke
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Login Activity */}
            <div className="p-4 bg-gray-900 rounded-lg">
                <h4 className="font-semibold mb-2">Login Activity</h4>
                <p className="text-sm text-gray-500 mb-3">View your recent login history</p>
                <button className="text-sm text-primary hover:underline">
                    View Login History
                </button>
            </div>
        </div>
    );
};

export default SecurityTab;
