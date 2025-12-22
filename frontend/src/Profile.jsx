import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '@/utils/api';
import { User, Mail, Calendar, ShieldCheck } from 'lucide-react';

export default function Profile() {
    const navigate = useNavigate();
    const [user] = useState(getUser());

    if (!user) {
        navigate('/login');
        return null;
    }

    return (
        <div className="bg-gray-50 py-8">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-md text-emerald-600 border border-emerald-100 overflow-hidden">
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={48} />
                                )}
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900">{user.displayName || 'User'}</h2>
                                <p className="text-gray-500 flex items-center gap-2 mt-2">
                                    <Mail size={16} />
                                    {user.sub || user.email || 'No email provided'}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-8">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <ShieldCheck className="text-emerald-600" size={20} />
                                    Account Status
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                                    <span className="text-gray-700 font-medium">Active</span>
                                </div>
                                <p className="text-sm text-gray-500 mt-2">Your account is fully verified and active.</p>
                            </div>
                            
                            <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Calendar className="text-emerald-600" size={20} />
                                    Member Since
                                </h3>
                                <p className="text-gray-700 font-medium">December 2025</p>
                                <p className="text-sm text-gray-500 mt-2">Thank you for being part of our community.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

