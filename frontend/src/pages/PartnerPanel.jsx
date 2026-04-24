import React, { useState, useEffect, useCallback } from 'react';
import {
    Shield, CheckCircle, XCircle, Loader2, AlertCircle,
    Clock, AlertTriangle, RefreshCw,
    FileText, Hash, MessageSquare, Link2, Building2, Key,
    Lock, BarChart3, Edit3, Save, X, Inbox,
    UserCheck, FolderOpen, ClipboardList,
} from 'lucide-react';
import { partnerAPI, userAPI } from '@/utils/api';
import { CAMPAIGN_STATUS } from '@/utils/constants';

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

// Two primary conclusions are wired into the campaign workflow; the other two
// are recorded on-chain but do not yet trigger any downstream UI flow. They are
// kept here so the demo can show the full set of conclusions the chaincode
// supports.
const CONCLUSION_OPTIONS = [
    { value: 'APPROVED',      label: 'Approve',           cls: 'bg-emerald-600 hover:bg-emerald-500 text-white', desc: 'Materials verified. Campaign goes ACTIVE.', primary: true },
    { value: 'REJECTED',      label: 'Reject',            cls: 'bg-red-600 hover:bg-red-500 text-white',         desc: 'Campaign does not meet requirements. Goes SUSPENDED.', primary: true },
    { value: 'REQUIRES_INFO', label: 'Request More Info', cls: 'bg-amber-500 hover:bg-amber-400 text-white',     desc: 'Records a request on-chain (no automated follow-up yet).', primary: false },
    { value: 'RISK_FLAGGED',  label: 'Flag Risk',         cls: 'bg-rose-700 hover:bg-rose-600 text-white',       desc: 'Records a risk flag on-chain and suspends the campaign.', primary: false },
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
                                    <div className="flex items-center gap-1.5">
                                        <p>{opt.label}</p>
                                        {!opt.primary && (
                                            <span className={`text-[9px] px-1 py-0.5 rounded ${conclusion === opt.value ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>demo only</span>
                                        )}
                                    </div>
                                    <p className={`text-[10px] mt-0.5 font-normal ${conclusion === opt.value ? 'opacity-80' : 'text-gray-400'}`}>{opt.desc}</p>
                                </button>
                            ))}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                            <span className="font-semibold">Approve</span> and <span className="font-semibold">Reject</span> drive the campaign workflow today. <span className="font-semibold">Requires Info</span> and <span className="font-semibold">Flag Risk</span> are still recorded on-chain but the downstream organiser/admin flows are not implemented yet.
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1"><FileText size={14}/>Evidence Summary</label>
                        <textarea value={evidenceSummary} onChange={e => setEvidenceSummary(e.target.value)} rows={3}
                            placeholder="Summarise materials reviewed and key findings..."
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"/>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1"><MessageSquare size={14}/>Additional Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                            placeholder="Any remarks for the campaign organiser..."
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"/>
                    </div>
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

// ── Task Inbox Tab ────────────────────────────────────────────────────────────

const TASK_FILTER = [
    { id: 'open',      label: 'Open',      icon: Inbox },
    { id: 'accepted',  label: 'Accepted',  icon: ClipboardList },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
];

function TaskCard({ task, onAccept, onAudit, view, accepting }) {
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
                        <button onClick={() => onAccept(task)} disabled={accepting}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-sm shadow-indigo-200">
                            {accepting ? <Loader2 size={13} className="animate-spin"/> : <UserCheck size={13}/>}
                            Accept Task
                        </button>
                    )}
                    {view === 'accepted' && (
                        <>
                            <button onClick={() => onAudit(c)}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-500 transition-all shadow-sm shadow-emerald-200">
                                <Shield size={13}/>Submit Audit
                            </button>
                            <button type="button" disabled
                                title="Material review is a future feature — placeholder only"
                                className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-400 rounded-xl text-xs font-medium cursor-not-allowed bg-gray-50">
                                <FolderOpen size={13}/>Review Materials
                            </button>
                        </>
                    )}
                    {view === 'completed' && (
                        <>
                            <button type="button" disabled
                                title="Material review is a future feature — placeholder only"
                                className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-400 rounded-xl text-xs font-medium cursor-not-allowed bg-gray-50">
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
                            onAudit={setAuditTarget}
                        />
                    ))}
                </div>
            )}

            {auditTarget && (
                <AuditModal campaign={auditTarget} onClose={() => setAuditTarget(null)} onDone={load}/>
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
                {activeTab === 'inbox'   && <TaskInboxTab/>}
                {activeTab === 'profile' && <ProfileTab/>}
                {activeTab === 'records' && <MyRecordsTab/>}
            </div>
        </div>
    );
}
