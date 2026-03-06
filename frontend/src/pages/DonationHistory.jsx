import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Calendar, Loader, X, Award, Copy, Check, Shield, ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react';
import { donationAPI } from '@/utils/api';

export default function DonationHistory() {
    const navigate = useNavigate();
    const [donations, setDonations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDonation, setSelectedDonation] = useState(null);
    const [copied, setCopied] = useState(false);

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

    const formatShortDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {});
    };

    // Donation Certificate Modal
    const CertificateModal = ({ donation, onClose }) => {
        if (!donation) return null;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

                {/* Certificate */}
                <div
                    className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-1.5 bg-white/80 hover:bg-white rounded-full shadow transition-colors"
                    >
                        <X size={18} className="text-gray-500" />
                    </button>

                    {/* Certificate Header */}
                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-8 pt-8 pb-6 text-center text-white">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
                            <Award size={32} className="text-white" />
                        </div>
                        <h2 className="text-xl font-bold mb-1">Donation Certificate</h2>
                        <p className="text-emerald-100 text-sm">Thank you for your generous contribution</p>
                    </div>

                    {/* Certificate Body */}
                    <div className="px-8 py-6">
                        {/* Donation Details */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <span className="text-sm text-gray-500">Campaign</span>
                                <span className="text-sm font-semibold text-gray-900 text-right max-w-[60%]">{donation.campaignTitle}</span>
                            </div>
                            <div className="border-t border-dashed border-gray-200" />

                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Amount</span>
                                <span className="text-2xl font-bold text-emerald-600">€{donation.amount.toLocaleString()}</span>
                            </div>
                            <div className="border-t border-dashed border-gray-200" />

                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Donor</span>
                                <span className="text-sm font-medium text-gray-900">{donation.displayName || donation.donorName}</span>
                            </div>
                            <div className="border-t border-dashed border-gray-200" />

                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Date</span>
                                <span className="text-sm text-gray-700">{formatShortDate(donation.date)}</span>
                            </div>
                            <div className="border-t border-dashed border-gray-200" />

                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Status</span>
                                <span className="text-xs font-semibold uppercase tracking-wide bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                                    {donation.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Blockchain Footer */}
                    <div className="bg-gray-50 border-t border-gray-100 px-8 py-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Shield size={14} className="text-emerald-600" />
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Blockchain Record</span>
                            </div>
                            {donation.blockchainVerificationStatus === 'VERIFIED' && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                                    <ShieldCheck size={12} /> Verified
                                </span>
                            )}
                            {donation.blockchainVerificationStatus === 'NOT_ON_CHAIN' && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-200 px-2.5 py-1 rounded-full">
                                    <ShieldOff size={12} /> Not On-Chain
                                </span>
                            )}
                            {donation.blockchainVerificationStatus === 'AMOUNT_MISMATCH' && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-2.5 py-1 rounded-full">
                                    <ShieldAlert size={12} /> Amount Mismatch
                                </span>
                            )}
                            {donation.blockchainVerificationStatus === 'NOT_FOUND_ON_CHAIN' && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-100 px-2.5 py-1 rounded-full">
                                    <ShieldAlert size={12} /> Not Found
                                </span>
                            )}
                            {donation.blockchainVerificationStatus === 'VERIFICATION_FAILED' && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-100 px-2.5 py-1 rounded-full">
                                    <ShieldAlert size={12} /> Check Failed
                                </span>
                            )}
                        </div>
                        {donation.transactionHash ? (
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
                                <code className="text-xs text-gray-600 font-mono flex-1 break-all leading-relaxed">
                                    {donation.transactionHash}
                                </code>
                                <button
                                    onClick={() => copyToClipboard(donation.transactionHash)}
                                    className="p-1.5 hover:bg-gray-100 rounded-md transition-colors shrink-0"
                                    title="Copy Transaction ID"
                                >
                                    {copied ? (
                                        <Check size={14} className="text-green-500" />
                                    ) : (
                                        <Copy size={14} className="text-gray-400" />
                                    )}
                                </button>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic">Not recorded on blockchain</p>
                        )}
                    </div>
                </div>
            </div>
        );
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
                    <div
                        key={donation.id}
                        className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedDonation(donation)}
                    >
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
                            <div className="flex items-center gap-4 pl-14 sm:pl-0">
                                <div className="text-right">
                                    <div className="font-bold text-emerald-600">€{donation.amount.toLocaleString()}</div>
                                    <div className="flex items-center gap-1.5 mt-1 justify-end">
                                        <span className="text-xs text-gray-500 uppercase tracking-wide bg-gray-100 px-2 py-0.5 rounded-full">
                                            {donation.status}
                                        </span>
                                        {donation.blockchainVerificationStatus === 'VERIFIED' && (
                                            <span className="flex items-center gap-0.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                <ShieldCheck size={12} /> On-Chain
                                            </span>
                                        )}
                                        {donation.blockchainVerificationStatus === 'NOT_ON_CHAIN' && (
                                            <span className="flex items-center gap-0.5 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                                                <ShieldOff size={12} /> Off-Chain
                                            </span>
                                        )}
                                        {(donation.blockchainVerificationStatus === 'AMOUNT_MISMATCH' || donation.blockchainVerificationStatus === 'NOT_FOUND_ON_CHAIN') && (
                                            <span className="flex items-center gap-0.5 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                                <ShieldAlert size={12} /> Mismatch
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Award size={18} className="text-gray-300" />
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

            {/* Certificate Modal */}
            {selectedDonation && (
                <CertificateModal
                    donation={selectedDonation}
                    onClose={() => {
                        setSelectedDonation(null);
                        setCopied(false);
                    }}
                />
            )}
        </div>
    );
}
