import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { partnerAPI } from '@/utils/api';

const STATUS_META = {
    PENDING:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700' },
    ACTIVE:    { label: 'Active',    cls: 'bg-emerald-100 text-emerald-700' },
    SUSPENDED: { label: 'Suspended', cls: 'bg-red-100 text-red-700' },
    COMPLETED: { label: 'Completed', cls: 'bg-blue-100 text-blue-700' },
    CLOSED:    { label: 'Closed',    cls: 'bg-gray-100 text-gray-500' },
};

const FILTER_TABS = [
    { id: '', label: 'All' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'ACTIVE', label: 'Active' },
    { id: 'COMPLETED', label: 'Completed' },
];

function EndorseModal({ campaign, onClose, onDone }) {
    const [note, setNote] = useState(campaign.partnerNote || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        setLoading(true);
        setError('');
        try {
            await partnerAPI.endorse(campaign.id, note);
            onDone();
            onClose();
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Endorse Campaign</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <div className="bg-gray-50 rounded-xl p-3 text-sm">
                        <p className="font-medium text-gray-800">{campaign.title}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{campaign.organizer} · {campaign.category}</p>
                    </div>
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                            <AlertCircle size={14} />{error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Endorsement Note <span className="text-gray-400 font-normal">(optional)</span></label>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            rows={3}
                            placeholder="Add a note about why you are endorsing this campaign..."
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={submit} disabled={loading}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            Endorse
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PartnerPanel() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterTab, setFilterTab] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [endorseTarget, setEndorseTarget] = useState(null);
    const [revoking, setRevoking] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const data = await partnerAPI.getCampaigns(filterTab || undefined);
            setCampaigns(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [filterTab]);

    const handleRevoke = async (id) => {
        setRevoking(id);
        try {
            await partnerAPI.revokeEndorsement(id);
            load();
        } catch (e) {
            alert(e.message);
        } finally {
            setRevoking(null);
        }
    };

    const endorsed = campaigns.filter(c => c.partnerEndorsed).length;

    return (
        <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2.5 rounded-xl">
                        <Shield className="text-blue-600" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Partner Panel</h1>
                        <p className="text-sm text-gray-500">Review and endorse campaigns as a third-party auditor</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Total Campaigns', value: campaigns.length, color: 'text-gray-900' },
                        { label: 'Endorsed by You', value: endorsed, color: 'text-blue-600' },
                        { label: 'Pending Review', value: campaigns.filter(c => c.status === 'PENDING').length, color: 'text-amber-600' },
                    ].map(s => (
                        <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4 text-center">
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                    {FILTER_TABS.map(tab => (
                        <button key={tab.id} onClick={() => setFilterTab(tab.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Campaign list */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        <AlertCircle size={14} />{error}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 size={24} className="text-gray-300 animate-spin" /></div>
                ) : campaigns.length === 0 ? (
                    <div className="bg-white border border-gray-100 rounded-xl py-16 text-center text-gray-400 text-sm">No campaigns found</div>
                ) : (
                    <div className="space-y-2">
                        {campaigns.map(c => {
                            const meta = STATUS_META[c.status] || { label: c.status, cls: 'bg-gray-100 text-gray-500' };
                            const progress = c.goalAmount > 0 ? Math.min(100, (c.currentAmount / c.goalAmount * 100)) : 0;
                            const expanded = expandedId === c.id;
                            return (
                                <div key={c.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                                    <button
                                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                                        onClick={() => setExpandedId(expanded ? null : c.id)}
                                    >
                                        {/* Endorsement indicator */}
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${c.partnerEndorsed ? 'bg-blue-500' : 'bg-gray-200'}`} />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold text-gray-800 truncate">{c.title}</p>
                                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${meta.cls}`}>{meta.label}</span>
                                                {c.partnerEndorsed && (
                                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0 flex items-center gap-0.5">
                                                        <Shield size={9} />Endorsed
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">{c.organizer} · {c.category}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${progress}%` }} />
                                                </div>
                                                <span className="text-xs text-gray-500 shrink-0">€{Number(c.currentAmount).toFixed(0)} / €{Number(c.goalAmount).toFixed(0)}</span>
                                            </div>
                                        </div>

                                        {expanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                                    </button>

                                    {expanded && (
                                        <div className="px-5 pb-4 border-t border-gray-50 bg-gray-50/40 space-y-3">
                                            {/* Endorsement status */}
                                            {c.partnerEndorsed ? (
                                                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Shield size={14} className="text-blue-600" />
                                                        <span className="text-xs font-semibold text-blue-700">Endorsed by {c.endorsedBy}</span>
                                                        <span className="text-xs text-blue-400">{c.endorsedAt ? new Date(c.endorsedAt).toLocaleDateString() : ''}</span>
                                                    </div>
                                                    {c.partnerNote && <p className="text-xs text-blue-600 italic mt-1">"{c.partnerNote}"</p>}
                                                </div>
                                            ) : (
                                                <div className="mt-3 p-3 bg-gray-100 rounded-xl">
                                                    <p className="text-xs text-gray-500 flex items-center gap-1"><XCircle size={13} />Not yet endorsed</p>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                {!c.partnerEndorsed ? (
                                                    <button onClick={() => setEndorseTarget(c)}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500 transition-colors">
                                                        <Shield size={13} />Endorse Campaign
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleRevoke(c.id)} disabled={revoking === c.id}
                                                        className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50">
                                                        {revoking === c.id ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                                                        Revoke Endorsement
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {endorseTarget && (
                <EndorseModal
                    campaign={endorseTarget}
                    onClose={() => setEndorseTarget(null)}
                    onDone={load}
                />
            )}
        </div>
    );
}
