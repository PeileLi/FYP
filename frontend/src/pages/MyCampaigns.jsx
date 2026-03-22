import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Folders,
  Plus,
  TrendingUp,
  Eye,
  AlertCircle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check
} from 'lucide-react';
import { campaignAPI } from '../utils/api';
import { formatAmount, getProgress } from '@/utils/format';
import { getStatusClasses } from '@/utils/constants';

export default function MyCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, pending, completed

  useEffect(() => {
    fetchMyCampaigns();
  }, []);

  const fetchMyCampaigns = async () => {
    try {
      setIsLoading(true);
      const data = await campaignAPI.getMyCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const [copiedId, setCopiedId] = useState(null);

  const handleRequestUnfreeze = async (campaignId) => {
    try {
      await campaignAPI.requestUnfreeze(campaignId);
      fetchMyCampaigns();
    } catch (error) {
      alert(error.message || 'Failed to request unfreeze');
    }
  };

  const getVerificationBadge = (status) => {
    switch (status) {
      case 'VERIFIED':
        return { icon: ShieldCheck, color: 'text-green-600 bg-green-50 border-green-200', label: 'Verified' };
      case 'TAMPERED':
        return { icon: ShieldAlert, color: 'text-red-600 bg-red-50 border-red-200', label: 'Tampered' };
      case 'NOT_RECORDED':
        return { icon: Shield, color: 'text-gray-400 bg-gray-50 border-gray-200', label: 'Not Recorded' };
      default:
        return { icon: Shield, color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: status || 'Unknown' };
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {});
  };

  const truncateTxId = (txId) => {
    if (!txId) return null;
    if (txId.length <= 20) return txId;
    return txId.slice(0, 10) + '...' + txId.slice(-8);
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (filter === 'all') return true;
    return campaign.status === filter.toUpperCase();
  });

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'ACTIVE').length,
    pending: campaigns.filter(c => c.status === 'PENDING').length,
    completed: campaigns.filter(c => c.status === 'COMPLETED').length,
    totalRaised: campaigns.reduce((sum, c) => sum + parseFloat(c.currentAmount || 0), 0)
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-500">Loading your campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Campaigns</h1>
              <p className="text-gray-500">Manage and track your fundraising campaigns</p>
            </div>
            <button
              onClick={() => navigate('/create-campaign')}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-200"
            >
              <Plus size={20} />
              Create New Campaign
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Campaigns</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Folders className="text-emerald-600" size={24} />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Completed</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
                </div>
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Raised</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatAmount(stats.totalRaised)}</p>
                </div>
                <TrendingUp className="text-emerald-600" size={24} />
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {['all', 'active', 'pending', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filter === status
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Campaigns List */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {filteredCampaigns.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <Folders className="mx-auto text-gray-300 mb-4" size={64} />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No campaigns found</h3>
            <p className="text-gray-500 mb-6">
              {filter === 'all'
                ? "You haven't created any campaigns yet. Start making a difference today!"
                : `No ${filter} campaigns found.`}
            </p>
            <button
              onClick={() => navigate('/create-campaign')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-500 transition-colors"
            >
              <Plus size={20} />
              Create Your First Campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => {
              const progress = getProgress(campaign.currentAmount, campaign.goalAmount);

              return (
                <div
                  key={campaign.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={campaign.imageUrl}
                      alt={campaign.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23e5e7eb' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='16' x='200' y='150' text-anchor='middle' dy='.35em'%3ECampaign%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold border ${getStatusClasses(campaign.status)}`}>
                      {campaign.status}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                      {campaign.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {campaign.description}
                    </p>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-sm font-medium mb-1.5">
                        <span className="text-emerald-600">{formatAmount(campaign.currentAmount)}</span>
                        <span className="text-gray-400">of {formatAmount(campaign.goalAmount)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{progress.toFixed(1)}% funded</p>
                    </div>

                    {/* Blockchain Info */}
                    <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      {/* Verification Status */}
                      {(() => {
                        const badge = getVerificationBadge(campaign.verificationStatus);
                        const Icon = badge.icon;
                        return (
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${badge.color} mb-2`}>
                            <Icon size={13} />
                            {badge.label}
                          </div>
                        );
                      })()}

                      {/* Blockchain TxId */}
                      {campaign.blockchainTxId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 shrink-0">TxID:</span>
                          <code className="text-xs text-gray-600 font-mono truncate flex-1" title={campaign.blockchainTxId}>
                            {truncateTxId(campaign.blockchainTxId)}
                          </code>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(campaign.blockchainTxId, campaign.id);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors shrink-0"
                            title="Copy full TxID"
                          >
                            {copiedId === campaign.id ? (
                              <Check size={13} className="text-green-500" />
                            ) : (
                              <Copy size={13} className="text-gray-400" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No blockchain record</p>
                      )}

                      
                    </div>

                    {/* Freeze / REQUIRES_INFO notice */}
                    {campaign.status === 'FROZEN' && (
                      <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <p className="text-xs text-indigo-700 font-semibold mb-1">Campaign Frozen</p>
                        {campaign.freezeReason && <p className="text-xs text-indigo-600 mb-2">{campaign.freezeReason}</p>}
                        {!campaign.unfreezeRequested ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRequestUnfreeze(campaign.id); }}
                            className="text-xs font-medium px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                          >
                            Request Unfreeze
                          </button>
                        ) : (
                          <span className="text-xs text-indigo-500 italic">Unfreeze requested — awaiting partner review</span>
                        )}
                      </div>
                    )}
                    {campaign.auditStatus === 'REQUIRES_INFO' && (
                      <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-700 font-semibold">Auditor requires additional information</p>
                        <p className="text-xs text-amber-600 mt-1">Please provide supplementary materials for the audit.</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/campaigns/${campaign.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg font-medium hover:bg-emerald-100 transition-colors text-sm"
                      >
                        <Eye size={16} />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
