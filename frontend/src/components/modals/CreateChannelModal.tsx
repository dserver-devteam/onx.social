import React, { useState, useRef } from 'react';
import { X, Camera } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface CreateChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreate = async () => {
        if (!user || !name.trim()) return;

        setCreating(true);
        try {
            // TODO: Upload avatar to S3 if provided
            let avatar_url = null;
            if (avatarFile) {
                // For now, use preview URL (in production, upload to S3)
                avatar_url = avatarPreview;
            }

            await api.post('/channels', {
                name: name.trim(),
                description: description.trim() || null,
                avatar_url,
                user_id: user.id,
            });

            alert('Channel created successfully!');
            setName('');
            setDescription('');
            setAvatarFile(null);
            setAvatarPreview(null);
            onClose();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error('Create channel error:', error);
            alert(error.response?.data?.error || 'Failed to create channel');
        } finally {
            setCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-black border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-black border-b border-gray-800 p-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold">Create Channel</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-900 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Avatar Upload */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Channel Avatar</label>
                        <div className="flex items-center gap-4">
                            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-900 group">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                                        {name.charAt(0).toUpperCase() || '?'}
                                    </div>
                                )}
                                <button
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    <Camera className="w-5 h-5" />
                                </button>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                            </div>
                            <p className="text-sm text-gray-500">Click to upload a channel avatar</p>
                        </div>
                    </div>

                    {/* Channel Name */}
                    <div>
                        <label htmlFor="channelName" className="block text-sm font-medium mb-2">
                            Channel Name *
                        </label>
                        <input
                            id="channelName"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={255}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-primary"
                            placeholder="e.g., Tech News, Daily Updates"
                        />
                        <p className="text-xs text-gray-500 mt-1">{name.length} / 255</p>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium mb-2">
                            Description
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={500}
                            rows={4}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-primary resize-none"
                            placeholder="What's your channel about?"
                        />
                        <p className="text-xs text-gray-500 mt-1">{description.length} / 500</p>
                    </div>

                    {/* Info */}
                    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                        <p className="text-sm text-gray-400">
                            <strong className="text-white">Note:</strong> Only you can post updates to your channel.
                            Others can follow to see your updates in their feed.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-black border-t border-gray-800 p-4 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-full font-bold hover:bg-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!name.trim() || creating}
                        className="px-6 py-2 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {creating ? 'Creating...' : 'Create Channel'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateChannelModal;
