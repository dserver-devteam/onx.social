import React, { useState, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface CreateStoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
    const [caption, setCaption] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);

            // Determine media type
            const type = file.type.startsWith('video/') ? 'video' : 'image';
            setMediaType(type);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setMediaPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePost = async () => {
        if (!user || !mediaFile || !mediaType) return;

        setUploading(true);
        try {
            // For now, use base64 preview as media_url
            // In production, upload to S3 first
            await api.post('/stories', {
                user_id: user.id,
                media_url: mediaPreview,
                media_type: mediaType,
                caption: caption.trim() || null,
            });

            alert('Story posted successfully!');
            setMediaFile(null);
            setMediaPreview(null);
            setMediaType(null);
            setCaption('');
            onClose();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error('Post story error:', error);
            alert(error.response?.data?.error || 'Failed to post story');
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold">Create Story</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Media Upload */}
                    {!mediaPreview ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-700 rounded-2xl p-12 text-center cursor-pointer hover:border-primary transition-colors"
                        >
                            <Upload className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400 mb-2">Click to upload photo or video</p>
                            <p className="text-sm text-gray-600">Max 50MB</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                    ) : (
                        <div className="relative rounded-2xl overflow-hidden bg-black">
                            {mediaType === 'image' ? (
                                <img
                                    src={mediaPreview}
                                    alt="Story preview"
                                    className="w-full max-h-96 object-contain"
                                />
                            ) : (
                                <video
                                    src={mediaPreview}
                                    controls
                                    className="w-full max-h-96"
                                />
                            )}
                            <button
                                onClick={() => {
                                    setMediaFile(null);
                                    setMediaPreview(null);
                                    setMediaType(null);
                                }}
                                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* Caption */}
                    {mediaPreview && (
                        <div>
                            <label htmlFor="caption" className="block text-sm font-medium mb-2">
                                Caption (optional)
                            </label>
                            <textarea
                                id="caption"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                maxLength={200}
                                rows={3}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary resize-none"
                                placeholder="Add a caption..."
                            />
                            <p className="text-xs text-gray-500 mt-1">{caption.length} / 200</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {mediaPreview && (
                    <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-4 flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-full font-bold hover:bg-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePost}
                            disabled={uploading}
                            className="px-6 py-2 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? 'Posting...' : 'Post Story'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateStoryModal;
