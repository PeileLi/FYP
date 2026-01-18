import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Calendar, ArrowUpRight, Loader } from 'lucide-react';
import { donationAPI } from '@/utils/api';

export default function DonationHistory() {
    const navigate = useNavigate();
    const [donations, setDonations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDonations = async () => {
            try {
                const data = await donationAPI.getMyHistory();
                setDonations(data);
            } catch (err) {
                console.error('Failed to fetch donations:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDonations();
    }, []);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-full py-20">
                    <Loader className="animate-spin text-emerald-600 mb-4" size={32} />
                    <p className="text-gray-500">Loading your donations...</p>
                </div>
            );
        }

        if (donations.length === 0) {
            return (
                <div className="p-12 text-center h-full flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <Heart size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No donations yet</h3>
                    <p className="text-gray-500 mb-6">Start your journey of giving today.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        Browse Campaigns
                    </button>
                </div>
            );
        }

        return (
            <div className="divide-y divide-gray-100">
                {donations.map((donation) => (
                    <div key={donation.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                                    <Heart size={20} fill="currentColor" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{donation.campaignTitle}</h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                        <Calendar size={14} />
                                        {formatDate(donation.date)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-6 pl-14 sm:pl-0">
                                <div className="text-right">
                                    <div className="font-bold text-emerald-600">¥{donation.amount.toLocaleString()}</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wide bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-1">
                                        {donation.status}
                                    </div>
                                </div>
                                {donation.transactionHash && (
                                    <button
                                        className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
                                        title={`Transaction Hash: ${donation.transactionHash}`}
                                        onClick={() => {
                                            // In a real app, this might open a blockchain explorer
                                            alert(`Transaction Hash: ${donation.transactionHash}`);
                                        }}
                                    >
                                        <ArrowUpRight size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="bg-gray-50 py-8">
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[300px]">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}
