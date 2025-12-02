import React, { useState, useRef } from 'react';
import { Image, Smile, Calendar, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const ComposeBox: React.FC<{ onPostCreated?: () => void }> = ({ onPostCreated }) => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            if (files.length + newFiles.length > 4) {
                alert('You can only upload up to 4 media files');
                return;
            }

            setFiles([...files, ...newFiles]);

            // Generate previews
            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setPreviews([...previews, ...newPreviews]);
        }
    };

    const removeFile = (index: number) => {
        const newFiles = [...files];
        const newPreviews = [...previews];

        URL.revokeObjectURL(newPreviews[index]); // Cleanup

        newFiles.splice(index, 1);
        newPreviews.splice(index, 1);

        setFiles(newFiles);
        setPreviews(newPreviews);
    };

    const handlePost = async () => {
        if (!user) return; // Must be logged in
        if ((!content.trim() && files.length === 0) || isPosting) return;

        try {
            setIsPosting(true);

            const formData = new FormData();
            formData.append('content', content);
            formData.append('user_id', user.id.toString());

            files.forEach(file => {
                formData.append('media', file);
            });

            await api.post('/posts', formData);

            setContent('');
            setFiles([]);
            setPreviews([]);
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }

            if (onPostCreated) onPostCreated();
        } catch (error) {
            console.error('Failed to create post:', error);
        } finally {
            setIsPosting(false);
        }
    };

    const adjustHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    };

    if (!user) return null;

    return (
        <div className="border-b border-gray-800 p-4">
            <div className="flex gap-3">
                <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                        <img
                            src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                            alt={user.username}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
                <div className="flex-1">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => {
                            setContent(e.target.value);
                            adjustHeight();
                        }}
                        placeholder="What is happening?!"
                        className="w-full bg-transparent text-xl placeholder-gray-500 border-none focus:ring-0 resize-none min-h-[50px] outline-none"
                        rows={1}
                    />

                    {/* File Previews */}
                    {previews.length > 0 && (
                        <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                            {previews.map((preview, index) => (
                                <div key={index} className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border border-gray-800">
                                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-3 border-t border-gray-800 pt-3">
                        <div className="flex gap-2 text-primary">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                multiple
                                accept="image/*,video/*"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 hover:bg-primary/10 rounded-full transition-colors"
                            >
                                <Image className="w-5 h-5" />
                            </button>
                            <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
                                <Smile className="w-5 h-5" />
                            </button>
                            <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
                                <Calendar className="w-5 h-5" />
                            </button>
                            <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
                                <MapPin className="w-5 h-5" />
                            </button>
                        </div>

                        <button
                            onClick={handlePost}
                            disabled={(!content.trim() && files.length === 0) || isPosting}
                            className={cn(
                                "bg-primary text-white font-bold py-1.5 px-4 rounded-full transition-all",
                                (!content.trim() && files.length === 0) || isPosting ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/90"
                            )}
                        >
                            {isPosting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Post'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComposeBox;
