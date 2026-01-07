import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, setUser, removeToken, removeUser, userAPI } from '@/utils/api';
import {
    User,
    Mail,
    Shield,
    Lock,
    Pencil,
    Loader,
    Camera
} from 'lucide-react';

export default function Settings() {
    const navigate = useNavigate();
    const [user, setUserState] = useState(getUser());
    const fileInputRef = useRef(null);

    // Separate editing states
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        displayName: user?.displayName || '',
        email: user?.sub || user?.email || '', // JWT often stores email in sub
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError('Image size must be less than 2MB');
            return;
        }

        setIsUploadingAvatar(true);
        setError(null);

        try {
            // Convert to base64
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target?.result;
                try {
                    const response = await userAPI.updateAvatar(base64);
                    const updatedUser = { ...user, avatarUrl: response.avatarUrl };
                    setUser(updatedUser);
                    setUserState(updatedUser);
                    setSuccess('Avatar updated successfully');
                    setTimeout(() => setSuccess(null), 3000);
                } catch (err) {
                    setError(err.message || 'Failed to update avatar');
                } finally {
                    setIsUploadingAvatar(false);
                }
            };
            reader.onerror = () => {
                setError('Failed to read image file');
                setIsUploadingAvatar(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            setError('Failed to process image');
            setIsUploadingAvatar(false);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await userAPI.updateProfile(formData.displayName);
            // Update localStorage with new user data
            const updatedUser = { ...user, displayName: response.displayName };
            setUser(updatedUser);
            setUserState(updatedUser);
            setIsEditingProfile(false);
            setSuccess('Profile updated successfully');
            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Fallback submit handler if needed
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Please Log In</h2>
                    <p className="text-gray-600 mb-6">You need to be logged in to view settings.</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 py-8">
            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid gap-8">
                    {/* Profile Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 sm:p-8 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                            <div className="flex items-center gap-6">
                                {/* Avatar with edit overlay */}
                                <div className="relative group">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleAvatarChange}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAvatarClick}
                                        disabled={isUploadingAvatar}
                                        className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md text-emerald-600 border border-emerald-100 overflow-hidden cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                                    >
                                        {isUploadingAvatar ? (
                                            <Loader size={24} className="animate-spin text-emerald-600" />
                                        ) : user.avatarUrl ? (
                                            <img
                                                src={user.avatarUrl}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User size={40} />
                                        )}
                                    </button>
                                    {/* Camera overlay */}
                                    <div
                                        onClick={handleAvatarClick}
                                        className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    >
                                        <Camera size={20} className="text-white" />
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{user.displayName || 'User'}</h2>
                                    <p className="text-gray-500 flex items-center gap-2 mt-1">
                                        <Mail size={16} />
                                        {user.sub || user.email || 'No email provided'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wide rounded-full">
                                            {user.role || 'USER'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 sm:p-8">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <User size={20} className="text-emerald-600" />
                                Personal Information
                            </h3>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-sm">
                                    {success}
                                </div>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                User Name
                                            </label>
                                            {!isEditingProfile ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEditingProfile(true)}
                                                    className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1"
                                                >
                                                    <Pencil size={14} /> Edit
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsEditingProfile(false);
                                                            setFormData(prev => ({ ...prev, displayName: user?.displayName || '' }));
                                                            setError(null);
                                                        }}
                                                        className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                                                        disabled={isSaving}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveProfile}
                                                        className="text-emerald-600 hover:text-emerald-700 text-xs font-medium flex items-center gap-1"
                                                        disabled={isSaving}
                                                    >
                                                        {isSaving ? <Loader size={12} className="animate-spin" /> : null}
                                                        Save
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                value={formData.displayName}
                                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                                disabled={!isEditingProfile}
                                                className={`w-full pl-10 pr-4 py-2 border rounded-lg outline-none transition-all ${isEditingProfile
                                                    ? 'border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900'
                                                    : 'border-transparent bg-transparent text-gray-900 px-0'
                                                    }`}
                                            />
                                        </div>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                disabled
                                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-100">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                            <Shield size={20} className="text-emerald-600" />
                                            Security
                                        </h3>
                                        {!isEditingPassword ? (
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingPassword(true)}
                                                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1"
                                            >
                                                <Pencil size={14} /> Change Password
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsEditingPassword(false);
                                                        setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
                                                    }}
                                                    className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsEditingPassword(false);
                                                        alert('Password updated (Simulation)');
                                                    }}
                                                    className="text-emerald-600 hover:text-emerald-700 text-xs font-medium"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {isEditingPassword && (
                                        <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Current Password
                                                </label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                    <input
                                                        type="password"
                                                        value={formData.currentPassword}
                                                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white text-gray-900"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    New Password
                                                </label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                    <input
                                                        type="password"
                                                        value={formData.newPassword}
                                                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white text-gray-900"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!isEditingPassword && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Password
                                                </label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                    <input
                                                        type="password"
                                                        value="********"
                                                        disabled
                                                        className="w-full pl-10 pr-4 py-2 border border-transparent bg-transparent text-gray-900 px-0 rounded-lg outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}

