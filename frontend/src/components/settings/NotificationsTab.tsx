import React, { useState } from 'react';
import { Bell, Mail, Filter } from 'lucide-react';

const NotificationsTab: React.FC = () => {
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [notifyLikes, setNotifyLikes] = useState(true);
    const [notifyReposts, setNotifyReposts] = useState(true);
    const [notifyReplies, setNotifyReplies] = useState(true);
    const [notifyMentions, setNotifyMentions] = useState(true);
    const [notifyFollows, setNotifyFollows] = useState(true);
    const [notifyDMs, setNotifyDMs] = useState(true);
    const [qualityFilter, setQualityFilter] = useState(false);

    const ToggleSwitch: React.FC<{ enabled: boolean; onChange: () => void }> = ({ enabled, onChange }) => (
        <button
            onClick={onChange}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-gray-700'
                }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
            />
        </button>
    );

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold">Notification Preferences</h3>

            {/* Push Notifications */}
            <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Push Notifications
                </h4>
                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                    <div>
                        <p className="font-medium">Enable Push Notifications</p>
                        <p className="text-sm text-gray-500">Receive notifications on your device</p>
                    </div>
                    <ToggleSwitch enabled={pushNotifications} onChange={() => setPushNotifications(!pushNotifications)} />
                </div>

                {pushNotifications && (
                    <div className="space-y-3 ml-4">
                        <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                            <p className="text-sm">Likes</p>
                            <ToggleSwitch enabled={notifyLikes} onChange={() => setNotifyLikes(!notifyLikes)} />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                            <p className="text-sm">Reposts</p>
                            <ToggleSwitch enabled={notifyReposts} onChange={() => setNotifyReposts(!notifyReposts)} />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                            <p className="text-sm">Replies</p>
                            <ToggleSwitch enabled={notifyReplies} onChange={() => setNotifyReplies(!notifyReplies)} />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                            <p className="text-sm">Mentions</p>
                            <ToggleSwitch enabled={notifyMentions} onChange={() => setNotifyMentions(!notifyMentions)} />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                            <p className="text-sm">New Followers</p>
                            <ToggleSwitch enabled={notifyFollows} onChange={() => setNotifyFollows(!notifyFollows)} />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                            <p className="text-sm">Direct Messages</p>
                            <ToggleSwitch enabled={notifyDMs} onChange={() => setNotifyDMs(!notifyDMs)} />
                        </div>
                    </div>
                )}
            </div>

            <hr className="border-gray-800" />

            {/* Email Notifications */}
            <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Notifications
                </h4>
                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                    <div>
                        <p className="font-medium">Enable Email Notifications</p>
                        <p className="text-sm text-gray-500">Receive email updates about your activity</p>
                    </div>
                    <ToggleSwitch enabled={emailNotifications} onChange={() => setEmailNotifications(!emailNotifications)} />
                </div>
            </div>

            <hr className="border-gray-800" />

            {/* Notification Filters */}
            <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Notification Filters
                </h4>
                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                    <div>
                        <p className="font-medium">Quality Filter</p>
                        <p className="text-sm text-gray-500">Filter out notifications from low-quality accounts</p>
                    </div>
                    <ToggleSwitch enabled={qualityFilter} onChange={() => setQualityFilter(!qualityFilter)} />
                </div>
            </div>
        </div>
    );
};

export default NotificationsTab;
