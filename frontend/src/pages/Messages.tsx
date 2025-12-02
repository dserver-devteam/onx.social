import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail, Search, Send, Image as ImageIcon, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { Conversation, Message } from '@/types/message';
import { formatDistanceToNow } from 'date-fns';
import { cn, getProxiedImageUrl } from '@/lib/utils';

const Messages: React.FC = () => {
    const { userId: paramUserId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const init = async () => {
            await loadConversations();

            // If userId param is provided, open that conversation after conversations are loaded
            if (paramUserId) {
                console.log('Auto-opening conversation with user:', paramUserId);
                await openConversationWithUser(parseInt(paramUserId));
            }
        };

        init();
    }, [user, paramUserId]);

    // Poll for new messages every 3 seconds when a conversation is selected
    useEffect(() => {
        if (!selectedConversation) return;

        const interval = setInterval(() => {
            loadMessages(selectedConversation.id);
        }, 3000);

        return () => clearInterval(interval);
    }, [selectedConversation]);

    const loadConversations = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const response = await api.get('/messages/conversations', {
                headers: { 'x-user-id': user.id }
            });
            setConversations(response.data.conversations || []);
        } catch (error) {
            console.error('Error loading conversations:', error);
            setConversations([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };


    const openConversationWithUser = async (otherUserId: number) => {
        if (!user) return;

        try {
            console.log('Opening conversation with user:', otherUserId);
            const response = await api.get(`/messages/conversation/${otherUserId}`, {
                headers: { 'x-user-id': user.id }
            });
            const conv = response.data.conversation;
            console.log('Conversation loaded:', conv);

            // Set the conversation first
            setSelectedConversation(conv);

            // Then load messages
            await loadMessages(conv.id);

            // Reload conversations to update list
            await loadConversations();
        } catch (error) {
            console.error('Error opening conversation:', error);
        }
    };

    const loadMessages = async (conversationId: number) => {
        if (!user) return;

        try {
            const response = await api.get(`/messages/${conversationId}`, {
                headers: { 'x-user-id': user.id }
            });
            setMessages(response.data.messages);

            // Mark all messages as read
            await api.put(`/messages/conversation/${conversationId}/read-all`, {}, {
                headers: { 'x-user-id': user.id }
            });

            // Reload conversations to update unread counts
            loadConversations();
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleSelectConversation = (conversation: Conversation) => {
        setSelectedConversation(conversation);
        loadMessages(conversation.id);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSendMessage = async () => {
        if (!user || !selectedConversation || (!newMessage.trim() && !imageFile)) return;

        try {
            setSending(true);
            let imageUrl = null;

            // Upload image if present
            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);
                const uploadResponse = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                imageUrl = uploadResponse.data.url;
            }

            // Send message
            await api.post('/messages/send', {
                recipient_id: selectedConversation.other_user.id,
                content: newMessage.trim() || undefined,
                image_url: imageUrl
            }, {
                headers: { 'x-user-id': user.id }
            });

            // Clear input and reload
            setNewMessage('');
            setImageFile(null);
            setImagePreview(null);
            loadMessages(selectedConversation.id);
            loadConversations();
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    const filteredConversations = (conversations || []).filter(conv =>
        conv.other_user?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.other_user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-gray-500">Loading messages...</div>
            </div>
        );
    }

    return (
        <div className="flex h-screen">
            {/* Conversations List */}
            <div className={cn(
                "w-full md:w-96 border-r border-gray-800 flex flex-col",
                selectedConversation && "hidden md:flex"
            )}>
                <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4 z-10">
                    <h1 className="text-xl font-bold mb-3">Messages</h1>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search messages"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-900 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4">
                            <Mail className="w-16 h-16 text-gray-700 mb-4" />
                            <h2 className="text-xl font-bold mb-2">No messages yet</h2>
                            <p className="text-gray-500 text-center">
                                Start a conversation by visiting a user's profile
                            </p>
                        </div>
                    ) : (
                        filteredConversations.map((conv) => (
                            <div
                                key={conv.id}
                                onClick={() => handleSelectConversation(conv)}
                                className={cn(
                                    "border-b border-gray-800 p-4 hover:bg-white/5 transition-colors cursor-pointer",
                                    selectedConversation?.id === conv.id && "bg-white/5"
                                )}
                            >
                                <div className="flex gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                                        <img
                                            src={getProxiedImageUrl(conv.other_user.avatar_url) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.other_user.username}`}
                                            alt={conv.other_user.username}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold truncate">{conv.other_user.display_name}</span>
                                            <span className="text-xs text-gray-500">
                                                {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-gray-500 truncate">
                                                {conv.last_message.image_url && !conv.last_message.content ? '📷 Photo' : conv.last_message.content}
                                            </p>
                                            {conv.unread_count > 0 && (
                                                <span className="bg-primary text-white text-xs rounded-full px-2 py-0.5 ml-2">
                                                    {conv.unread_count}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Message Thread */}
            <div className={cn(
                "flex-1 flex flex-col",
                !selectedConversation && "hidden md:flex"
            )}>
                {selectedConversation ? (
                    <>
                        {/* Header */}
                        <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4 z-10">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedConversation(null)}
                                    className="md:hidden text-primary hover:text-primary/80"
                                >
                                    ← Back
                                </button>
                                <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                                    <img
                                        src={getProxiedImageUrl(selectedConversation.other_user.avatar_url) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedConversation.other_user.username}`}
                                        alt={selectedConversation.other_user.username}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <div className="font-bold">{selectedConversation.other_user.display_name}</div>
                                    <div className="text-sm text-gray-500">@{selectedConversation.other_user.username}</div>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((message) => {
                                const isSent = message.sender.id === user?.id;
                                return (
                                    <div
                                        key={message.id}
                                        className={cn(
                                            "flex gap-3",
                                            isSent && "flex-row-reverse"
                                        )}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                                            <img
                                                src={getProxiedImageUrl(message.sender.avatar_url) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.sender.username}`}
                                                alt={message.sender.username}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className={cn(
                                            "max-w-xs lg:max-w-md",
                                            isSent && "items-end"
                                        )}>
                                            {message.image_url && (
                                                <img
                                                    src={getProxiedImageUrl(message.image_url)}
                                                    alt="Message attachment"
                                                    className="rounded-lg mb-2 max-w-full"
                                                />
                                            )}
                                            {message.content && (
                                                <div className={cn(
                                                    "rounded-2xl px-4 py-2",
                                                    isSent ? "bg-primary text-white" : "bg-gray-800"
                                                )}>
                                                    {message.content}
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-500 mt-1 px-2">
                                                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Input */}
                        <div className="border-t border-gray-800 p-4">
                            {imagePreview && (
                                <div className="mb-2 relative inline-block">
                                    <img src={imagePreview} alt="Preview" className="h-20 rounded-lg" />
                                    <button
                                        onClick={() => {
                                            setImageFile(null);
                                            setImagePreview(null);
                                        }}
                                        className="absolute -top-2 -right-2 bg-gray-900 rounded-full p-1 hover:bg-gray-800"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <label className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-800 transition-colors cursor-pointer">
                                    <ImageIcon className="w-5 h-5 text-primary" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                        className="hidden"
                                    />
                                </label>
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    className="flex-1 bg-gray-900 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                    disabled={sending}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={sending || (!newMessage.trim() && !imageFile)}
                                    className="flex items-center justify-center w-10 h-10 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                        <Mail className="w-16 h-16 text-gray-700 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Select a message</h2>
                        <p className="text-gray-500 text-center">
                            Choose from your existing conversations or start a new one
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Messages;
