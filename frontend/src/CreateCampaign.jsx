import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sprout } from 'lucide-react';

export default function CreateCampaign() {
    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center gap-2 group">
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform shadow-sm">
                                <Sprout className="text-white" size={20} strokeWidth={2.5} />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-gray-900">
                                BlockFund
                            </span>
                        </Link>
                        <Link
                            to="/"
                            className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors"
                        >
                            <ArrowLeft size={20} />
                            <span className="font-medium">Back to Home</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Content - Placeholder for future updates */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Create Your Campaign</h1>
                    <p className="text-gray-500 mb-8">This page will be updated with campaign creation features.</p>
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm">
                        <div className="text-gray-400">
                            <Sprout size={64} className="mx-auto mb-4 text-emerald-300" />
                            <p className="text-lg">...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
