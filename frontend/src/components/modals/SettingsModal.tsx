import React, { useState } from 'react';
import { X } from 'lucide-react';
import AccountTab from '@/components/settings/AccountTab';
import SecurityTab from '@/components/settings/SecurityTab';
import PrivacyTab from '@/components/settings/PrivacyTab';
import NotificationsTab from '@/components/settings/NotificationsTab';
import DisplayTab from '@/components/settings/DisplayTab';
import DataTab from '@/components/settings/DataTab';
import DangerZone from '@/components/settings/DangerZone';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabType = 'account' | 'security' | 'privacy' | 'notifications' | 'display' | 'data' | 'danger';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<TabType>('account');

    if (!isOpen) return null;

    const tabs: { id: TabType; label: string }[] = [
        { id: 'account', label: 'Account' },
        { id: 'security', label: 'Security' },
        { id: 'privacy', label: 'Privacy' },
        { id: 'notifications', label: 'Notifications' },
        { id: 'display', label: 'Display' },
        { id: 'data', label: 'Data & Privacy' },
        { id: 'danger', label: 'Danger Zone' },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'account':
                return <AccountTab />;
            case 'security':
                return <SecurityTab />;
            case 'privacy':
                return <PrivacyTab />;
            case 'notifications':
                return <NotificationsTab />;
            case 'display':
                return <DisplayTab />;
            case 'data':
                return <DataTab />;
            case 'danger':
                return <DangerZone />;
            default:
                return <AccountTab />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-black border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <h2 className="text-xl font-bold">Settings</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-900 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-800 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                                activeTab === tab.id
                                    ? 'text-primary border-b-2 border-primary'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
