import React, { useState, useEffect, useCallback } from 'react';
import {
    Shield, CheckCircle, XCircle, Loader2, AlertCircle,
    Clock, AlertTriangle, RefreshCw,
    FileText, Hash, MessageSquare, Link2, Building2, Key,
    Lock, BarChart3, Edit3, Save, X, Inbox,
    UserCheck, Ban, ChevronRight, FolderOpen,
    ExternalLink, Image, CreditCard, BookOpen, Info,
    CheckSquare, MinusSquare,
    ArrowLeft, Activity, ClipboardList, Unlock
} from 'lucide-react';
import { partnerAPI, userAPI, campaignAPI } from '@/utils/api';
import { CAMPAIGN_STATUS, getStatusClasses } from '@/utils/constants';

// ── Password change inline component ──────────────────────────────────────────
function PasswordChangeField() {
    const [open, setOpen] = useState(false);
    const [nxt, setNxt] = useState('');
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setMsg(''); setErr('');
        if (!nxt) { setErr('Please enter a new password'); return; }
        if (nxt.length < 6) { setErr('New password must be at least 6 characters'); return; }
        setSaving(true);
        try {
            await userAPI.changePassword(nxt);
            setMsg('Password updated');
            setNxt('');
            setTimeout(() => { setOpen(false); setMsg(''); }, 1500);
        } catch (e) { setErr(e.message || 'Failed to change password'); }
        finally { setSaving(false); }
    };

    return (
        <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Password</p>
            {!open ? (
                <button onClick={() => setOpen(true)}
                    className="text-sm text-blue-600 hover:text-blue-500 font-medium flex items-center gap-1">
                    <Lock size={13}/> Change Password
                </button>
            ) : (
                <div className="space-y-2">
                    <input type="password" placeholder="New password" value={nxt} onChange={e => setNxt(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                    {err && <p className="text-xs text-red-600">{err}</p>}
                    {msg && <p className="text-xs text-emerald-600">{msg}</p>}
                    <div className="flex gap-2">
                        <button onClick={submit} disabled={saving}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => { setOpen(false); setNxt(''); setErr(''); setMsg(''); }}
                            className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Shared metadata ───────────────────────────────────────────────────────────

const AUDIT_META = {
    PENDING_AUDIT:  { label: 'Pending Audit',  cls: 'bg-gray-100 text-gray-600',       icon: <Clock size={11} /> },
    UNDER_REVIEW:   { label: 'Under Review',    cls: 'bg-blue-100 text-blue-700',       icon: <RefreshCw size={11} /> },
    APPROVED:       { label: 'Approved',        cls: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle size={11} /> },
    REJECTED:       { label: 'Rejected',        cls: 'bg-red-100 text-red-700',         icon: <XCircle size={11} /> },
    REQUIRES_INFO:  { label: 'Requires Info',   cls: 'bg-amber-100 text-amber-700',     icon: <AlertCircle size={11} /> },
    RISK_FLAGGED:   { label: 'Risk Flagged',    cls: 'bg-rose-100 text-rose-700',       icon: <AlertTriangle size={11} /> },
};

const CONCLUSION_OPTIONS = [
    { value: 'APPROVED',      label: 'Approve',           cls: 'bg-emerald-600 hover:bg-emerald-500 text-white', desc: 'Materials verified. Campaign is legitimate.' },
    { value: 'REQUIRES_INFO', label: 'Request More Info', cls: 'bg-amber-500 hover:bg-amber-400 text-white',    desc: 'Supplementary documents needed.' },
    { value: 'REJECTED',      label: 'Reject',            cls: 'bg-red-600 hover:bg-red-500 text-white',        desc: 'Campaign does not meet requirements.' },
    { value: 'RISK_FLAGGED',  label: 'Flag Risk',         cls: 'bg-rose-700 hover:bg-rose-600 text-white',      desc: 'Suspected fraud — campaign will be suspended.' },
];

const CAMPAIGN_STATUS_META = Object.fromEntries(
    Object.entries(CAMPAIGN_STATUS).map(([k, v]) => [k, `${v.bg} ${v.text}`])
);


// ── Audit submission modal ────────────────────────────────────────────────────

function AuditModal({ campaign, onClose, onDone }) {
    const [conclusion, setConclusion]         = useState('');
    const [evidenceSummary, setEvidenceSummary] = useState('');
    const [notes, setNotes]                   = useState('');
    const [loading, setLoading]               = useState(false);
    const [error, setError]                   = useState('');
    const selected = CONCLUSION_OPTIONS.find(o => o.value === conclusion);

    const submit = async () => {
        if (!conclusion) { setError('Please select a conclusion.'); return; }
        setLoading(true); setError('');
        try {
            await partnerAPI.submitAudit(campaign.id, { conclusion, evidenceSummary, notes });
            onDone(); onClose();
        } catch (e) { setError(e.message); } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <div>
                        <h3 className="font-semibold text-gray-900">Submit Audit</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Conclusion will be recorded on the blockchain</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
                </div>
                <div className="px-6 py-5 space-y-5">
                    <div className="bg-gray-50 rounded-xl p-3 text-sm">
                        <p className="font-semibold text-gray-800">{campaign.title}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{campaign.organizer} · {campaign.category}</p>
                        {campaign.description && <p className="text-gray-500 text-xs mt-2 line-clamp-3">{campaign.description}</p>}
                    </div>
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                            <AlertCircle size={14}/>{error}
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Conclusion <span className="text-red-500">*</span></p>
                        <div className="grid grid-cols-2 gap-2">
                            {CONCLUSION_OPTIONS.map(opt => (
                                <button key={opt.value} onClick={() => setConclusion(opt.value)}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all text-left ${conclusion === opt.value ? `${opt.cls} border-current` : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                    <p>{opt.label}</p>
                                    <p className={`text-[10px] mt-0.5 font-normal ${conclusion === opt.value ? 'opacity-80' : 'text-gray-400'}`}>{opt.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1"><FileText size={14}/>Evidence Summary</label>
                        <textarea value={evidenceSummary} onChange={e => setEvidenceSummary(e.target.value)} rows={3}
                            placeholder="Summarize materials reviewed and key findings..."
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1"><MessageSquare size={14}/>Additional Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                            placeholder="Any remarks for the campaign organiser..."
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"/>
                    </div>
                    {conclusion === 'RISK_FLAGGED' && (
                        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5"/>
                            This will immediately suspend the campaign on-chain and notify the administrator.
                        </div>
                    )}
                    <div className="flex gap-2 pt-1">
                        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={submit} disabled={loading || !conclusion}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${selected ? selected.cls : 'bg-blue-600 text-white'}`}>
                            {loading ? <Loader2 size={14} className="animate-spin"/> : <Shield size={14}/>}
                            Submit Audit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Audit history modal ───────────────────────────────────────────────────────

function HistoryModal({ campaign, onClose }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        partnerAPI.getAuditHistory(campaign.id).then(setHistory).catch(() => setHistory([])).finally(() => setLoading(false));
    }, []);
    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="font-semibold text-gray-900">Audit History</h3>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-72">{campaign.title}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
                </div>
                <div className="overflow-y-auto flex-1 px-6 py-4">
                    {loading ? <div className="flex justify-center py-8"><Loader2 size={20} className="text-gray-300 animate-spin"/></div>
                    : history.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No audit records yet</p>
                    : (
                        <div className="space-y-3">
                            {history.map(h => {
                                const meta = AUDIT_META[h.conclusion] || AUDIT_META.PENDING_AUDIT;
                                return (
                                    <div key={h.id} className="border border-gray-100 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.icon}{meta.label}</span>
                                            <span className="text-[11px] text-gray-400">{h.createdAt ? new Date(h.createdAt).toLocaleString() : ''}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-1">By <strong>{h.auditor}</strong></p>
                                        {h.evidenceSummary && <p className="text-xs text-gray-700 mt-1">{h.evidenceSummary}</p>}
                                        {h.notes && <p className="text-xs text-gray-500 italic mt-1">"{h.notes}"</p>}
                                        {h.evidenceHash && (
                                            <div className="flex items-center gap-1 mt-2">
                                                <Hash size={10} className="text-gray-400"/>
                                                <code className="text-[10px] font-mono text-gray-500 break-all">{h.evidenceHash}</code>
                                            </div>
                                        )}
                                        {h.onChain && h.blockchainAuditId && (
                                            <div className="flex items-center gap-1 mt-1.5">
                                                <Link2 size={10} className="text-emerald-500"/>
                                                <code className="text-[10px] font-mono text-emerald-600">{h.blockchainAuditId}</code>
                                                {h.chainVerified === true && (
                                                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-1 font-semibold">✓ Verified</span>
                                                )}
                                                {h.chainVerified === false && h.chainConclusion && h.chainConclusion !== 'NOT_FOUND_ON_CHAIN' && (
                                                    <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded ml-1 font-semibold">✗ Mismatch</span>
                                                )}
                                                {h.chainVerified === false && h.chainConclusion === 'NOT_FOUND_ON_CHAIN' && (
                                                    <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded ml-1 font-semibold">Not Found</span>
                                                )}
                                                {h.chainVerified == null && (
                                                    <span className="text-[10px] text-emerald-500 ml-1">On-chain</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Material Review Panel ─────────────────────────────────────────────────────

const DOC_TYPE_META = {
    IDENTITY:     { label: 'Identity Document', icon: CreditCard,  color: 'text-indigo-600 bg-indigo-50' },
    REGISTRATION: { label: 'Registration Cert', icon: BookOpen,    color: 'text-purple-600 bg-purple-50' },
    BANK:         { label: 'Bank Evidence',      icon: CreditCard,  color: 'text-emerald-600 bg-emerald-50' },
    PLAN:         { label: 'Fund-Usage Plan',    icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
    PHOTO:        { label: 'Photo / Image',      icon: Image,       color: 'text-orange-600 bg-orange-50' },
    LINK:         { label: 'External Link',      icon: ExternalLink, color: 'text-cyan-600 bg-cyan-50' },
    OTHER:        { label: 'Document',           icon: FileText,    color: 'text-gray-600 bg-gray-100' },
};

// Default checklist items for material verification
const CHECKLIST_TEMPLATE = [
    { key: 'HAS_DESCRIPTION',     label: 'Campaign description is detailed and clear', category: 'Completeness' },
    { key: 'HAS_ORGANIZER_ID',    label: 'Organiser identity document submitted',      category: 'Completeness' },
    { key: 'HAS_REGISTRATION',    label: 'Organisation registration cert present',      category: 'Completeness' },
    { key: 'HAS_BANK_DOCS',       label: 'Bank account evidence provided',             category: 'Completeness' },
    { key: 'HAS_FUND_PLAN',       label: 'Fund usage plan is clearly defined',          category: 'Completeness' },
    { key: 'HAS_TIMELINE',        label: 'Project timeline is realistic',               category: 'Completeness' },
    { key: 'INFO_CONSISTENT',     label: 'All information is internally consistent',    category: 'Authenticity' },
    { key: 'NO_CONTRADICTIONS',   label: 'No contradictions between documents',         category: 'Authenticity' },
    { key: 'AMOUNTS_REASONABLE',  label: 'Goal amount is proportional to stated use',  category: 'Authenticity' },
    { key: 'NO_RED_FLAGS',        label: 'No suspicious patterns or red flags detected',category: 'Risk' },
];

const STATUS_OPT = [
    { value: 'PASS',    label: 'Pass',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    { value: 'PARTIAL', label: 'Partial', cls: 'bg-amber-100 text-amber-700 border-amber-300' },
    { value: 'FAIL',    label: 'Fail',    cls: 'bg-red-100 text-red-700 border-red-300' },
];

function ChecklistRow({ item, value, note, onChange, onNoteChange }) {
    const opts = [
        { v: 'PASS', icon: CheckSquare,  cls: 'text-emerald-600' },
        { v: 'FAIL', icon: XCircle,      cls: 'text-red-600' },
        { v: 'NA',   icon: MinusSquare,  cls: 'text-gray-400' },
    ];
    return (
        <div className="py-2.5 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
                <div className="flex gap-1 shrink-0">
                    {opts.map(o => {
                        const Icon = o.icon;
                        return (
                            <button key={o.v} onClick={() => onChange(item.key, o.v)}
                                className={`p-1 rounded transition-colors ${value === o.v ? o.cls : 'text-gray-200 hover:text-gray-400'}`}
                                title={o.v}>
                                <Icon size={16}/>
                            </button>
                        );
                    })}
                </div>
                <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                {value === 'FAIL' && (
                    <input value={note || ''} onChange={e => onNoteChange(item.key, e.target.value)}
                        placeholder="Note (required for FAIL)"
                        className="text-xs border border-red-200 rounded-lg px-2 py-1 w-48 focus:outline-none focus:ring-1 focus:ring-red-300"/>
                )}
            </div>
        </div>
    );
}

function MaterialReviewPanel({ campaignId, campaignTitle, onClose, onAuditDone }) {
    const [detail, setDetail]           = useState(null);
    const [chainRec, setChainRec]       = useState(null);
    const [loading, setLoading]         = useState(true);
    const [activeSection, setSection]   = useState('overview');
    const [verifications, setVers]      = useState([]);
    // Verification form state
    const [checklistState, setChecklist]= useState({});
    const [checkNotes, setCheckNotes]   = useState({});
    const [overallNote, setOverallNote] = useState('');
    const [overallStatus, setOvStatus]  = useState('PARTIAL');
    const [saving, setSaving]           = useState(false);
    const [saveMsg, setSaveMsg]         = useState('');
    const [chainLoading, setChainLoading] = useState(false);
    const [showAudit, setShowAudit]     = useState(false);
    const [settingCover, setSettingCover] = useState(null);

    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        Promise.all([
            partnerAPI.getCampaignDetail(campaignId),
            partnerAPI.getVerifications(campaignId),
        ]).then(([d, v]) => { setDetail(d); setVers(v); })
          .catch(e => setLoadError(e.message || 'Failed to load campaign details'))
          .finally(() => setLoading(false));
    }, [campaignId]);

    const loadChainRecords = async () => {
        if (chainRec) return;
        setChainLoading(true);
        try { setChainRec(await partnerAPI.getChainRecords(campaignId)); }
        catch { setChainRec({}); } finally { setChainLoading(false); }
    };

    // Load chain records when that section is opened
    useEffect(() => {
        if (activeSection === 'chain') loadChainRecords();
    }, [activeSection]);

    const setCheckItem = (key, val) => setChecklist(s => ({ ...s, [key]: val }));
    const setCheckNote = (key, val) => setCheckNotes(s => ({ ...s, [key]: val }));

    const submitVerification = async () => {
        setSaving(true); setSaveMsg('');
        try {
            const checklistArr = CHECKLIST_TEMPLATE.map(item => ({
                key:    item.key,
                label:  item.label,
                status: checklistState[item.key] || 'NA',
                note:   checkNotes[item.key] || '',
            }));
            const result = await partnerAPI.submitVerification(campaignId, {
                checklist:     JSON.stringify(checklistArr),
                overallNote,
                overallStatus,
            });
            setVers(v => [result, ...v]);
            setSaveMsg('Verification saved successfully.');
        } catch (e) { setSaveMsg(e.message); } finally { setSaving(false); }
    };

    // Scope from backend
    const scopeLevel   = detail?.scopeLevel || 'OPEN_VIEW';    // OPEN_VIEW | FULL_ACCESS
    const isFullAccess = scopeLevel === 'FULL_ACCESS';

    const flags    = detail?.completenessFlags || {};
    const flagScore= flags.score || 0;
    const flagTotal= flags.total || 7;
    const flagPct  = isFullAccess ? Math.round(flagScore / flagTotal * 100) : null;

    const info = detail?.basicInfo || {};
    const docs = detail?.documents || [];
    const updates = detail?.updates || [];
    const progress = info.goalAmount > 0
        ? Math.min(100, (info.currentAmount / info.goalAmount) * 100) : 0;

    const SCOPE_BADGE = {
        FULL_ACCESS: { label: 'Full Access',  cls: 'bg-emerald-100 text-emerald-700', icon: Unlock },
        OPEN_VIEW:   { label: 'Read-only (basic)', cls: 'bg-amber-100 text-amber-700', icon: Lock },
    };
    const badge = SCOPE_BADGE[scopeLevel] || SCOPE_BADGE.OPEN_VIEW;

    const SECTIONS = [
        { id: 'overview',      label: 'Overview',    icon: Info },
        { id: 'documents',     label: `Documents (${docs.length})`, icon: FolderOpen, restricted: !isFullAccess },
        { id: 'updates',       label: `Updates (${updates.length})`, icon: Activity, restricted: !isFullAccess },
        { id: 'chain',         label: 'Chain Records', icon: Link2 },
        { id: 'verification',  label: 'Verification', icon: ClipboardList, restricted: !isFullAccess },
        { id: 'history',       label: `History (${verifications.length})`, icon: BarChart3 },
    ];

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-stretch justify-end" onClick={onClose}>
            <div className="bg-white w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 via-white to-white shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-all" title="Close">
                            <ArrowLeft size={18}/>
                        </button>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                <FileText size={12}/>
                                <span>Material Review</span>
                                <ChevronRight size={12}/>
                                <span>Campaign #{campaignId}</span>
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 truncate leading-snug">{campaignTitle}</h2>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {!loading && (() => {
                                const BadgeIcon = badge.icon;
                                return (
                                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${badge.cls}`}>
                                        <BadgeIcon size={12}/>{badge.label}
                                    </span>
                                );
                            })()}
                            {isFullAccess && (
                                <>
                                    <button onClick={() => setShowAudit(true)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 shadow-sm shadow-indigo-200 transition-all">
                                        <Shield size={13}/>Submit Audit
                                    </button>
                                    {detail?.basicInfo?.status === 'ACTIVE' && (
                                        <>
                                            <button onClick={async () => {
                                                const reason = prompt('Reason for freezing this campaign:');
                                                if (reason === null) return;
                                                try { await partnerAPI.freezeCampaign(campaignId, reason); if (onAuditDone) onAuditDone(); onClose(); } catch(e) { alert(e.message); }
                                            }} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500 text-white rounded-xl text-xs font-semibold hover:bg-indigo-400 transition-all">
                                                <Lock size={13}/>Freeze
                                            </button>
                                            <button onClick={async () => {
                                                const reason = prompt('Reason for closing this campaign:');
                                                if (reason === null) return;
                                                try { await partnerAPI.closeCampaignByPartner(campaignId, reason); if (onAuditDone) onAuditDone(); onClose(); } catch(e) { alert(e.message); }
                                            }} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-500 transition-all">
                                                <Ban size={13}/>Close
                                            </button>
                                        </>
                                    )}
                                    {detail?.basicInfo?.status === 'FROZEN' && detail?.basicInfo?.unfreezeRequested && (
                                        <button onClick={async () => {
                                            const approved = confirm('Approve unfreeze request?');
                                            try { await partnerAPI.reviewUnfreeze(campaignId, approved); if (onAuditDone) onAuditDone(); onClose(); } catch(e) { alert(e.message); }
                                        }} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-500 transition-all">
                                            <Unlock size={13}/>Review Unfreeze
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 size={28} className="text-gray-300 animate-spin"/>
                    </div>
                ) : loadError ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-3 max-w-sm">
                            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
                                <XCircle size={24} className="text-red-400"/>
                            </div>
                            <p className="text-sm font-semibold text-gray-700">Unable to Load Details</p>
                            <p className="text-xs text-gray-400 leading-relaxed">{loadError}</p>
                            <button onClick={onClose} className="mt-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors">Close</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-1 overflow-hidden">
                        {/* Sidebar nav */}
                        <nav className="w-52 shrink-0 border-r border-gray-100 py-5 bg-gray-50/80 flex flex-col">
                            <div className="space-y-0.5 px-3 flex-1">
                                {SECTIONS.map(s => {
                                    const Icon = s.icon;
                                    const locked = s.restricted;
                                    const active = activeSection === s.id;
                                    return (
                                        <button key={s.id}
                                            onClick={() => !locked && setSection(s.id)}
                                            title={locked ? 'Accept the task to access this section' : undefined}
                                            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                                                locked
                                                    ? 'text-gray-300 cursor-not-allowed'
                                                    : active
                                                        ? 'text-indigo-700 bg-indigo-50 shadow-sm'
                                                        : 'text-gray-500 hover:text-gray-800 hover:bg-white'
                                            }`}>
                                            <Icon size={15} className={active ? 'text-indigo-500' : ''}/>
                                            <span className="flex-1">{s.label}</span>
                                            {locked && <Lock size={11} className="text-gray-300"/>}
                                        </button>
                                    );
                                })}
                            </div>
                            {!isFullAccess && (
                                <div className="mx-3 mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-700 leading-relaxed">
                                    <Lock size={11} className="inline mr-1 -mt-0.5"/>
                                    Accept this task to unlock full materials, documents, and verification tools.
                                </div>
                            )}
                        </nav>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                            {/* ── Overview ── */}
                            {activeSection === 'overview' && (
                                <div className="space-y-6">
                                    {/* Key stats row */}
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { label: 'Goal', value: `€${Number(info.goalAmount||0).toLocaleString()}`, color: 'text-gray-800' },
                                            { label: 'Raised', value: `€${Number(info.currentAmount||0).toLocaleString()}`, color: 'text-emerald-600' },
                                            { label: 'Donations', value: detail?.donationCount ?? '0', color: 'text-blue-600' },
                                            { label: 'Completeness', value: flagPct != null ? `${flagPct}%` : '—', color: flagPct >= 80 ? 'text-emerald-600' : flagPct >= 50 ? 'text-amber-600' : 'text-red-600' },
                                        ].map(s => (
                                            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-3.5 text-center">
                                                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                                                <p className="text-[11px] text-gray-400 font-medium mt-0.5">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Funding progress */}
                                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                                        <div className="flex justify-between text-xs mb-2">
                                            <span className="font-semibold text-gray-700">Funding Progress</span>
                                            <span className={`font-bold ${progress >= 80 ? 'text-emerald-600' : progress >= 40 ? 'text-blue-600' : 'text-amber-600'}`}>{progress.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all ${progress >= 80 ? 'bg-emerald-500' : progress >= 40 ? 'bg-blue-400' : 'bg-amber-400'}`} style={{ width: `${progress}%` }}/>
                                        </div>
                                    </div>

                                    {/* Completeness checklist */}
                                    {flagPct != null && (
                                        <div className="bg-white border border-gray-100 rounded-xl p-4">
                                            <p className="text-xs font-semibold text-gray-700 mb-3">Material Completeness</p>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                {Object.entries(flags).filter(([k]) => k !== 'score' && k !== 'total').map(([k, v]) => (
                                                    <div key={k} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${v ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50/60 text-red-500'}`}>
                                                        {v ? <CheckCircle size={13}/> : <XCircle size={13}/>}
                                                        <span className="capitalize">{k.replace(/^HAS_|^IS_/,'').replace(/_/g,' ').toLowerCase()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Campaign details grid */}
                                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-gray-700 mb-3">Campaign Details</p>
                                        <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                                            {[
                                                { label: 'Status',       value: info.status,     badge: true },
                                                { label: 'Audit Status', value: info.auditStatus, badge: true },
                                                { label: 'Category',     value: info.category },
                                                { label: 'Created',      value: info.createdAt ? new Date(info.createdAt).toLocaleDateString() : '—' },
                                                { label: 'On-chain',     value: info.onChain ? 'Yes' : 'No' },
                                            ].map(row => (
                                                <div key={row.label} className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-400">{row.label}</span>
                                                    {row.badge ? (
                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CAMPAIGN_STATUS_META[row.value] || AUDIT_META[row.value]?.cls || 'bg-gray-100 text-gray-600'}`}>{row.value || '—'}</span>
                                                    ) : (
                                                        <span className="text-sm font-medium text-gray-800">{row.value || '—'}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Organiser */}
                                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-gray-700 mb-3">Organiser</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                {(info.organizer?.displayName || '?')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800">{info.organizer?.displayName || '—'}</p>
                                                <p className="text-xs text-gray-400">{info.organizer?.username} · {info.organizer?.role}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-gray-700 mb-2">Description</p>
                                        <p className="text-sm text-gray-600 leading-relaxed">{info.description || <span className="italic text-gray-400">No description provided</span>}</p>
                                    </div>

                                    {/* Fund usage plan */}
                                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-gray-700 mb-2">Fund Usage Plan</p>
                                        {detail?.fundUsagePlan
                                            ? <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{detail.fundUsagePlan}</p>
                                            : (
                                                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2.5">
                                                    <AlertTriangle size={13}/>No fund usage plan submitted
                                                </div>
                                            )}
                                    </div>

                                    {/* Blockchain tx */}
                                    {info.blockchainTxId && (
                                        <div className="bg-white border border-gray-100 rounded-xl p-4">
                                            <p className="text-xs font-semibold text-gray-700 mb-2">Blockchain Transaction</p>
                                            <code className="text-xs font-mono text-emerald-600 break-all bg-emerald-50 px-3 py-2 rounded-lg block">{info.blockchainTxId}</code>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Documents ── */}
                            {activeSection === 'documents' && !isFullAccess && (
                                <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                                        <Lock size={24} className="text-gray-300"/>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">Documents Restricted</p>
                                        <p className="text-xs text-gray-400 max-w-xs mt-1 leading-relaxed">Accept the audit task to view proof documents submitted by the campaign organiser.</p>
                                    </div>
                                </div>
                            )}
                            {activeSection === 'documents' && isFullAccess && (
                                <div className="space-y-3">
                                    {docs.length === 0 ? (
                                        <div className="py-16 text-center">
                                            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                                                <FolderOpen size={24} className="text-amber-400"/>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-700">No Documents Submitted</p>
                                            <p className="text-xs text-gray-400 mt-1">The campaign organiser has not uploaded any proof documents yet.</p>
                                        </div>
                                    ) : docs.map(d => {
                                        const meta = DOC_TYPE_META[d.docType] || DOC_TYPE_META.OTHER;
                                        const Icon = meta.icon;
                                        const isDocImage = d.docType === 'PHOTO' || d.url?.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);
                                        const isCurrent = info.imageUrl && d.url === info.imageUrl;
                                        return (
                                            <div key={d.id} className={`border rounded-xl overflow-hidden ${isCurrent ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-100'}`}>
                                                {isDocImage && d.url && (
                                                    <img src={d.url} alt={d.name} className="w-full h-40 object-cover"/>
                                                )}
                                                <div className="p-4 flex items-start gap-3">
                                                    <div className={`p-2 rounded-lg shrink-0 ${meta.color}`}>
                                                        <Icon size={16}/>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-sm font-semibold text-gray-800">{d.name}</p>
                                                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                                                            {isCurrent && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Current Cover</span>}
                                                        </div>
                                                        {d.description && <p className="text-xs text-gray-500 mt-0.5">{d.description}</p>}
                                                        <p className="text-[11px] text-gray-400 mt-1">{d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : ''}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {isDocImage && !isCurrent && (
                                                            <button
                                                                onClick={async () => {
                                                                    setSettingCover(d.id);
                                                                    try {
                                                                        await campaignAPI.setCoverImage(campaignId, d.url);
                                                                        setDetail(prev => ({ ...prev, basicInfo: { ...prev.basicInfo, imageUrl: d.url } }));
                                                                    } catch (e) { setSaveMsg(e.message); }
                                                                    finally { setSettingCover(null); }
                                                                }}
                                                                disabled={settingCover === d.id}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-all"
                                                                title="Set this image as campaign cover">
                                                                {settingCover === d.id ? <Loader2 size={11} className="animate-spin"/> : <Image size={11}/>}
                                                                Set Cover
                                                            </button>
                                                        )}
                                                        {d.url && (
                                                            <a href={d.url} target="_blank" rel="noopener noreferrer"
                                                                className="text-blue-500 hover:text-blue-700" title="Open">
                                                                <ExternalLink size={14}/>
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* ── Updates ── */}
                            {activeSection === 'updates' && !isFullAccess && (
                                <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                                        <Lock size={24} className="text-gray-300"/>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">Updates Restricted</p>
                                        <p className="text-xs text-gray-400 max-w-xs mt-1 leading-relaxed">Accept the audit task to view the organiser's progress updates.</p>
                                    </div>
                                </div>
                            )}
                            {activeSection === 'updates' && isFullAccess && (
                                <div className="space-y-3">
                                    {updates.length === 0 ? (
                                        <div className="py-16 text-center">
                                            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                                                <Activity size={24} className="text-blue-300"/>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-700">No Updates Yet</p>
                                            <p className="text-xs text-gray-400 mt-1">The organiser hasn't posted any progress updates.</p>
                                        </div>
                                    ) : updates.map(u => (
                                        <div key={u.id} className="border border-gray-100 rounded-xl p-4">
                                            <p className="text-[11px] text-gray-400 mb-1.5">{u.createdAt ? new Date(u.createdAt).toLocaleString() : ''}</p>
                                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{u.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ── Chain Records ── */}
                            {activeSection === 'chain' && (
                                <div className="space-y-5">
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
                                        <Info size={14} className="shrink-0 mt-0.5"/>
                                        On-chain records are publicly readable on the Hyperledger Fabric ledger. Visible to all partners in scope, regardless of task assignment.
                                    </div>

                                    {chainLoading ? (
                                        <div className="flex justify-center py-10"><Loader2 size={20} className="text-gray-300 animate-spin"/></div>
                                    ) : chainRec && (
                                        <div className="space-y-4">
                                            {/* Campaign chain ID */}
                                            <div className="border border-gray-100 rounded-xl p-4">
                                                <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Campaign On-chain Identity</p>
                                                <div className="space-y-2 text-xs">
                                                    {[
                                                        { label: 'Blockchain TX ID',      value: chainRec.blockchainTxId },
                                                        { label: 'Blockchain Campaign ID', value: chainRec.blockchainCampaignId },
                                                    ].map(r => r.value && (
                                                        <div key={r.label} className="flex gap-3">
                                                            <span className="w-40 shrink-0 text-gray-400">{r.label}</span>
                                                            <code className="font-mono text-emerald-600 break-all">{r.value}</code>
                                                        </div>
                                                    ))}
                                                    {!chainRec.onChain && (
                                                        <p className="text-amber-600 italic">{chainRec.chainNote || 'Not yet recorded on-chain'}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Live chaincode state */}
                                            {chainRec.campaignOnChainState && (
                                                <div className="border border-gray-100 rounded-xl p-4">
                                                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Live Ledger State</p>
                                                    <pre className="text-[11px] font-mono text-gray-700 bg-gray-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
                                                        {(() => { try { return JSON.stringify(JSON.parse(chainRec.campaignOnChainState), null, 2); } catch { return chainRec.campaignOnChainState; } })()}
                                                    </pre>
                                                </div>
                                            )}

                                            {/* Latest on-chain audit */}
                                            {chainRec.latestOnChainAudit && (
                                                <div className="border border-emerald-100 bg-emerald-50 rounded-xl p-4">
                                                    <p className="text-xs font-semibold text-emerald-700 uppercase mb-2">Latest On-chain Audit Record</p>
                                                    <pre className="text-[11px] font-mono text-emerald-800 overflow-x-auto whitespace-pre-wrap break-all">
                                                        {(() => { try { return JSON.stringify(JSON.parse(chainRec.latestOnChainAudit), null, 2); } catch { return chainRec.latestOnChainAudit; } })()}
                                                    </pre>
                                                </div>
                                            )}

                                            {/* Donation TX records */}
                                            <div className="border border-gray-100 rounded-xl p-4">
                                                <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
                                                    Donation Transactions on Chain ({chainRec.donationTxCount ?? 0})
                                                </p>
                                                {(!chainRec.donationTxRecords || chainRec.donationTxRecords.length === 0) ? (
                                                    <p className="text-xs text-gray-400 italic">No on-chain donation transactions recorded</p>
                                                ) : (
                                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                                        {chainRec.donationTxRecords.map(d => (
                                                            <div key={d.donationId} className="flex items-center gap-3 text-xs border-b border-gray-50 pb-2">
                                                                <span className="font-semibold text-gray-700">€{Number(d.amount).toFixed(2)}</span>
                                                                <span className="text-gray-500">{d.donor}</span>
                                                                <code className="font-mono text-[10px] text-blue-500 ml-auto truncate max-w-32" title={d.txHash}>{d.txHash?.substring(0,16)}…</code>
                                                                <span className="text-gray-400 shrink-0">{d.donationDate ? new Date(d.donationDate).toLocaleDateString() : ''}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Audit chain records */}
                                            <div className="border border-gray-100 rounded-xl p-4">
                                                <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
                                                    Audit Records on Chain ({chainRec.auditChainCount ?? 0})
                                                </p>
                                                {(!chainRec.auditChainRecords || chainRec.auditChainRecords.length === 0) ? (
                                                    <p className="text-xs text-gray-400 italic">No on-chain audit records yet</p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {chainRec.auditChainRecords.map((a, i) => {
                                                            const meta = AUDIT_META[a.conclusion] || AUDIT_META.PENDING_AUDIT;
                                                            return (
                                                                <div key={i} className="border border-gray-100 rounded-lg p-3 text-xs">
                                                                    <div className="flex items-center gap-2 mb-1.5">
                                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${meta.cls}`}>
                                                                            {meta.icon}{meta.label}
                                                                        </span>
                                                                        <span className="text-gray-500">{a.auditor}</span>
                                                                        <span className="text-gray-400 ml-auto">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <Link2 size={10} className="text-emerald-500"/>
                                                                        <code className="font-mono text-[10px] text-emerald-600 break-all">{a.blockchainAuditId}</code>
                                                                    </div>
                                                                    {a.evidenceHash && (
                                                                        <div className="flex items-center gap-1 mt-1">
                                                                            <Hash size={10} className="text-gray-400"/>
                                                                            <code className="font-mono text-[10px] text-gray-500 break-all">{a.evidenceHash}</code>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Verification Checklist ── */}
                            {activeSection === 'verification' && !isFullAccess && (
                                <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                                        <Lock size={24} className="text-gray-300"/>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">Verification Restricted</p>
                                        <p className="text-xs text-gray-400 max-w-xs mt-1 leading-relaxed">Accept the audit task to submit a material verification record.</p>
                                    </div>
                                </div>
                            )}
                            {activeSection === 'verification' && isFullAccess && (
                                <div className="space-y-5">
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 flex items-start gap-2">
                                        <Info size={14} className="shrink-0 mt-0.5"/>
                                        Complete the checklist below. This record will be saved alongside the campaign for audit trail. It does NOT change the campaign status.
                                    </div>

                                    {/* Group by category */}
                                    {['Completeness', 'Authenticity', 'Risk'].map(cat => (
                                        <div key={cat}>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{cat} Checks</p>
                                            <div className="bg-white border border-gray-100 rounded-xl px-4 divide-y divide-gray-50">
                                                {CHECKLIST_TEMPLATE.filter(i => i.category === cat).map(item => (
                                                    <ChecklistRow
                                                        key={item.key}
                                                        item={item}
                                                        value={checklistState[item.key] || 'NA'}
                                                        note={checkNotes[item.key]}
                                                        onChange={setCheckItem}
                                                        onNoteChange={setCheckNote}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Overall assessment */}
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Overall Assessment</p>
                                        <div className="flex gap-2 mb-3">
                                            {STATUS_OPT.map(o => (
                                                <button key={o.value} onClick={() => setOvStatus(o.value)}
                                                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${overallStatus === o.value ? o.cls : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                                    {o.label}
                                                </button>
                                            ))}
                                        </div>
                                        <textarea value={overallNote} onChange={e => setOverallNote(e.target.value)} rows={3}
                                            placeholder="Summary notes for this verification (optional)..."
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"/>
                                    </div>

                                    {saveMsg && (
                                        <div className={`text-sm px-3 py-2 rounded-xl ${saveMsg.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                            {saveMsg}
                                        </div>
                                    )}

                                    <button onClick={submitVerification} disabled={saving}
                                        className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {saving ? <Loader2 size={14} className="animate-spin"/> : <ClipboardList size={14}/>}
                                        Save Verification Record
                                    </button>
                                </div>
                            )}

                            {/* ── Verification History ── */}
                            {activeSection === 'history' && (
                                <div className="space-y-3">
                                    {verifications.length === 0 ? (
                                        <div className="py-12 text-center text-gray-400 text-sm">No verification records yet</div>
                                    ) : verifications.map(v => {
                                        const parsed = (() => { try { return JSON.parse(v.checklist); } catch { return []; } })();
                                        const passCount = parsed.filter(i => i.status === 'PASS').length;
                                        const failCount = parsed.filter(i => i.status === 'FAIL').length;
                                        const statusCls = v.overallStatus === 'PASS' ? 'bg-emerald-100 text-emerald-700' : v.overallStatus === 'FAIL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
                                        return (
                                            <div key={v.id} className="border border-gray-100 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusCls}`}>{v.overallStatus}</span>
                                                        <span className="text-xs text-gray-500">by <strong>{v.partner}</strong></span>
                                                    </div>
                                                    <span className="text-[11px] text-gray-400">{v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}</span>
                                                </div>
                                                <div className="flex gap-3 text-xs text-gray-500 mb-2">
                                                    <span className="text-emerald-600 font-medium">{passCount} ✓ Pass</span>
                                                    <span className="text-red-600 font-medium">{failCount} ✗ Fail</span>
                                                    <span className="text-gray-400">{parsed.length - passCount - failCount} N/A</span>
                                                </div>
                                                {v.overallNote && <p className="text-xs text-gray-600 italic">"{v.overallNote}"</p>}
                                                {/* Fail items */}
                                                {parsed.filter(i => i.status === 'FAIL').length > 0 && (
                                                    <div className="mt-2 space-y-1">
                                                        {parsed.filter(i => i.status === 'FAIL').map(i => (
                                                            <div key={i.key} className="flex items-start gap-1.5 text-[11px] text-red-600">
                                                                <XCircle size={10} className="shrink-0 mt-0.5"/>
                                                                <span>{i.label}{i.note ? ` — ${i.note}` : ''}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                        </div>
                    </div>
                )}
            </div>

            {/* Audit modal triggered from within material review */}
            {showAudit && detail && (
                <AuditModal
                    campaign={{ ...detail.basicInfo, id: campaignId, title: campaignTitle }}
                    onClose={() => setShowAudit(false)}
                    onDone={() => { setShowAudit(false); onAuditDone?.(); onClose(); }}
                />
            )}
        </div>
    );
}

// ── Decline modal ─────────────────────────────────────────────────────────────

function DeclineModal({ task, onClose, onDone }) {
    const [reason, setReason]   = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');

    const submit = async () => {
        if (!reason.trim()) { setError('Please provide a reason for declining.'); return; }
        setLoading(true); setError('');
        try {
            await partnerAPI.declineTask(task.id, reason.trim());
            onDone(); onClose();
        } catch (e) { setError(e.message); } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="font-semibold text-gray-900">Decline Task</h3>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{task.campaign?.title}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                            <AlertCircle size={14}/>{error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4}
                            placeholder="Explain why you are declining this task (e.g. conflict of interest, insufficient materials, outside scope)..."
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"/>
                        <p className="text-[11px] text-gray-400 mt-1">The reason will be logged and the task will return to the open pool.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button onClick={submit} disabled={loading || !reason.trim()}
                            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={14} className="animate-spin"/> : <Ban size={14}/>}
                            Decline Task
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Task Inbox Tab ────────────────────────────────────────────────────────────

const TASK_FILTER = [
    { id: 'open',      label: 'Open',      icon: Inbox },
    { id: 'accepted',  label: 'Accepted',  icon: ClipboardList },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
];

function TaskCard({ task, onAccept, onDecline, onAudit, onReview, view, accepting }) {
    const c = task.campaign || {};
    const progress = c.goalAmount > 0 ? Math.min(100, c.currentAmount / c.goalAmount * 100) : 0;

    const borderColor = view === 'completed' ? 'border-l-emerald-400' : view === 'accepted' ? 'border-l-blue-500' : 'border-l-amber-400';
    const initial = (c.title || '?')[0].toUpperCase();
    const categoryColors = {
        MEDICAL: 'bg-rose-50 text-rose-600', EDUCATION: 'bg-blue-50 text-blue-600',
        DISASTER: 'bg-orange-50 text-orange-600', COMMUNITY: 'bg-teal-50 text-teal-600',
    };
    const catCls = categoryColors[c.category?.toUpperCase()] || 'bg-gray-50 text-gray-500';

    return (
        <div className={`bg-white border border-gray-100 rounded-xl overflow-hidden border-l-4 ${borderColor} hover:shadow-md transition-shadow`}>
            <div className="px-5 py-5">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-50 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                        {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-[15px] font-semibold text-gray-900 leading-snug">{c.title}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className={`font-medium px-2 py-0.5 rounded-full ${CAMPAIGN_STATUS_META[c.status] || 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                            {c.category && <span className={`px-2 py-0.5 rounded-full font-medium ${catCls}`}>{c.category}</span>}
                            <span className="text-gray-400">{c.organizer}</span>
                        </div>

                        {c.description && <p className="text-sm text-gray-500 mt-2.5 line-clamp-2 leading-relaxed">{c.description}</p>}

                        <div className="flex items-center gap-3 mt-3">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${progress >= 80 ? 'bg-emerald-500' : progress >= 40 ? 'bg-blue-400' : 'bg-amber-400'}`} style={{ width: `${progress}%` }}/>
                            </div>
                            <span className="text-xs font-semibold text-gray-600 shrink-0 tabular-nums">
                                €{Number(c.currentAmount||0).toLocaleString()} <span className="text-gray-300 font-normal">/</span> €{Number(c.goalAmount||0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2.5 flex-wrap">
                    {view === 'open' && (
                        <>
                            <button onClick={() => onAccept(task)} disabled={accepting}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-sm shadow-indigo-200">
                                {accepting ? <Loader2 size={13} className="animate-spin"/> : <UserCheck size={13}/>}
                                Accept Task
                            </button>
                            <button onClick={() => onDecline(task)}
                                className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-xs font-medium hover:bg-gray-50 hover:text-gray-700 transition-all">
                                <Ban size={13}/>Decline
                            </button>
                        </>
                    )}
                    {view === 'accepted' && (
                        <>
                            <button onClick={() => onReview(task)}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 transition-all shadow-sm shadow-indigo-200">
                                <FolderOpen size={13}/>Review Materials
                            </button>
                            <button onClick={() => onAudit(c)}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-500 transition-all shadow-sm shadow-emerald-200">
                                <Shield size={13}/>Submit Audit
                            </button>
                            <button onClick={() => onDecline(task)}
                                className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-xs font-medium hover:bg-gray-50 hover:text-gray-700 transition-all">
                                <Ban size={13}/>Decline
                            </button>
                        </>
                    )}
                    {view === 'completed' && (
                        <>
                            <button onClick={() => onReview(task)}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 transition-all shadow-sm shadow-indigo-200">
                                <FolderOpen size={13}/>Review Materials
                            </button>
                            {task.assignedPartner && (
                                <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl font-medium">
                                    <CheckCircle size={13}/>Audited by {task.assignedPartner}
                                </span>
                            )}
                        </>
                    )}
                    <span className="ml-auto text-[11px] text-gray-300 tabular-nums">
                        #{task.id} · {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ''}
                    </span>
                </div>
            </div>
        </div>
    );
}

function TaskInboxTab() {
    const [view, setView]             = useState('open');
    const [tasks, setTasks]           = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState('');
    const [accepting, setAccepting]   = useState(null);
    const [auditTarget, setAuditTarget]     = useState(null);
    const [reviewTarget, setReviewTarget]   = useState(null);
    const [declineTarget, setDeclineTarget] = useState(null);

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const loaders = { open: partnerAPI.getOpenTasks, accepted: partnerAPI.getMyTasks, completed: partnerAPI.getCompletedTasks };
            setTasks(await (loaders[view] || loaders.open)());
        } catch (e) { setError(e.message); } finally { setLoading(false); }
    }, [view]);

    useEffect(() => { load(); }, [load]);

    const handleAccept = async (task) => {
        setAccepting(task.id); setError('');
        try {
            await partnerAPI.acceptTask(task.id);
            setView('accepted');
        } catch (e) { setError(e.message); } finally { setAccepting(null); }
    };

    const emptyMsg = { open: 'No open audit tasks at the moment.', accepted: 'No accepted tasks yet.', completed: 'No completed tasks yet.' };

    return (
        <div className="space-y-5">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {TASK_FILTER.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button key={tab.id} onClick={() => setView(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${view === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Icon size={12}/>{tab.label}
                        </button>
                    );
                })}
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    <AlertCircle size={14}/>{error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 size={28} className="text-indigo-300 animate-spin"/></div>
            ) : tasks.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                        <Inbox size={28} className="text-gray-300"/>
                    </div>
                    <p className="text-sm font-semibold text-gray-600">{emptyMsg[view]}</p>
                    <p className="text-xs text-gray-400 mt-1">Check back later for new tasks.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-xs text-gray-400 font-medium">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
                    {tasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            view={view}
                            accepting={accepting === task.id}
                            onAccept={handleAccept}
                            onDecline={setDeclineTarget}
                            onAudit={setAuditTarget}
                            onReview={setReviewTarget}
                        />
                    ))}
                </div>
            )}

            {auditTarget && (
                <AuditModal campaign={auditTarget} onClose={() => setAuditTarget(null)} onDone={load}/>
            )}
            {reviewTarget && (
                <MaterialReviewPanel
                    campaignId={reviewTarget.campaign?.id}
                    campaignTitle={reviewTarget.campaign?.title}
                    onClose={() => setReviewTarget(null)}
                    onAuditDone={load}
                />
            )}
            {declineTarget && (
                <DeclineModal task={declineTarget} onClose={() => setDeclineTarget(null)} onDone={load}/>
            )}
        </div>
    );
}

// ── Tab: My Profile ───────────────────────────────────────────────────────────

function ProfileTab() {
    const [profile, setProfile]   = useState(null);
    const [fabric, setFabric]     = useState(null);
    const [loading, setLoading]   = useState(true);
    const [editing, setEditing]   = useState(false);
    const [saving, setSaving]     = useState(false);
    const [form, setForm]         = useState({});
    const [msg, setMsg]           = useState('');

    useEffect(() => {
        Promise.all([partnerAPI.getProfile(), partnerAPI.getFabricIdentity()])
            .then(([p, f]) => { setProfile(p); setFabric(f); setForm({ orgName: p.orgName || '', credentialNumber: p.credentialNumber || '', fabricMspId: p.fabricMspId || '', certSerial: p.certSerial || '' }); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const save = async () => {
        setSaving(true); setMsg('');
        try {
            const updated = await partnerAPI.updateProfile(form);
            setProfile(updated);
            setEditing(false);
            setMsg('Profile updated successfully.');
        } catch (e) { setMsg(e.message); } finally { setSaving(false); }
    };

    if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="text-gray-300 animate-spin"/></div>;

    const cert = fabric?.systemCert || {};

    return (
        <div className="space-y-5">
            {msg && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
                    <CheckCircle size={14}/>{msg}
                </div>
            )}

            {/* Organisation info */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Building2 size={18} className="text-blue-600"/>
                        <h3 className="font-semibold text-gray-900">Organisation Info</h3>
                    </div>
                    {!editing ? (
                        <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <Edit3 size={12}/>Edit
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50">
                                {saving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>}Save
                            </button>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { label: 'Organisation Name', key: 'orgName', placeholder: 'e.g. Global Audit Partners Ltd.' },
                        { label: 'Credential / License Number', key: 'credentialNumber', placeholder: 'e.g. REG-2024-XXXXX' },
                        { label: 'Email',  key: '_username',  static: profile?.username },
                    ].map(field => (
                        <div key={field.key}>
                            <p className="text-xs font-medium text-gray-500 mb-1">{field.label}</p>
                            {field.static !== undefined ? (
                                <p className="text-sm text-gray-800">{field.static}</p>
                            ) : editing ? (
                                <input value={form[field.key] || ''} onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                                    placeholder={field.placeholder}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                            ) : (
                                <p className="text-sm text-gray-800">{profile?.[field.key] || <span className="text-gray-400 italic">Not set</span>}</p>
                            )}
                        </div>
                    ))}
                    <PasswordChangeField />
                </div>
            </div>

            {/* Fabric identity */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                    <Key size={18} className="text-purple-600"/>
                    <h3 className="font-semibold text-gray-900">Fabric Identity</h3>
                    <span className="ml-auto text-[11px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">Hyperledger Fabric</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { label: 'MSP ID',         value: profile?.fabricMspId || fabric?.mspId || '—' },
                        { label: 'Channel',         value: fabric?.channelName || '—' },
                        { label: 'Chaincode',       value: fabric?.chaincodeName || '—' },
                        { label: 'Peer Endpoint',   value: fabric?.peerEndpoint || '—' },
                    ].map(row => (
                        <div key={row.label}>
                            <p className="text-xs font-medium text-gray-500 mb-1">{row.label}</p>
                            <p className="text-sm font-mono text-gray-800 break-all">{row.value}</p>
                        </div>
                    ))}
                    {editing && (
                        <div className="sm:col-span-2">
                            <p className="text-xs font-medium text-gray-500 mb-1">MSP ID (override)</p>
                            <input value={form.fabricMspId || ''} onChange={e => setForm(f => ({ ...f, fabricMspId: e.target.value }))}
                                placeholder="e.g. Org2MSP"
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-300"/>
                        </div>
                    )}
                </div>


                {/* Org2 identity status */}
                <div className="mt-5 pt-5 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Identity Status</p>
                    {cert.subject ? (
                        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"/>
                            Org2 certificate active — signed by {cert.issuer?.split(',')[0] || 'CA'}
                        </div>
                    ) : cert.error ? (
                        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"/>
                            Certificate not available
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0"/>
                            No certificate information
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

// ── Tab: My Records ───────────────────────────────────────────────────────────

function MyRecordsTab() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        partnerAPI.getMyAudits().then(setRecords).catch(() => setRecords([])).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="text-gray-300 animate-spin"/></div>;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">{records.length} audit records submitted</p>
            </div>
            {records.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-xl py-16 text-center text-gray-400 text-sm">
                    No audits submitted yet
                </div>
            ) : records.map(r => {
                const meta = AUDIT_META[r.conclusion] || AUDIT_META.PENDING_AUDIT;
                return (
                    <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{r.campaignTitle}</p>
                                <p className="text-xs text-gray-400 mt-0.5">Campaign #{r.campaignId} · <span className={`font-medium ${CAMPAIGN_STATUS_META[r.campaignStatus] ? 'text-gray-600' : ''}`}>{r.campaignStatus}</span></p>
                            </div>
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${meta.cls}`}>
                                {meta.icon}{meta.label}
                            </span>
                        </div>
                        {r.evidenceSummary && <p className="text-xs text-gray-600 mb-2">{r.evidenceSummary}</p>}
                        {r.notes && <p className="text-xs text-gray-500 italic mb-2">"{r.notes}"</p>}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                            <span>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</span>
                            {r.evidenceHash && (
                                <span className="flex items-center gap-1 font-mono">
                                    <Hash size={10}/>{r.evidenceHash.substring(0, 16)}…
                                </span>
                            )}
                            {r.onChain && r.blockchainAuditId && (
                                <span className="flex items-center gap-1 text-emerald-500 font-medium">
                                    <Link2 size={10}/><span className="font-mono">{r.blockchainAuditId}</span>
                                    <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-semibold ml-1">On-Chain</span>
                                </span>
                            )}
                            {!r.onChain && (
                                <span className="flex items-center gap-1 text-gray-400">
                                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">Off-Chain</span>
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const MAIN_TABS = [
    { id: 'inbox',   label: 'Audit Pool',     icon: Inbox },
    { id: 'records', label: 'My Records',     icon: BarChart3 },
    { id: 'profile', label: 'My Profile',     icon: Building2 },
];

export default function PartnerPanel() {
    const [activeTab, setActiveTab] = useState('inbox');
    const Tab = MAIN_TABS.find(t => t.id === activeTab);

    return (
        <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-indigo-100 to-blue-50 p-3 rounded-2xl">
                            <Shield className="text-indigo-600" size={26}/>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Partner Panel</h1>
                            <p className="text-sm text-gray-400 mt-0.5">Third-party audit workspace</p>
                        </div>
                    </div>
                </div>

                {/* Tab nav */}
                <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl w-fit">
                    {MAIN_TABS.map(t => {
                        const Icon = t.icon;
                        const active = activeTab === t.id;
                        return (
                            <button key={t.id} onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                <Icon size={15} className={active ? 'text-indigo-500' : ''}/>
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab content */}
                {activeTab === 'inbox'       && <TaskInboxTab/>}
                {activeTab === 'profile'     && <ProfileTab/>}
                {activeTab === 'records'  && <MyRecordsTab/>}
            </div>
        </div>
    );
}
