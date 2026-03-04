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

export default function AdminPanel() {
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
        fetchApplications();
    }, [activeTab]);

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

    const counts = {
        '': applications.length,
        PENDING: applications.filter((a) => a.status === 'PENDING').length,
        APPROVED: applications.filter((a) => a.status === 'APPROVED').length,
        REJECTED: applications.filter((a) => a.status === 'REJECTED').length,
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-10 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="bg-purple-100 p-2.5 rounded-xl">
                        <LayoutDashboard className="text-purple-600" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                        <p className="text-sm text-gray-500">Manage partner applications</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 mb-6 w-fit">
                    {STATUS_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {tab.label}
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                            }`}>
                                {activeTab === tab.id ? (applications.length) : (
                                    tab.id === '' ? applications.length :
                                    applications.filter((a) => a.status === tab.id).length
                                )}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                {error && (
                    <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-6">
                        <AlertCircle size={18} />
                        <span>{error}</span>
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
                            <ApplicationRow
                                key={app.id}
                                app={app}
                                onApprove={handleApprove}
                                onReject={handleReject}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
