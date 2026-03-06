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
    AlertCircle,
    Target,
    Hash,
    Heart,
    Activity,
    Layers,
    Eye
} from 'lucide-react';
import { blockchainAPI } from '../utils/api';

const SEARCH_TYPES = [
    { id: 'campaign', label: 'Campaign', icon: Layers, placeholder: 'Enter campaign ID or blockchain transaction ID' },
    { id: 'donation', label: 'Donation', icon: Heart, placeholder: 'Enter donation transaction ID' },
];

const STATUS_STYLE = {
    IN_PROGRESS: { label: 'In Progress', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    COMPLETED:   { label: 'Completed',   cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    SUSPENDED:   { label: 'Suspended',   cls: 'bg-red-100 text-red-700 border-red-200' },
    PENDING_REVIEW: { label: 'Pending Review', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
};

export default function BlockchainSearch() {
    const navigate = useNavigate();
    const [searchValue, setSearchValue] = useState('');
    const [searchType, setSearchType] = useState('campaign');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [donationResult, setDonationResult] = useState(null);

    const activeType = SEARCH_TYPES.find(t => t.id === searchType);

    const handleSearch = async (e) => {
        e.preventDefault();
        setError('');
        setResult(null);
        setDonationResult(null);
        setIsLoading(true);

        try {
            const value = searchValue.trim();
            if (!value) { setError('Please enter a search value'); return; }

            if (searchType === 'donation') {
                const response = await blockchainAPI.searchDonation(value);
                setDonationResult(response);
            } else {
                const isNumeric = /^\d+$/.test(value);
                if (isNumeric) {
                    const response = await blockchainAPI.verifyCampaign(value);
                    setResult(response);
                } else {
                    const response = await blockchainAPI.searchByTxId(value);
                    setResult(response);
                }
            }
        } catch (err) {
            setError(err.message || 'Failed to query blockchain');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button onClick={() => navigate('/')}
                        className="flex items-center text-gray-500 hover:text-gray-700 mb-4 transition-colors">
                        <ArrowLeft size={20} className="mr-2" />Back to Home
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2.5 rounded-xl">
                            <Shield className="text-blue-600" size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Blockchain Explorer</h1>
                            <p className="text-gray-500 mt-1">Query on-chain ledger state for campaigns and donations</p>
                        </div>
                    </div>
                </div>

                {/* Search Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                    <div className="p-6 sm:p-8">
                        {/* Type toggle */}
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
                            {SEARCH_TYPES.map(t => {
                                const Icon = t.icon;
                                return (
                                    <button key={t.id} onClick={() => { setSearchType(t.id); setResult(null); setDonationResult(null); setError(''); }}
                                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                            searchType === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                        }`}>
                                        <Icon size={15}/>{t.label}
                                    </button>
                                );
                            })}
                        </div>

                        <form onSubmit={handleSearch} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {searchType === 'campaign' ? 'Campaign ID or Transaction ID' : 'Donation Transaction ID'}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input type="text" value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)} required
                                        className="block w-full pl-11 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all font-mono text-sm"
                                        placeholder={activeType.placeholder} />
                                </div>
                                {searchType === 'campaign' && (
                                    <p className="text-xs text-gray-400 mt-1.5">Numeric value queries by database ID; hex string queries by blockchain transaction ID</p>
                                )}
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                                    <AlertCircle size={18} className="shrink-0" /><span>{error}</span>
                                </div>
                            )}

                            <button type="submit" disabled={isLoading}
                                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-200">
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Querying Ledger...
                                    </>
                                ) : (
                                    <><Search size={18} />Query Blockchain</>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Campaign Result */}
                {result && <CampaignResult result={result} navigate={navigate} />}

                {/* Donation Result */}
                {donationResult && <DonationResult result={donationResult} />}
            </div>
        </div>
    );
}

function CampaignResult({ result, navigate }) {
    const verified = result.verified;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 sm:p-8">
                {/* Verification Banner */}
                <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${
                    verified ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
                }`}>
                    {verified
                        ? <><CheckCircle className="text-emerald-600 shrink-0" size={22} /><div><p className="font-semibold text-emerald-900">Data Integrity Verified</p><p className="text-sm text-emerald-700">{result.verificationMessage}</p></div></>
                        : <><XCircle className="text-red-600 shrink-0" size={22} /><div><p className="font-semibold text-red-900">Verification Issue</p><p className="text-sm text-red-700">{result.verificationMessage}</p></div></>
                    }
                </div>

                {/* On-chain Ledger State */}
                {(result.campaignId || result.status) && (
                    <div className="mb-6">
                        <SectionTitle icon={<Layers size={18} />} color="text-blue-600" title="On-chain Ledger State" />
                        <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
                            <LedgerRow label="Campaign ID" value={result.campaignId} mono copyable />
                            {result.status && <LedgerRow label="Status" value={result.status} badge />}
                            {result.initiator && <LedgerRow label="Initiator" value={result.initiator} />}
                            {result.goalAmount != null && <LedgerRow label="Goal Amount" value={`€${Number(result.goalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />}
                            {result.auditor && <LedgerRow label="Auditor" value={result.auditor} />}
                            {result.version != null && <LedgerRow label="Version" value={String(result.version)} />}
                            {result.createdAt && <LedgerRow label="Created At" value={formatDate(result.createdAt)} />}
                            {result.lastUpdated && <LedgerRow label="Last Updated" value={formatDate(result.lastUpdated)} />}
                            {result.deadline && <LedgerRow label="Deadline" value={formatDate(result.deadline)} />}
                        </div>
                    </div>
                )}

                {/* Data Hash Integrity */}
                {result.dataHash && (
                    <div className="mb-6">
                        <SectionTitle icon={<Hash size={18} />} color="text-purple-600" title="Data Hash Integrity" />
                        <HashCompare
                            chainHash={result.dataHash}
                            computedHash={result.computedDataHash}
                        />
                    </div>
                )}

                {/* Database Cross-reference */}
                {result.databaseId && (
                    <div className="mb-6">
                        <SectionTitle icon={<Database size={18} />} color="text-gray-600" title="Database Cross-reference" />
                        <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
                            <LedgerRow label="Database ID" value={String(result.databaseId)} />
                            {result.databaseStatus && <LedgerRow label="Database Status" value={result.databaseStatus} badge />}
                            {result.databaseCreatedAt && <LedgerRow label="Database Created" value={formatDate(result.databaseCreatedAt)} />}
                        </div>
                    </div>
                )}

                {/* Blockchain Identity */}
                {result.blockchainTxId && (
                    <div className="mb-6">
                        <SectionTitle icon={<LinkIcon size={18} />} color="text-indigo-600" title="Blockchain Identity" />
                        <div className="bg-gray-50 rounded-xl border border-gray-100">
                            <LedgerRow label="Transaction ID" value={result.blockchainTxId} mono copyable />
                        </div>
                    </div>
                )}

                {/* View Campaign Link */}
                {result.databaseId && (
                    <button onClick={() => navigate(`/campaigns/${result.databaseId}`)}
                        className="w-full flex justify-center items-center gap-2 py-3 border-2 border-blue-200 rounded-xl text-blue-600 font-semibold hover:bg-blue-50 transition-colors mt-2">
                        <ExternalLink size={18} />View Campaign Details
                    </button>
                )}
            </div>
        </div>
    );
}

function DonationResult({ result }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 sm:p-8">
                {/* Status Banner */}
                <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${
                    result.found ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
                }`}>
                    {result.found
                        ? <><CheckCircle className="text-emerald-600 shrink-0" size={22} /><div><p className="font-semibold text-emerald-900">Donation Found on Ledger</p><p className="text-sm text-emerald-700">{result.message}</p></div></>
                        : <><XCircle className="text-red-600 shrink-0" size={22} /><div><p className="font-semibold text-red-900">Donation Not Found</p><p className="text-sm text-red-700">{result.message}</p></div></>
                    }
                </div>

                {result.found && (
                    <div>
                        <SectionTitle icon={<Layers size={18} />} color="text-blue-600" title="On-chain Ledger State" />
                        <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
                            <LedgerRow label="Donation ID" value={result.donationId} mono copyable />
                            <LedgerRow label="Campaign ID" value={result.campaignId} mono copyable />
                            {result.amount != null && <LedgerRow label="Amount" value={`€${Number(result.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />}
                            {result.donorHash && <LedgerRow label="Donor Hash" value={result.donorHash} mono />}
                            {result.donatedAt && <LedgerRow label="Donated At" value={formatDate(result.donatedAt)} />}
                            {result.paymentRefHash && <LedgerRow label="Payment Ref Hash" value={result.paymentRefHash} mono />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SectionTitle({ icon, color, title }) {
    return (
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className={color}>{icon}</span>{title}
        </h3>
    );
}

function LedgerRow({ label, value, mono, copyable, badge }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const st = badge && STATUS_STYLE[value];

    return (
        <div className="flex items-start justify-between px-4 py-3 gap-4">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide shrink-0 w-32 pt-0.5">{label}</span>
            <div className="flex items-start gap-2 flex-1 min-w-0 justify-end">
                {badge ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        st ? st.cls : 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>{st ? st.label : value}</span>
                ) : (
                    <span className={`text-sm text-gray-900 text-right ${mono ? 'font-mono break-all' : ''}`}>{value || '—'}</span>
                )}
                {copyable && value && (
                    <button onClick={handleCopy} className="p-1 text-gray-300 hover:text-gray-600 rounded transition-colors shrink-0" title="Copy">
                        {copied ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                )}
            </div>
        </div>
    );
}

function HashCompare({ chainHash, computedHash }) {
    const a = (chainHash || '').toLowerCase();
    const b = (computedHash || '').toLowerCase();
    const match = a && b && a === b;

    return (
        <div className={`rounded-xl border overflow-hidden ${match ? 'border-emerald-200' : 'border-red-200'}`}>
            <div className={`px-4 py-3 flex items-center gap-2 ${match ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {match
                    ? <><CheckCircle size={16} className="text-emerald-600" /><span className="text-xs font-semibold text-emerald-800">Hash Match — data integrity confirmed</span></>
                    : <><AlertCircle size={16} className="text-red-600" /><span className="text-xs font-semibold text-red-800">Hash Mismatch — data may have been modified</span></>
                }
            </div>
            <div className="divide-y divide-gray-100 bg-white">
                <div className="px-4 py-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">On-chain Hash</p>
                    <code className="text-xs font-mono text-gray-800 break-all">{chainHash || '—'}</code>
                </div>
                {computedHash && (
                    <div className="px-4 py-3">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Computed Hash (current database)</p>
                        <code className={`text-xs font-mono break-all ${match ? 'text-gray-800' : 'text-red-700'}`}>{computedHash}</code>
                    </div>
                )}
            </div>
        </div>
    );
}

function formatDate(raw) {
    if (!raw) return '—';
    try { return new Date(raw).toLocaleString(); } catch { return raw; }
}
