import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Users,
    Clock,
    CheckCircle,
    XCircle,
    ChevronDown,
    ChevronUp,
    Eye,
    Copy,
    AlertCircle,
    Loader2,
    Building2,
    Mail,
    Phone,
    Calendar,
    Link2,
    Activity,
    FileText,
    RefreshCw,
    Hash,
    Shield,
    ArrowUpRight,
    Database,
    TrendingUp,
    Banknote,
    Target,
    UserCheck,
} from 'lucide-react';
import { adminAPI } from '@/utils/api';

const STATUS_TABS = [
    { id: '', label: 'All' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'APPROVED', label: 'Approved' },
    { id: 'REJECTED', label: 'Rejected' },
];

const StatusBadge = ({ status }) => {
    const styles = {
        PENDING: 'bg-yellow-100 text-yellow-700',
        APPROVED: 'bg-emerald-100 text-emerald-700',
        REJECTED: 'bg-red-100 text-red-700',
    };
    const icons = {
        PENDING: <Clock size={13} />,
        APPROVED: <CheckCircle size={13} />,
        REJECTED: <XCircle size={13} />,
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
            {icons[status]}
            {status}
        </span>
    );
};

function ApplicationRow({ app, onApprove, onReject }) {
    const [expanded, setExpanded] = useState(false);
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [approvedResult, setApprovedResult] = useState(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    const handleApprove = async () => {
        setApproving(true);
        setError('');
        try {
            const result = await onApprove(app.id);
            setApprovedResult(result);
        } catch (err) {
            setError(err.message || 'Approval failed');
        } finally {
            setApproving(false);
        }
    };

    const handleReject = async () => {
        setRejecting(true);
        setError('');
        try {
            await onReject(app.id, rejectReason);
            setShowRejectForm(false);
        } catch (err) {
            setError(err.message || 'Rejection failed');
        } finally {
            setRejecting(false);
        }
    };

    const copyPassword = () => {
        if (approvedResult?.tempPassword) {
            navigator.clipboard.writeText(approvedResult.tempPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4 min-w-0">
                    <div className="bg-blue-50 p-2 rounded-lg shrink-0">
                        <Building2 size={18} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{app.organizationName}</p>
                        <p className="text-sm text-gray-500 truncate">{app.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                    <StatusBadge status={app.status} />
                    {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
            </div>

            {expanded && (
                <div className="px-5 pb-5 border-t border-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Users size={15} className="text-gray-400" />
                                <span className="font-medium">Contact:</span>
                                <span>{app.contactName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Mail size={15} className="text-gray-400" />
                                <span className="font-medium">Email:</span>
                                <span>{app.email}</span>
                            </div>
                            {app.phone && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone size={15} className="text-gray-400" />
                                    <span className="font-medium">Phone:</span>
                                    <span>{app.phone}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar size={15} className="text-gray-400" />
                                <span className="font-medium">Applied:</span>
                                <span>{new Date(app.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">{app.description}</p>
                        </div>
                    </div>

                    {app.rejectionReason && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                            <p className="text-sm font-medium text-red-700 mb-0.5">Rejection Reason</p>
                            <p className="text-sm text-red-600">{app.rejectionReason}</p>
                        </div>
                    )}

                    {error && (
                        <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    {approvedResult && (
                        <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <p className="text-sm font-semibold text-emerald-800 mb-2">Account Created Successfully</p>
                            <p className="text-sm text-emerald-700 mb-3">
                                Share these credentials with the partner. The temporary password is shown only once.
                            </p>
                            <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
                                <span className="text-sm font-mono flex-1 text-gray-800">{approvedResult.tempPassword}</span>
                                <button
                                    onClick={copyPassword}
                                    className="text-emerald-600 hover:text-emerald-700 transition-colors shrink-0"
                                    title="Copy password"
                                >
                                    {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {app.status === 'PENDING' && !approvedResult && (
                        <div className="mt-4 flex flex-wrap gap-3">
                            {!showRejectForm ? (
                                <>
                                    <button
                                        onClick={handleApprove}
                                        disabled={approving}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-60"
                                    >
                                        {approving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                                        Approve & Create Account
                                    </button>
                                    <button
                                        onClick={() => setShowRejectForm(true)}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
                                    >
                                        <XCircle size={15} />
                                        Reject
                                    </button>
                                </>
                            ) : (
                                <div className="w-full space-y-3">
                                    <textarea
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        placeholder="Reason for rejection (optional)"
                                        rows={2}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none bg-gray-50"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleReject}
                                            disabled={rejecting}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-colors disabled:opacity-60"
                                        >
                                            {rejecting ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                                            Confirm Reject
                                        </button>
                                        <button
                                            onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                                            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Dashboard Panel ─────────────────────────────────────────────────────────

const ROLE_LABEL = { USER: 'Donor', INITIATOR: 'Campaign Creator', PARTNER: 'Third-party Auditor', ADMIN: 'Admin' };
const ROLE_COLOR = { USER: 'bg-blue-50 text-blue-600', INITIATOR: 'bg-emerald-50 text-emerald-600', PARTNER: 'bg-purple-50 text-purple-600', ADMIN: 'bg-rose-50 text-rose-600' };
const STATUS_COLOR_DASH = { PENDING: 'bg-amber-400', ACTIVE: 'bg-emerald-400', SUSPENDED: 'bg-red-400', COMPLETED: 'bg-blue-400', CLOSED: 'bg-gray-400' };

function MiniTrendBar({ trend, valueKey = 'count', color = 'bg-emerald-400' }) {
    if (!trend || trend.length === 0) return <span className="text-xs text-gray-300">No data</span>;
    const max = Math.max(...trend.map(t => Number(t[valueKey]) || 0), 1);
    return (
        <div className="flex items-end gap-0.5 h-8">
            {trend.slice(-14).map((t, i) => {
                const h = Math.max(2, Math.round((Number(t[valueKey]) / max) * 32));
                return <div key={i} className={`w-2 rounded-sm ${color} opacity-80`} style={{ height: `${h}px` }} title={`${t.date}: ${t[valueKey]}`} />;
            })}
        </div>
    );
}

function DashboardPanel() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        adminAPI.getDashboardSummary()
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center py-20"><Loader2 size={28} className="text-gray-300 animate-spin" /></div>;
    if (error)   return <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"><AlertCircle size={15} />{error}</div>;
    if (!data)   return null;

    const campaignStatuses = Object.entries(data.campaignByStatus || {});
    const totalCamp = campaignStatuses.reduce((s, [, v]) => s + Number(v), 0) || 1;
    const userRoles = Object.entries(data.userByRole || {});
    const totalUsers = userRoles.reduce((s, [, v]) => s + Number(v), 0) || 1;

    return (
        <div className="space-y-6">
            {/* ── Core stat cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                    { icon: <Banknote size={18} />,   label: 'Total Raised',   value: `€${Number(data.totalRaised || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: `€${Number(data.monthAmount || 0).toFixed(0)} this month`, color: 'emerald' },
                    { icon: <Target size={18} />,     label: 'Total Campaigns', value: data.totalCampaigns, sub: `${data.campaignByStatus?.PENDING || 0} pending review`,  color: 'blue' },
                    { icon: <Users size={18} />,      label: 'Total Users',    value: data.totalUsers,    sub: `${data.activeUsers} active`, color: 'purple' },
                    { icon: <UserCheck size={18} />,  label: 'Total Donations', value: data.totalDonations, sub: `${data.todayDonations} today`, color: 'amber' },
                    { icon: <TrendingUp size={18} />, label: "Today's Amount", value: `€${Number(data.todayAmount || 0).toFixed(2)}`, sub: `${data.todayDonations} donation${data.todayDonations !== 1 ? 's' : ''}`, color: 'rose' },
                ].map(card => {
                    const colors = { emerald: 'bg-emerald-50 text-emerald-600', blue: 'bg-blue-50 text-blue-600', purple: 'bg-purple-50 text-purple-600', amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600' };
                    return (
                        <div key={card.label} className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col gap-2">
                            <div className={`${colors[card.color]} w-8 h-8 rounded-lg flex items-center justify-center`}>{card.icon}</div>
                            <p className="text-xl font-bold text-gray-900 leading-none">{card.value}</p>
                            <p className="text-xs text-gray-500">{card.label}</p>
                            {card.sub && <p className="text-[11px] text-gray-400">{card.sub}</p>}
                        </div>
                    );
                })}
            </div>

            {/* ── Trend charts row ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                    { title: 'Donation Trend (14d)', trend: data.donationTrend, valueKey: 'amount', color: 'bg-emerald-400', suffix: key => key === 'amount' ? `€${Number(key).toFixed(0)}` : '' },
                    { title: 'New Users (14d)',      trend: data.userTrend,     valueKey: 'count',  color: 'bg-blue-400' },
                    { title: 'New Campaigns (14d)',  trend: data.campaignTrend, valueKey: 'count',  color: 'bg-purple-400' },
                ].map(chart => (
                    <div key={chart.title} className="bg-white border border-gray-100 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-500 mb-3">{chart.title}</p>
                        <MiniTrendBar trend={chart.trend} valueKey={chart.valueKey} color={chart.color} />
                        <div className="flex justify-between mt-2">
                            <span className="text-[11px] text-gray-300">{chart.trend?.[0]?.date?.slice(5) || ''}</span>
                            <span className="text-[11px] text-gray-300">{chart.trend?.slice(-1)[0]?.date?.slice(5) || ''}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Breakdown row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Campaign status breakdown */}
                <div className="bg-white border border-gray-100 rounded-xl p-5">
                    <p className="text-sm font-semibold text-gray-700 mb-4">Campaign Status</p>
                    {campaignStatuses.length === 0 ? (
                        <p className="text-xs text-gray-400">No campaigns yet</p>
                    ) : (
                        <div className="space-y-2.5">
                            {campaignStatuses.map(([status, count]) => {
                                const pct = (Number(count) / totalCamp * 100).toFixed(1);
                                return (
                                    <div key={status} className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 w-20 shrink-0">{status}</span>
                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${STATUS_COLOR_DASH[status] || 'bg-gray-300'}`} style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-xs font-semibold text-gray-700 w-8 text-right shrink-0">{count}</span>
                                        <span className="text-xs text-gray-400 w-10 text-right shrink-0">{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* User role breakdown */}
                <div className="bg-white border border-gray-100 rounded-xl p-5">
                    <p className="text-sm font-semibold text-gray-700 mb-4">User Roles</p>
                    {userRoles.length === 0 ? (
                        <p className="text-xs text-gray-400">No users yet</p>
                    ) : (
                        <div className="space-y-2.5">
                            {userRoles.map(([role, count]) => {
                                const pct = (Number(count) / totalUsers * 100).toFixed(1);
                                const ringColors = { USER: 'bg-blue-400', INITIATOR: 'bg-emerald-400', PARTNER: 'bg-purple-400', ADMIN: 'bg-rose-400' };
                                return (
                                    <div key={role} className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 w-28 shrink-0">{ROLE_LABEL[role] || role}</span>
                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${ringColors[role] || 'bg-gray-300'}`} style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-xs font-semibold text-gray-700 w-8 text-right shrink-0">{count}</span>
                                        <span className="text-xs text-gray-400 w-10 text-right shrink-0">{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Recent activity ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Recent donations */}
                <div className="bg-white border border-gray-100 rounded-xl p-5">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Recent Donations</p>
                    {data.recentDonations?.length === 0 ? (
                        <p className="text-xs text-gray-400">No donations yet</p>
                    ) : (
                        <div className="space-y-2.5">
                            {data.recentDonations?.map(d => (
                                <div key={d.id} className="flex items-center justify-between">
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-gray-700 truncate">{d.displayName}</p>
                                        <p className="text-[11px] text-gray-400 truncate">{d.campaignTitle}</p>
                                    </div>
                                    <span className="text-xs font-bold text-emerald-600 shrink-0 ml-2">€{Number(d.amount).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent campaigns */}
                <div className="bg-white border border-gray-100 rounded-xl p-5">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Recent Campaigns</p>
                    {data.recentCampaigns?.length === 0 ? (
                        <p className="text-xs text-gray-400">No campaigns yet</p>
                    ) : (
                        <div className="space-y-2.5">
                            {data.recentCampaigns?.map(c => (
                                <div key={c.id} className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-gray-700 truncate">{c.title}</p>
                                        <p className="text-[11px] text-gray-400">{c.organizer}</p>
                                    </div>
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_COLOR_DASH[c.status] ? STATUS_COLOR_DASH[c.status].replace('bg-', 'bg-').replace('400', '100') : 'bg-gray-100'} text-gray-600`}>
                                        {c.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent users */}
                <div className="bg-white border border-gray-100 rounded-xl p-5">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Recent Users</p>
                    {data.recentUsers?.length === 0 ? (
                        <p className="text-xs text-gray-400">No users yet</p>
                    ) : (
                        <div className="space-y-2.5">
                            {data.recentUsers?.map(u => (
                                <div key={u.id} className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-gray-700 truncate">{u.displayName}</p>
                                        <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                                    </div>
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${ROLE_COLOR[u.role] || 'bg-gray-50 text-gray-500'}`}>
                                        {ROLE_LABEL[u.role] || u.role}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Fund Flow Panel ─────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = 'emerald' }) {
    const colors = {
        emerald: 'bg-emerald-50 text-emerald-600',
        blue:    'bg-blue-50 text-blue-600',
        purple:  'bg-purple-50 text-purple-600',
        amber:   'bg-amber-50 text-amber-600',
    };
    return (
        <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className={`${colors[color]} p-2 rounded-lg inline-flex mb-3`}>{icon}</div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
    );
}

function VerifyModal({ donation, onClose }) {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminAPI.verifyDonationTx(donation.id)
            .then(setResult)
            .catch(e => setResult({ status: 'ERROR', message: e.message }))
            .finally(() => setLoading(false));
    }, []);

    const statusColor = {
        VERIFIED: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        NOT_ON_CHAIN: 'text-gray-500 bg-gray-50 border-gray-200',
        FABRIC_UNAVAILABLE: 'text-amber-600 bg-amber-50 border-amber-200',
        VERIFICATION_FAILED: 'text-red-600 bg-red-50 border-red-200',
        NOT_FOUND: 'text-red-600 bg-red-50 border-red-200',
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Transaction Verification</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
                </div>
                <div className="px-6 py-5">
                    <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm space-y-1.5">
                        <div className="flex gap-3"><span className="text-gray-400 w-24">Donation</span><span className="text-gray-700 font-medium">#{donation.id}</span></div>
                        <div className="flex gap-3"><span className="text-gray-400 w-24">Amount</span><span className="text-emerald-600 font-bold">€{Number(donation.amount).toFixed(2)}</span></div>
                        <div className="flex gap-3"><span className="text-gray-400 w-24">Donor</span><span className="text-gray-700">{donation.displayName}</span></div>
                        <div className="flex gap-3"><span className="text-gray-400 w-24">Campaign</span><span className="text-gray-700 truncate">{donation.campaignTitle}</span></div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-6"><Loader2 size={24} className="text-emerald-400 animate-spin" /></div>
                    ) : result && (
                        <div>
                            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold mb-4 ${statusColor[result.status] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                                <span>{result.status === 'VERIFIED' ? '✓' : '!'}</span>
                                <span>{result.message}</span>
                            </div>
                            {result.transactionHash && (
                                <div>
                                    <p className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wide">Transaction Hash</p>
                                    <code className="text-[11px] font-mono text-gray-700 break-all bg-gray-50 px-3 py-2 rounded-lg block">{result.transactionHash}</code>
                                </div>
                            )}
                            {result.chainRecord && (
                                <div className="mt-3">
                                    <p className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wide">Blockchain Record</p>
                                    <pre className="text-[11px] font-mono text-gray-700 bg-gray-50 px-3 py-2 rounded-lg overflow-x-auto whitespace-pre-wrap">{
                                        (() => { try { return JSON.stringify(JSON.parse(result.chainRecord), null, 2); } catch { return result.chainRecord; } })()
                                    }</pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function FundFlowPanel() {
    const [stats, setStats] = useState(null);
    const [donations, setDonations] = useState([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [loadingList, setLoadingList] = useState(true);
    const [error, setError] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [verifyTarget, setVerifyTarget] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    const loadStats = async () => {
        setLoadingStats(true);
        try { setStats(await adminAPI.getDonationStats()); }
        catch (e) { setError(e.message); }
        finally { setLoadingStats(false); }
    };

    const loadDonations = async () => {
        setLoadingList(true);
        try {
            const data = await adminAPI.getDonations({
                status: filterStatus || undefined,
                from: filterFrom || undefined,
                to: filterTo || undefined,
            });
            setDonations(data);
        } catch (e) { setError(e.message); }
        finally { setLoadingList(false); }
    };

    useEffect(() => { loadStats(); loadDonations(); }, []);

    const handleFilter = () => loadDonations();

    const handleExport = async () => {
        setExporting(true);
        try {
            const resp = await adminAPI.exportDonationsCsv({
                status: filterStatus || undefined,
                from: filterFrom || undefined,
                to: filterTo || undefined,
            });
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `donations-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) { alert('Export failed: ' + e.message); }
        finally { setExporting(false); }
    };

    return (
        <div className="space-y-6">
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    <AlertCircle size={15} />{error}
                </div>
            )}

            {/* Stats cards */}
            {loadingStats ? (
                <div className="flex justify-center py-8"><Loader2 size={24} className="text-purple-300 animate-spin" /></div>
            ) : stats && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard icon={<ArrowUpRight size={18} />} label="Total Raised" value={`€${Number(stats.totalAmount || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub={`${stats.totalCount} donations`} color="emerald" />
                        <StatCard icon={<Users size={18} />} label="Unique Donors" value={stats.uniqueDonors} color="blue" />
                        <StatCard icon={<Link2 size={18} />} label="On-chain Records" value={stats.onChainCount} sub={`${Number(stats.onChainRate || 0).toFixed(1)}% verified`} color="purple" />
                        <StatCard icon={<Activity size={18} />} label="Last 30 Days" value={`€${Number(stats.last30DaysAmount || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="amber" />
                    </div>

                    {/* Category breakdown */}
                    {stats.byCategory?.length > 0 && (
                        <div className="bg-white border border-gray-100 rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Donations by Category</h3>
                            <div className="space-y-2">
                                {stats.byCategory.sort((a, b) => Number(b.amount) - Number(a.amount)).map(c => {
                                    const total = stats.byCategory.reduce((s, x) => s + Number(x.amount), 0);
                                    const pct = total > 0 ? (Number(c.amount) / total * 100).toFixed(1) : 0;
                                    return (
                                        <div key={c.category} className="flex items-center gap-3">
                                            <span className="text-xs text-gray-500 w-24 shrink-0">{c.category}</span>
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="text-xs font-semibold text-gray-700 w-20 text-right shrink-0">€{Number(c.amount).toFixed(0)}</span>
                                            <span className="text-xs text-gray-400 w-10 text-right shrink-0">{pct}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Filter bar */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex flex-wrap gap-3 items-end">
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Status</p>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white">
                            <option value="">All</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="PENDING">Pending</option>
                            <option value="FAILED">Failed</option>
                        </select>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 mb-1">From</p>
                        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 mb-1">To</p>
                        <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                    </div>
                    <button onClick={handleFilter}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-500 transition-colors">
                        Filter
                    </button>
                    <button onClick={() => { setFilterStatus(''); setFilterFrom(''); setFilterTo(''); setTimeout(loadDonations, 0); }}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                        Reset
                    </button>
                    <button onClick={handleExport} disabled={exporting}
                        className="ml-auto flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors disabled:opacity-50">
                        {exporting ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Donation table */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">
                        Donation Records
                        <span className="ml-2 text-xs text-gray-400 font-normal">{donations.length} records</span>
                    </h3>
                </div>

                {loadingList ? (
                    <div className="flex justify-center py-12"><Loader2 size={24} className="text-gray-300 animate-spin" /></div>
                ) : donations.length === 0 ? (
                    <p className="text-center py-12 text-gray-400 text-sm">No donations found</p>
                ) : (
                    <>
                        {/* Table header */}
                        <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-2 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            <div className="col-span-1">#</div>
                            <div className="col-span-3">Donor</div>
                            <div className="col-span-3">Campaign</div>
                            <div className="col-span-2 text-right">Amount</div>
                            <div className="col-span-2">Date</div>
                            <div className="col-span-1 text-right">Chain</div>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {donations.map((d, i) => (
                                <div key={d.id}>
                                    <div
                                        className="grid grid-cols-12 gap-3 px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors items-center"
                                        onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                                    >
                                        <div className="col-span-1 text-xs text-gray-400">#{d.id}</div>
                                        <div className="col-span-3">
                                            <p className="text-sm font-medium text-gray-800 truncate">{d.displayName}</p>
                                            {!d.anonymous && <p className="text-xs text-gray-400 truncate">{d.donorEmail}</p>}
                                        </div>
                                        <div className="col-span-3">
                                            <p className="text-xs text-gray-600 truncate">{d.campaignTitle}</p>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <span className="text-sm font-bold text-emerald-600">€{Number(d.amount).toFixed(2)}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs text-gray-500">{d.date ? new Date(d.date).toLocaleDateString() : '—'}</p>
                                            <span className={`text-[10px] font-semibold ${d.status === 'COMPLETED' ? 'text-emerald-500' : d.status === 'FAILED' ? 'text-red-500' : 'text-amber-500'}`}>
                                                {d.status}
                                            </span>
                                        </div>
                                        <div className="col-span-1 text-right">
                                            {d.onChain ? (
                                                <button
                                                    onClick={e => { e.stopPropagation(); setVerifyTarget(d); }}
                                                    className="text-emerald-500 hover:text-emerald-700 text-xs font-semibold transition-colors"
                                                    title="Verify on blockchain"
                                                >⛓ Verify</button>
                                            ) : (
                                                <span className="text-gray-300 text-xs">—</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded row */}
                                    {expandedId === d.id && (
                                        <div className="px-5 pb-4 bg-gray-50/60 border-t border-gray-100 text-xs space-y-1.5">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                                                <div><p className="text-gray-400 mb-0.5">Donation ID</p><p className="text-gray-700 font-mono">#{d.id}</p></div>
                                                <div><p className="text-gray-400 mb-0.5">Campaign ID</p><p className="text-gray-700 font-mono">#{d.campaignId}</p></div>
                                                <div><p className="text-gray-400 mb-0.5">Campaign Status</p><p className="text-gray-700">{d.campaignStatus}</p></div>
                                                <div><p className="text-gray-400 mb-0.5">Anonymous</p><p className="text-gray-700">{d.anonymous ? 'Yes' : 'No'}</p></div>
                                            </div>
                                            {d.message && <div><p className="text-gray-400 mb-0.5">Message</p><p className="text-gray-600 italic">"{d.message}"</p></div>}
                                            {d.transactionHash && (
                                                <div>
                                                    <p className="text-gray-400 mb-0.5">Transaction Hash</p>
                                                    <code className="font-mono text-gray-700 break-all">{d.transactionHash}</code>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {verifyTarget && <VerifyModal donation={verifyTarget} onClose={() => setVerifyTarget(null)} />}
        </div>
    );
}

// ─── Campaign Management Panel ───────────────────────────────────────────────

const CAMPAIGN_STATUS_META = {
    PENDING:   { label: 'Pending Review', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
    ACTIVE:    { label: 'Approved',       bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400' },
    SUSPENDED: { label: 'Suspended',      bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-400' },
    COMPLETED: { label: 'Completed',      bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-400' },
    CLOSED:    { label: 'Closed',         bg: 'bg-gray-200',   text: 'text-gray-600',   dot: 'bg-gray-400' },
};

function CampaignStatusBadge({ status }) {
    const m = CAMPAIGN_STATUS_META[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
            {m.label}
        </span>
    );
}

function CampaignAdminRow({ campaign }) {
    const [expanded, setExpanded] = useState(false);
    const currentStatus = campaign.status;
    const progressPct = Math.min(Number(campaign.progress || 0), 100);

    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div
                className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {campaign.imageUrl
                        ? <img src={campaign.imageUrl} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-300"><Eye size={20} /></div>
                    }
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">{campaign.title}</p>
                        <CampaignStatusBadge status={currentStatus} />
                        {campaign.onChain && <span className="text-[10px] text-emerald-500 font-semibold">⛓ On-chain</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {campaign.category} · by {campaign.organizerName}
                    </p>
                    {/* Fund progress bar */}
                    <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${progressPct}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-500 shrink-0">
                            €{Number(campaign.currentAmount).toFixed(0)} / €{Number(campaign.goalAmount).toFixed(0)} ({progressPct}%)
                        </span>
                    </div>
                </div>

                {/* Chevron */}
                <div className="flex items-center shrink-0 ml-2">
                    {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
            </div>

            {/* Expanded detail */}
            {expanded && (
                <div className="border-t border-gray-50 px-5 py-4 bg-gray-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {/* Description */}
                        <div className="md:col-span-2">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</p>
                            <p className="text-gray-700 text-sm leading-relaxed">{campaign.description || '—'}</p>
                        </div>
                        {/* Meta */}
                        <div className="space-y-2">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Organizer</p>
                                <p className="text-gray-700">{campaign.organizerName}</p>
                                <p className="text-xs text-gray-400">{campaign.organizerEmail}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Funding</p>
                                <p className="text-gray-700">€{Number(campaign.currentAmount).toFixed(2)} raised</p>
                                <p className="text-xs text-gray-400">Goal: €{Number(campaign.goalAmount).toFixed(2)} · {campaign.donationCount} donations</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Dates</p>
                                <p className="text-xs text-gray-500">Created: {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : '—'}</p>
                                {campaign.completedAt && <p className="text-xs text-gray-500">Completed: {new Date(campaign.completedAt).toLocaleDateString()}</p>}
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}

function CampaignManagementPanel() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [keyword, setKeyword] = useState('');
    const [inputKeyword, setInputKeyword] = useState('');

    const load = async (status, kw) => {
        setLoading(true);
        setError('');
        try {
            const data = await adminAPI.getAllCampaigns(status || undefined, kw || undefined);
            setCampaigns(data);
        } catch (e) {
            setError(e.message || 'Failed to load campaigns');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(filterStatus, keyword); }, [filterStatus, keyword]);


    const statusCounts = Object.fromEntries(
        Object.keys(CAMPAIGN_STATUS_META).map(s => [s, campaigns.filter(c => c.status === s).length])
    );

    return (
        <div>
            {/* Status filter cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {Object.entries(CAMPAIGN_STATUS_META).map(([s, m]) => (
                    <button key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                        className={`rounded-xl p-3 text-left border transition-all ${
                            filterStatus === s ? `${m.bg} border-current ${m.text}` : 'bg-white border-gray-100 hover:border-gray-200'
                        }`}>
                        <p className="text-xl font-bold text-gray-900">{statusCounts[s] || 0}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="flex gap-2 mb-5">
                <input
                    value={inputKeyword}
                    onChange={e => setInputKeyword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && setKeyword(inputKeyword)}
                    placeholder="Search campaign title or description…"
                    className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                <button
                    onClick={() => setKeyword(inputKeyword)}
                    className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-500 transition-colors"
                >
                    Search
                </button>
                <button onClick={() => { setKeyword(''); setInputKeyword(''); load(filterStatus, ''); }}
                    className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <RefreshCw size={15} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
                    <AlertCircle size={15} />{error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 size={28} className="text-purple-300 animate-spin" /></div>
            ) : campaigns.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">No campaigns found</div>
            ) : (
                <div className="space-y-3">
                    {campaigns.map(c => (
                        <CampaignAdminRow key={c.id} campaign={c} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── User Management Panel ───────────────────────────────────────────────────

const ROLE_META = {
    ADMIN:     { label: 'Administrator',      bg: 'bg-purple-100', text: 'text-purple-700' },
    INITIATOR: { label: 'Campaign Creator',   bg: 'bg-emerald-100', text: 'text-emerald-700' },
    PARTNER:   { label: 'Third-party Auditor',bg: 'bg-blue-100',   text: 'text-blue-700' },
    USER:      { label: 'Donor',              bg: 'bg-gray-100',   text: 'text-gray-600' },
};

function RoleBadge({ role }) {
    const m = ROLE_META[role] || ROLE_META.USER;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
            {m.label}
        </span>
    );
}

function UserRow({ user }) {
    const [expanded, setExpanded] = useState(false);
    const [activity, setActivity] = useState(null);
    const [loading, setLoading] = useState(false);
    const [enabled, setEnabled] = useState(user.enabled);
    const [toggling, setToggling] = useState(false);

    const loadActivity = async () => {
        if (activity) { setExpanded(!expanded); return; }
        setExpanded(true);
        setLoading(true);
        try {
            const data = await adminAPI.getUserActivity(user.id);
            setActivity(data);
        } catch (e) {
            setActivity({ error: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (e) => {
        e.stopPropagation();
        setToggling(true);
        try {
            await adminAPI.toggleUserEnabled(user.id);
            setEnabled(prev => !prev);
        } finally {
            setToggling(false);
        }
    };

    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={loadActivity}
            >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {user.avatarUrl
                        ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        : <Users size={16} className="text-gray-400" />
                    }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{user.displayName || '—'}</p>
                        <RoleBadge role={user.role} />
                        {!enabled && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">Disabled</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>

                {/* Stats */}
                <div className="hidden md:flex items-center gap-6 text-xs text-gray-500 shrink-0">
                    <span>{user.campaignCount} campaign{user.campaignCount !== 1 ? 's' : ''}</span>
                    <span>{user.donationCount} donation{user.donationCount !== 1 ? 's' : ''}</span>
                    <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}</span>
                </div>

                {/* Toggle + chevron */}
                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    {user.role !== 'ADMIN' && (
                        <button
                            onClick={handleToggle}
                            disabled={toggling}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                                enabled
                                    ? 'border border-red-200 text-red-500 hover:bg-red-50'
                                    : 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                        >
                            {toggling ? '…' : enabled ? 'Disable' : 'Enable'}
                        </button>
                    )}
                    <div onClick={loadActivity}>
                        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                </div>
            </div>

            {/* Activity drawer */}
            {expanded && (
                <div className="border-t border-gray-50 px-5 pb-5">
                    {loading ? (
                        <div className="flex justify-center py-6"><Loader2 size={20} className="text-gray-300 animate-spin" /></div>
                    ) : activity?.error ? (
                        <p className="text-sm text-red-500 py-4">{activity.error}</p>
                    ) : activity && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                            {/* Campaigns */}
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    Campaigns Created ({activity.campaigns?.length || 0})
                                </p>
                                {activity.campaigns?.length === 0 ? (
                                    <p className="text-xs text-gray-400">No campaigns</p>
                                ) : (
                                    <div className="space-y-2">
                                        {activity.campaigns?.map(c => (
                                            <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-medium text-gray-800 truncate">{c.title}</p>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                                        c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                                                        c.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-200 text-gray-600'
                                                    }`}>{c.status}</span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    €{Number(c.currentAmount).toFixed(0)} / €{Number(c.goalAmount).toFixed(0)} · {c.category}
                                                    {c.onChain && <span className="ml-1.5 text-emerald-500">⛓</span>}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Donations */}
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    Donations Made ({activity.donations?.length || 0})
                                </p>
                                {activity.donations?.length === 0 ? (
                                    <p className="text-xs text-gray-400">No donations</p>
                                ) : (
                                    <div className="space-y-2">
                                        {activity.donations?.map(d => (
                                            <div key={d.id} className="bg-gray-50 rounded-lg px-3 py-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-medium text-gray-800 truncate">{d.campaignTitle}</p>
                                                    <span className="text-sm font-bold text-emerald-600 shrink-0">€{Number(d.amount).toFixed(0)}</span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {d.anonymous ? 'Anonymous' : d.displayName} · {d.date ? new Date(d.date).toLocaleDateString() : ''}
                                                    {d.onChain && <span className="ml-1.5 text-emerald-500">⛓</span>}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function UserManagementPanel() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await adminAPI.getAllUsers();
            setUsers(data);
        } catch (e) {
            setError(e.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = users.filter(u => {
        const matchSearch = !search ||
            u.email?.toLowerCase().includes(search.toLowerCase()) ||
            u.displayName?.toLowerCase().includes(search.toLowerCase());
        const matchRole = !filterRole || u.role === filterRole;
        return matchSearch && matchRole;
    });

    const roleCounts = Object.fromEntries(
        Object.keys(ROLE_META).map(r => [r, users.filter(u => u.role === r).length])
    );

    return (
        <div>
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {Object.entries(ROLE_META).map(([role, meta]) => (
                    <button
                        key={role}
                        onClick={() => setFilterRole(filterRole === role ? '' : role)}
                        className={`rounded-xl p-4 text-left border transition-all ${
                            filterRole === role
                                ? `${meta.bg} border-current ${meta.text}`
                                : 'bg-white border-gray-100 hover:border-gray-200'
                        }`}
                    >
                        <p className="text-2xl font-bold text-gray-900">{roleCounts[role] || 0}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{meta.label}</p>
                    </button>
                ))}
            </div>

            {/* Search & filter bar */}
            <div className="flex gap-3 mb-5">
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                <button onClick={load} className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <RefreshCw size={15} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
                    <AlertCircle size={15} />{error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 size={28} className="text-purple-300 animate-spin" /></div>
            ) : (
                <div className="space-y-2">
                    {filtered.length === 0 ? (
                        <p className="text-center py-12 text-gray-400 text-sm">No users found</p>
                    ) : (
                        filtered.map(u => <UserRow key={u.id} user={u} />)
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Blockchain Panel ────────────────────────────────────────────────────────

function BlockchainPanel() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [queryType, setQueryType] = useState('campaign');
    const [queryInput, setQueryInput] = useState('');
    const [queryLoading, setQueryLoading] = useState(false);
    const [queryResult, setQueryResult] = useState(null);
    const [queryError, setQueryError] = useState('');

    const [transactions, setTransactions] = useState([]);
    const [txLoading, setTxLoading] = useState(false);
    const [txLoaded, setTxLoaded] = useState(false);
    const [expandedTx, setExpandedTx] = useState(null);
    const [showTx, setShowTx] = useState(false);

    const [blockQuery, setBlockQuery] = useState('');
    const [blockResult, setBlockResult] = useState(null);
    const [blockLoading, setBlockLoading] = useState(false);

    const truncate = (str, n = 20) => str && str.length > n ? str.slice(0, n) + '…' : (str || '—');

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const s = await adminAPI.getBlockchainStats();
                setStats(s);
            } catch (e) {
                setError(e.message || 'Failed to load stats');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleQuery = async () => {
        if (!queryInput.trim()) return;
        setQueryLoading(true);
        setQueryResult(null);
        setQueryError('');
        try {
            let data;
            if (queryType === 'campaign') {
                const { blockchainAPI } = await import('@/utils/api');
                data = await blockchainAPI.searchByTxId(queryInput.trim());
            } else if (queryType === 'donation') {
                const { blockchainAPI } = await import('@/utils/api');
                data = await blockchainAPI.searchDonation(queryInput.trim());
            } else {
                data = await adminAPI.getBlock(parseInt(queryInput.trim()));
            }
            setQueryResult(data);
        } catch (e) {
            setQueryError(e.message || 'Query failed');
        } finally {
            setQueryLoading(false);
        }
    };

    const loadTransactions = async () => {
        setTxLoading(true);
        try {
            const data = await adminAPI.getBlockchainTransactions();
            setTransactions(data);
            setTxLoaded(true);
        } catch (e) {
            setError(e.message || 'Failed to load transactions');
        } finally {
            setTxLoading(false);
        }
    };

    const handleBlockQuery = async () => {
        if (!blockQuery) return;
        setBlockLoading(true);
        setBlockResult(null);
        try {
            const data = await adminAPI.getBlock(parseInt(blockQuery));
            setBlockResult(data);
        } catch (e) {
            setBlockResult({ error: e.message });
        } finally {
            setBlockLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Status bar */}
            {loading ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 size={24} className="text-emerald-400 animate-spin" />
                </div>
            ) : error && !stats ? (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    <AlertCircle size={15} />{error}
                </div>
            ) : stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Block Height', value: stats.blockHeight >= 0 ? stats.blockHeight : 'N/A', icon: <Database size={18} className="text-emerald-600" />, bg: 'bg-emerald-50' },
                        { label: 'Campaigns On-chain', value: stats.totalCampaignsOnChain, icon: <Shield size={18} className="text-blue-600" />, bg: 'bg-blue-50' },
                        { label: 'Donations On-chain', value: stats.totalDonationsOnChain, icon: <Link2 size={18} className="text-purple-600" />, bg: 'bg-purple-50' },
                        { label: 'Network', value: stats.fabricEnabled ? 'Connected' : 'Offline', icon: <Activity size={18} className={stats.fabricEnabled ? 'text-emerald-600' : 'text-red-500'} />, bg: stats.fabricEnabled ? 'bg-emerald-50' : 'bg-red-50' },
                    ].map(c => (
                        <div key={c.label} className="bg-white border border-gray-100 rounded-xl p-4">
                            <div className={`${c.bg} p-2 rounded-lg inline-flex mb-2`}>{c.icon}</div>
                            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* On-chain data query */}
            <div className="bg-white border border-gray-100 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Hash size={15} className="text-gray-400" />Query On-chain Data
                </h3>
                <div className="flex gap-2 flex-wrap">
                    <select
                        value={queryType}
                        onChange={e => { setQueryType(e.target.value); setQueryResult(null); setQueryError(''); }}
                        className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                    >
                        <option value="campaign">Campaign (BC Certificate ID)</option>
                        <option value="donation">Donation (BD Certificate ID)</option>
                        <option value="block">Block (Number)</option>
                    </select>
                    <input
                        value={queryInput}
                        onChange={e => setQueryInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleQuery()}
                        placeholder={queryType === 'campaign' ? 'BC...' : queryType === 'donation' ? 'BD...' : 'Block number'}
                        className="flex-1 min-w-[200px] px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                    <button
                        onClick={handleQuery}
                        disabled={queryLoading || !queryInput.trim()}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        {queryLoading ? <Loader2 size={15} className="animate-spin" /> : <ArrowUpRight size={15} />}
                        Query
                    </button>
                </div>

                {queryError && (
                    <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle size={15} />{queryError}
                    </div>
                )}

                {queryResult && (
                    <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                        {queryResult.error ? (
                            <div className="flex items-center gap-2 text-red-600"><AlertCircle size={15} />{queryResult.error}</div>
                        ) : queryResult.verificationMessage ? (
                            <>
                                <div className="flex items-center gap-2 mb-3">
                                    {queryResult.verified
                                        ? <CheckCircle size={16} className="text-emerald-600" />
                                        : <XCircle size={16} className="text-red-500" />
                                    }
                                    <span className={`text-sm font-medium ${queryResult.verified ? 'text-emerald-700' : 'text-red-600'}`}>
                                        {queryResult.verificationMessage}
                                    </span>
                                </div>
                                {Object.entries(queryResult)
                                    .filter(([k]) => !['verified', 'verificationMessage', 'error'].includes(k) && queryResult[k] != null && queryResult[k] !== '')
                                    .map(([k, v]) => (
                                    <div key={k} className="flex items-start gap-3">
                                        <span className="text-gray-400 w-36 shrink-0 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                        <code className="font-mono text-gray-800 break-all text-xs">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</code>
                                    </div>
                                ))}
                            </>
                        ) : queryResult.found !== undefined ? (
                            <>
                                <div className="flex items-center gap-2 mb-3">
                                    {queryResult.found
                                        ? <CheckCircle size={16} className="text-emerald-600" />
                                        : <XCircle size={16} className="text-red-500" />
                                    }
                                    <span className={`text-sm font-medium ${queryResult.found ? 'text-emerald-700' : 'text-red-600'}`}>
                                        {queryResult.message}
                                    </span>
                                </div>
                                {queryResult.found && Object.entries(queryResult)
                                    .filter(([k]) => !['found', 'message'].includes(k) && queryResult[k] != null)
                                    .map(([k, v]) => (
                                    <div key={k} className="flex items-start gap-3">
                                        <span className="text-gray-400 w-36 shrink-0 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                        <code className="font-mono text-gray-800 break-all text-xs">{String(v)}</code>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <>
                                <h4 className="font-semibold text-gray-700 mb-3">Block #{queryResult.blockNumber}</h4>
                                {Object.entries(queryResult).map(([k, v]) => (
                                    <div key={k} className="flex items-start gap-3">
                                        <span className="text-gray-400 w-32 shrink-0 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                        <code className="font-mono text-gray-800 break-all text-xs">{String(v)}</code>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Block query */}
            <div className="bg-white border border-gray-100 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Database size={15} className="text-gray-400" />Query Block by Number
                </h3>
                <div className="flex gap-2">
                    <input
                        type="number"
                        min={0}
                        value={blockQuery}
                        onChange={e => setBlockQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleBlockQuery()}
                        placeholder="Block number (e.g. 0)"
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                    <button
                        onClick={handleBlockQuery}
                        disabled={blockLoading || !blockQuery}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        {blockLoading ? <Loader2 size={15} className="animate-spin" /> : <ArrowUpRight size={15} />}
                        Query
                    </button>
                </div>
                {blockResult && (
                    <div className="mt-4 bg-gray-50 rounded-xl p-4 text-sm">
                        {blockResult.error ? (
                            <div className="flex items-center gap-2 text-red-600"><AlertCircle size={15} />{blockResult.error}</div>
                        ) : (
                            <div className="space-y-2">
                                <h4 className="font-semibold text-gray-700 mb-3">Block #{blockResult.blockNumber}</h4>
                                {Object.entries(blockResult).map(([k, v]) => (
                                    <div key={k} className="flex items-start gap-3">
                                        <span className="text-gray-400 w-32 shrink-0 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                        <code className="font-mono text-gray-800 break-all text-xs">{String(v)}</code>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Transaction history (collapsible) */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <button
                    onClick={() => { setShowTx(!showTx); if (!txLoaded) loadTransactions(); }}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Link2 size={15} className="text-gray-400" />
                        On-chain Transactions {txLoaded ? `(${transactions.length})` : ''}
                    </h3>
                    {showTx ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>
                {showTx && (
                    <div className="border-t border-gray-50">
                        {txLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 size={20} className="text-emerald-400 animate-spin" />
                            </div>
                        ) : transactions.length === 0 ? (
                            <p className="text-center py-8 text-gray-400 text-sm">No on-chain transactions yet</p>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {transactions.map((tx, i) => (
                                    <div key={i}>
                                        <button
                                            onClick={() => setExpandedTx(expandedTx === i ? null : i)}
                                            className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                                        >
                                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                                tx.type === 'CREATE_CAMPAIGN' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                            }`}>{tx.type === 'CREATE_CAMPAIGN' ? 'CAMPAIGN' : 'DONATION'}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-800 truncate">{tx.summary}</p>
                                                <code className="text-[10px] font-mono text-gray-400">{truncate(tx.txId, 36)}</code>
                                            </div>
                                            <div className="text-right shrink-0">
                                                {tx.amount && <p className="text-sm font-semibold text-emerald-600">€{tx.amount}</p>}
                                                <p className="text-[10px] text-gray-400">{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : ''}</p>
                                            </div>
                                        </button>
                                        {expandedTx === i && (
                                            <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100 text-xs space-y-1.5">
                                                <div className="flex gap-2 pt-3"><span className="text-gray-400 w-24">Tx ID</span><code className="font-mono text-gray-700 break-all">{tx.txId}</code></div>
                                                <div className="flex gap-2"><span className="text-gray-400 w-24">Entity</span><code className="font-mono text-gray-700">{tx.entityId}</code></div>
                                                <div className="flex gap-2"><span className="text-gray-400 w-24">Channel</span><span className="text-gray-700">{tx.channel}</span></div>
                                                <div className="flex gap-2"><span className="text-gray-400 w-24">Chaincode</span><span className="text-gray-700">{tx.chaincode}</span></div>
                                                <div className="flex gap-2"><span className="text-gray-400 w-24">Time</span><span className="text-gray-700">{tx.timestamp}</span></div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Admin Panel ─────────────────────────────────────────────────────────

const MAIN_TABS = [
    { id: 'dashboard',   label: 'Dashboard',            icon: <LayoutDashboard size={15} /> },
    { id: 'partners',    label: 'Partner Applications', icon: <Users size={15} /> },
    { id: 'campaigns',   label: 'Campaigns',            icon: <FileText size={15} /> },
    { id: 'fund',        label: 'Fund Flow',            icon: <ArrowUpRight size={15} /> },
    { id: 'users',       label: 'Users',                icon: <Database size={15} /> },
    { id: 'blockchain',  label: 'Blockchain Panel',     icon: <Link2 size={15} /> },
];

export default function AdminPanel() {
    const [mainTab, setMainTab] = useState('dashboard');
    const [applications, setApplications] = useState([]);
    const [activeTab, setActiveTab] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchApplications = async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await adminAPI.getPartnerApplications(activeTab || undefined);
            setApplications(data);
        } catch (err) {
            setError(err.message || 'Failed to load applications');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (mainTab === 'partners') fetchApplications();
    }, [activeTab, mainTab]);

    const handleApprove = async (id) => {
        const result = await adminAPI.approvePartnerApplication(id, null);
        setApplications((prev) =>
            prev.map((a) => (a.id === id ? { ...a, status: 'APPROVED' } : a))
        );
        return result;
    };

    const handleReject = async (id, reason) => {
        await adminAPI.rejectPartnerApplication(id, reason);
        setApplications((prev) =>
            prev.map((a) => (a.id === id ? { ...a, status: 'REJECTED', rejectionReason: reason } : a))
        );
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-10 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="bg-purple-100 p-2.5 rounded-xl">
                        <LayoutDashboard className="text-purple-600" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                        <p className="text-sm text-gray-500">System management & blockchain monitoring</p>
                    </div>
                </div>

                {/* Main tabs */}
                <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 mb-8 w-fit">
                    {MAIN_TABS.map(tab => (
                        <button key={tab.id} onClick={() => setMainTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                mainTab === tab.id ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                            }`}>
                            {tab.icon}{tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Partner Applications ── */}
                {mainTab === 'partners' && (
                    <>
                        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 mb-6 w-fit">
                            {STATUS_TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        activeTab === tab.id ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {tab.label}
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                        activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {tab.id === '' ? applications.length : applications.filter(a => a.status === tab.id).length}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-6">
                                <AlertCircle size={18} /><span>{error}</span>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 size={32} className="text-purple-400 animate-spin" />
                            </div>
                        ) : applications.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="bg-gray-100 p-4 rounded-full inline-flex mb-4">
                                    <Eye size={28} className="text-gray-400" />
                                </div>
                                <p className="text-gray-500 font-medium">No applications found</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {applications.map((app) => (
                                    <ApplicationRow key={app.id} app={app} onApprove={handleApprove} onReject={handleReject} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ── Dashboard ── */}
                {mainTab === 'dashboard' && <DashboardPanel />}

                {/* ── Campaigns ── */}
                {mainTab === 'campaigns' && <CampaignManagementPanel />}

                {/* ── Fund Flow ── */}
                {mainTab === 'fund' && <FundFlowPanel />}

                {/* ── User Management ── */}
                {mainTab === 'users' && <UserManagementPanel />}

                {/* ── Blockchain Panel ── */}
                {mainTab === 'blockchain' && <BlockchainPanel />}
            </div>
        </div>
    );
}
