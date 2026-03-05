import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Shield,
    CheckCircle,
    XCircle,
    ArrowLeft,
    Copy,
    ExternalLink,
    Database,
    Link as LinkIcon,
    Calendar,
    User,
    FileText,
    AlertCircle,
    Target,
    Hash,
    DollarSign,
    Heart
} from 'lucide-react';
import { blockchainAPI } from '../utils/api';

export default function BlockchainSearch() {
    const navigate = useNavigate();
    const [searchValue, setSearchValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const [searchType, setSearchType] = useState(null); // 'campaign' or 'donation'
    const [donationResult, setDonationResult] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        setError('');
        setResult(null);
        setDonationResult(null);
        setSearchType(null);
        setIsLoading(true);

        try {
            const value = searchValue.trim();
            if (value.startsWith('BD')) {
                // Search for donation (BD certificate format)
                setSearchType('donation');
                const response = await blockchainAPI.searchDonation(value);
                setDonationResult(response);
            } else {
                // Search for campaign (BC prefix or raw)
                setSearchType('campaign');
                const response = await blockchainAPI.searchByTxId(value);
                setResult(response);
            }
        } catch (err) {
            setError(err.message || 'Failed to search blockchain data');
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // You could add a toast notification here
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center text-gray-500 hover:text-gray-700 mb-4 transition-colors"
                    >
                        <ArrowLeft size={20} className="mr-2" />
                        Back to Home
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <Shield className="text-blue-600" size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Blockchain Verification</h1>
                            <p className="text-gray-600 mt-1">Search and verify campaign data on the blockchain</p>
                        </div>
                    </div>
                </div>

                {/* Search Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                    <div className="p-8">
                        <form onSubmit={handleSearch} className="space-y-6">
                            {/* Search Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Blockchain Certificate ID
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)}
                                        required
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all"
                                        placeholder="Enter certificate ID (BC... or BD...)"
                                    />
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                                    <AlertCircle size={20} />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Search Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Searching...</span>
                                    </div>
                                ) : (
                                    <>
                                        <Shield size={20} className="mr-2" />
                                        Search Blockchain
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Results Card */}
                {result && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-8">
                            {/* Verification Status */}
                            <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${result.verified
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-red-50 border border-red-200'
                                }`}>
                                {result.verified ? (
                                    <>
                                        <CheckCircle className="text-green-600" size={24} />
                                        <div>
                                            <p className="font-semibold text-green-900">Verification Successful</p>
                                            <p className="text-sm text-green-700">{result.verificationMessage}</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="text-red-600" size={24} />
                                        <div>
                                            <p className="font-semibold text-red-900">Verification Failed</p>
                                            <p className="text-sm text-red-700">{result.verificationMessage}</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {result.verified && (
                                <>
                                    {/* On-chain Trusted State */}
                                    <div className="mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                            <Shield className="mr-2 text-emerald-600" size={20} />
                                            On-chain Trusted State
                                        </h3>
                                        <div className="space-y-3">
                                            <InfoRow
                                                icon={<Database size={18} />}
                                                label="Campaign ID"
                                                value={result.campaignId}
                                                copyable
                                            />
                                            <InfoRow
                                                icon={<User size={18} />}
                                                label="Initiator"
                                                value={result.initiator}
                                            />
                                            <InfoRow
                                                icon={<Calendar size={18} />}
                                                label="Created At"
                                                value={new Date(result.createdAt).toLocaleString()}
                                            />
                                            {result.lastUpdated && (
                                                <InfoRow
                                                    icon={<Calendar size={18} />}
                                                    label="Last Updated"
                                                    value={new Date(result.lastUpdated).toLocaleString()}
                                                />
                                            )}
                                            {result.deadline && (
                                                <InfoRow
                                                    icon={<Calendar size={18} />}
                                                    label="Deadline"
                                                    value={new Date(result.deadline).toLocaleString()}
                                                />
                                            )}
                                            {result.goalAmount !== null && result.goalAmount !== undefined && (
                                                <InfoRow
                                                    icon={<Target size={18} />}
                                                    label="Goal Amount"
                                                    value={`€${result.goalAmount.toFixed(2)}`}
                                                />
                                            )}
                                            <InfoRow
                                                icon={<Shield size={18} />}
                                                label="Status"
                                                value={result.status}
                                                badge
                                            />
                                            {result.auditor && (
                                                <InfoRow
                                                    icon={<CheckCircle size={18} />}
                                                    label="Auditor"
                                                    value={result.auditor}
                                                />
                                            )}
                                            {result.version !== null && result.version !== undefined && (
                                                <InfoRow
                                                    icon={<Database size={18} />}
                                                    label="Version"
                                                    value={result.version.toString()}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Hash Verification Box */}
                                    {result.dataHash && (
                                        <div className="mb-6">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                                <Hash className="mr-2 text-purple-600" size={20} />
                                                Hash Verification
                                            </h3>
                                            <HashVerificationBox result={result} />
                                        </div>
                                    )}

                                    {/* Technical / Blockchain Fields */}
                                    <div className="mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                            <LinkIcon className="mr-2 text-blue-600" size={20} />
                                            Blockchain Certificate
                                        </h3>
                                        <div className="space-y-3">
                                            {result.blockchainTxId && (
                                                <InfoRow
                                                    icon={<LinkIcon size={18} />}
                                                    label="Certificate ID"
                                                    value={result.blockchainTxId}
                                                    copyable
                                                    mono
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* View Campaign Button (only if in database) */}
                                    {result.databaseId && (
                                        <div className="mt-6 pt-6 border-t border-gray-200">
                                            <button
                                                onClick={() => navigate(`/campaigns/${result.databaseId}`)}
                                                className="w-full flex justify-center items-center py-3 px-4 border border-blue-600 rounded-xl text-blue-600 font-semibold hover:bg-blue-50 transition-colors"
                                            >
                                                <ExternalLink size={20} className="mr-2" />
                                                View Campaign Details
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Donation Result Card */}
                {donationResult && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-8">
                            {/* Status */}
                            <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${donationResult.found
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-red-50 border border-red-200'
                                }`}>
                                {donationResult.found ? (
                                    <>
                                        <CheckCircle className="text-green-600" size={24} />
                                        <div>
                                            <p className="font-semibold text-green-900">Donation Found on Blockchain</p>
                                            <p className="text-sm text-green-700">{donationResult.message}</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="text-red-600" size={24} />
                                        <div>
                                            <p className="font-semibold text-red-900">Donation Not Found</p>
                                            <p className="text-sm text-red-700">{donationResult.message}</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {donationResult.found && (
                                <>
                                    {/* Donation Info */}
                                    <div className="mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                            <Heart className="mr-2 text-emerald-600" size={20} />
                                            Donation Information
                                        </h3>
                                        <div className="space-y-3">
                                            <InfoRow
                                                icon={<Database size={18} />}
                                                label="Donation ID"
                                                value={donationResult.donationId}
                                                copyable
                                                mono
                                            />
                                            <InfoRow
                                                icon={<LinkIcon size={18} />}
                                                label="Campaign ID"
                                                value={donationResult.campaignId}
                                                copyable
                                                mono
                                            />
                                            <InfoRow
                                                icon={<DollarSign size={18} />}
                                                label="Amount"
                                                value={donationResult.amount != null ? `€${donationResult.amount.toFixed(2)}` : 'N/A'}
                                            />
                                            {donationResult.donorHash && (
                                                <InfoRow
                                                    icon={<Hash size={18} />}
                                                    label="Donor Hash"
                                                    value={donationResult.donorHash}
                                                    mono
                                                />
                                            )}
                                            <InfoRow
                                                icon={<Calendar size={18} />}
                                                label="Donated At"
                                                value={donationResult.donatedAt ? new Date(donationResult.donatedAt).toLocaleString() : 'N/A'}
                                            />
                                            {donationResult.paymentRefHash && (
                                                <InfoRow
                                                    icon={<Hash size={18} />}
                                                    label="Payment Ref Hash"
                                                    value={donationResult.paymentRefHash}
                                                    mono
                                                />
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Hash Verification Box component
function HashVerificationBox({ result }) {
    const [copiedBlockchain, setCopiedBlockchain] = useState(false);
    const [copiedCalculated, setCopiedCalculated] = useState(false);

    // Calculate hash from blockchain data fields
    const blockchainHash = (result.dataHash || '').toLowerCase();
    const computedHash = (result.computedDataHash || '').toLowerCase();
    const isMatch = blockchainHash && computedHash && blockchainHash === computedHash;

    const handleCopyBlockchain = () => {
        navigator.clipboard.writeText(result.dataHash);
        setCopiedBlockchain(true);
        setTimeout(() => setCopiedBlockchain(false), 2000);
    };

    const handleCopyCalculated = () => {
        navigator.clipboard.writeText(computedHash);
        setCopiedCalculated(true);
        setTimeout(() => setCopiedCalculated(false), 2000);
    };

    return (
        <div className={`border rounded-xl overflow-hidden ${
            isMatch 
                ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50'
                : 'border-red-200 bg-gradient-to-br from-red-50 to-orange-50'
        }`}>
            {/* Verification Status */}
            <div className={`p-4 border-b ${isMatch ? 'border-green-200 bg-green-100/50' : 'border-red-200 bg-red-100/50'}`}>
                <div className="flex items-center gap-3">
                    {isMatch ? (
                        <>
                            <CheckCircle className="text-green-600" size={24} />
                            <div>
                                <p className="font-bold text-green-900">✅ Hash Verification Passed</p>
                                <p className="text-sm text-green-700">Data integrity confirmed - no tampering detected</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <AlertCircle className="text-red-600" size={24} />
                            <div>
                                <p className="font-bold text-red-900">⚠️ Hash Mismatch Detected</p>
                                <p className="text-sm text-red-700">Database data differs from blockchain record</p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Hash Comparison */}
            <div className="p-4 space-y-4">
                {/* Blockchain Hash (Original) */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Shield className="text-blue-600" size={18} />
                            <span className="font-semibold text-gray-900 text-sm">
                                Blockchain Hash (Original)
                            </span>
                        </div>
                        <button
                            onClick={handleCopyBlockchain}
                            className="p-1.5 hover:bg-white rounded-lg transition-colors"
                            title="Copy blockchain hash"
                        >
                            {copiedBlockchain ? (
                                <CheckCircle size={16} className="text-green-600" />
                            ) : (
                                <Copy size={16} className="text-gray-500" />
                            )}
                        </button>
                    </div>
                    <div className="bg-white rounded-lg p-3 font-mono text-xs break-all border border-blue-200">
                        {result.dataHash}
                    </div>
                </div>

                {/* Calculated Hash (Current Database) */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Database className={isMatch ? 'text-green-600' : 'text-red-600'} size={18} />
                            <span className="font-semibold text-gray-900 text-sm">
                                Calculated Hash (Current)
                            </span>
                        </div>
                        <button
                            onClick={handleCopyCalculated}
                            className="p-1.5 hover:bg-white rounded-lg transition-colors"
                            title="Copy calculated hash"
                        >
                            {copiedCalculated ? (
                                <CheckCircle size={16} className="text-green-600" />
                            ) : (
                                <Copy size={16} className="text-gray-500" />
                            )}
                        </button>
                    </div>
                    <div className={`bg-white rounded-lg p-3 font-mono text-xs break-all border ${
                        isMatch ? 'border-green-200' : 'border-red-200'
                    }`}>
                        {computedHash || 'N/A'}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper component for displaying information rows
function InfoRow({ icon, label, value, copyable, badge, mono }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Badge color logic
    const getBadgeColor = (val) => {
        if (val === 'IN_PROGRESS' || val === 'ACTIVE') {
            return 'bg-green-100 text-green-700';
        } else if (val === 'COMPLETED') {
            return 'bg-blue-100 text-blue-700';
        } else if (val === 'SUSPENDED' || val === 'CLOSED') {
            return 'bg-red-100 text-red-700';
        } else if (['Medical Aid', 'Education', 'Emergency Relief', 'Community', 'Environment', 'Animal Welfare'].includes(val)) {
            return 'bg-purple-100 text-purple-700';
        } else {
            return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-start gap-3 flex-1">
                <div className="text-gray-400 mt-0.5">{icon}</div>
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{label}</p>
                    {badge ? (
                        <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${getBadgeColor(value)}`}>
                            {value}
                        </span>
                    ) : (
                        <p className={`mt-1 text-gray-900 ${mono ? 'font-mono text-sm break-all' : ''}`}>
                            {value || 'N/A'}
                        </p>
                    )}
                </div>
            </div>
            {copyable && (
                <button
                    onClick={handleCopy}
                    className="ml-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-all"
                    title="Copy to clipboard"
                >
                    {copied ? (
                        <CheckCircle size={18} className="text-green-600" />
                    ) : (
                        <Copy size={18} />
                    )}
                </button>
            )}
        </div>
    );
}
