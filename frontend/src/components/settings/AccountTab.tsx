import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const AccountTab: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [location, setLocation] = useState('');
    const [website, setWebsite] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
    const [bannerImagePreview, setBannerImagePreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const profileInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    // Load user data on mount
    useEffect(() => {
        if (user) {
            setDisplayName(user.display_name || '');
            setBio(user.bio || '');
            setLocation(user.location || '');
            setWebsite(user.website || '');
            setUsername(user.username || '');
            setEmail(user.email || '');

            // Set existing avatar and banner URLs as previews
            if (user.avatar_url) {
                setProfilePicturePreview(user.avatar_url);
            }
            if (user.banner_url) {
                setBannerImagePreview(user.banner_url);
            }
        }
    }, [user]);

    const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfilePictureFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicturePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setBannerImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setBannerImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!user) return;

        setSaving(true);
        try {
            const formData = new FormData();

            // Add text fields
            formData.append('display_name', displayName);
            formData.append('bio', bio);
            formData.append('location', location);
            formData.append('website', website);
            formData.append('username', username);
            formData.append('email', email);
            formData.append('user_id', user.id.toString());

            // Add profile picture if changed
            if (profilePictureFile) {
                formData.append('avatar', profilePictureFile);
            }

            // Add banner image if changed
            if (bannerImageFile) {
                formData.append('banner', bannerImageFile);
            }

            // Save to backend
            const response = await api.put('/users/profile', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Update auth context with new user data
            if (response.data.user) {
                updateUser(response.data.user);
            }

            alert('Profile updated successfully!');

        } catch (error: any) {
            console.error('Save error:', error);
            alert(error.response?.data?.error || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold">Account Settings</h3>

            {/* Banner Image */}
            <div>
                <label className="block text-sm font-medium mb-2">Banner Image</label>
                <div className="relative h-32 bg-gray-900 rounded-lg overflow-hidden group">
                    {bannerImagePreview ? (
                        <img src={bannerImagePreview} alt="Banner" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600" />
                    )}
                    <button
                        onClick={() => bannerInputRef.current?.click()}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                        <Upload className="w-6 h-6" />
                    </button>
                    <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleBannerChange}
                        className="hidden"
                    />
                </div>
            </div>

            {/* Profile Picture */}
            <div>
                <label className="block text-sm font-medium mb-2">Profile Picture</label>
                <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-900 group">
                        <img
                            src={profilePicturePreview || user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                        <button
                            onClick={() => profileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                            <Camera className="w-5 h-5" />
                        </button>
                        <input
                            ref={profileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePictureChange}
                            className="hidden"
                        />
                    </div>
                    <p className="text-sm text-gray-500">Click to upload a new profile picture</p>
                </div>
            </div>

            {/* Display Name */}
            <div>
                <label htmlFor="displayName" className="block text-sm font-medium mb-2">
                    Display Name
                </label>
                <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-primary"
                    placeholder="Your display name"
                />
            </div>

            {/* Bio */}
            <div>
                <label htmlFor="bio" className="block text-sm font-medium mb-2">
                    Bio
                </label>
                <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={160}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-primary resize-none"
                    placeholder="Tell us about yourself"
                />
                <p className="text-xs text-gray-500 mt-1">{bio.length} / 160</p>
            </div>

            {/* Location */}
            <div>
                <label htmlFor="location" className="block text-sm font-medium mb-2">
                    Location
                </label>
                <input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-primary"
                    placeholder="Where are you located?"
                />
            </div>

            {/* Website */}
            <div>
                <label htmlFor="website" className="block text-sm font-medium mb-2">
                    Website
                </label>
                <input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-primary"
                    placeholder="https://yourwebsite.com"
                />
            </div>

            {/* Username */}
            <div>
                <label htmlFor="username" className="block text-sm font-medium mb-2">
                    Username
                </label>
                <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-primary"
                    placeholder="username"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Changing username will update your @mention
                </p>
            </div>

            {/* Email */}
            <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email
                </label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-primary"
                    placeholder="your@email.com"
                />
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-primary text-white font-bold py-3 px-6 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
                {saving ? 'Saving...' : 'Save Account Settings'}
            </button>
        </div>
    );
};

export default AccountTab;
