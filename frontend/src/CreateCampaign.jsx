import React from 'react';
import { Sprout } from 'lucide-react';

export default function CreateCampaign() {
    return (
        <div className="bg-gray-50">
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
