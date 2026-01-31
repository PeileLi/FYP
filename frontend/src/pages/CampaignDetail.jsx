import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Euro,
  Users,
  Calendar,
  Heart,
  Share2,
  AlertCircle,
  Shield,
  Copy,
  CheckCircle
} from 'lucide-react';
import { campaignAPI, donationAPI, blockchainAPI, getUser } from '../utils/api';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [donations, setDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [donateAmount, setDonateAmount] = useState('');
  const [displayType, setDisplayType] = useState('default'); // 'default', 'custom', 'anonymous'
  const [customDisplayName, setCustomDisplayName] = useState('');
  const [isDonating, setIsDonating] = useState(false);
  const [error, setError] = useState('');
  const user = getUser();

  useEffect(() => {
    fetchCampaignData();
  }, [id]);

  const fetchCampaignData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Check if id looks like a blockchain transaction ID (starts with BC_)
      if (id && id.startsWith('BC_')) {
        console.log('Detected blockchain certificate ID, querying database:', id);
        // Query database by blockchain transaction ID
        // Blockchain is only used for evidence storage, not for data recovery
        try {
          const campaignData = await campaignAPI.getByTxId(id);
          console.log('Campaign data received:', campaignData);

          if (!campaignData || !campaignData.id) {
            throw new Error('Campaign not found in database with this blockchain certificate ID');
          }

          setCampaign(campaignData);

          // Update URL to use database ID instead of blockchain TxId for better UX
          if (campaignData.id && campaignData.id.toString() !== id) {
            console.log('Updating URL from', id, 'to', campaignData.id);
            navigate(`/campaigns/${campaignData.id}`, { replace: true });
          }

          // Get donations
          try {
            const donationsData = await donationAPI.getCampaignDonations(campaignData.id);
            setDonations(donationsData);
          } catch (donationError) {
            console.warn('Failed to fetch donations:', donationError);
            setDonations([]);
          }
        } catch (queryError) {
          console.error('Error querying campaign by blockchain certificate ID:', queryError);
          throw new Error(queryError.message || 'Campaign not found in database. Blockchain is only used for evidence storage.');
        }
      } else {
        // Normal ID-based lookup
        const [campaignData, donationsData] = await Promise.all([
          campaignAPI.getById(id),
          donationAPI.getCampaignDonations(id)
        ]);
        setCampaign(campaignData);
        setDonations(donationsData);
      }
    } catch (error) {
      console.error('Failed to fetch campaign:', error);
      setError(error.message || 'Failed to load campaign');
    } finally {
      setIsLoading(false);
    }
  };

  const getRemainingAmount = () => {
    if (!campaign) return 0;
    return Math.max(campaign.goalAmount - campaign.currentAmount, 0);
  };

  const handleDonateClick = () => {
    if (!user) {
      setShowLoginPrompt(true);
    } else {
      setShowDonateModal(true);
    }
  };

  const handleAmountChange = (value) => {
    const amount = parseFloat(value);
    const remaining = getRemainingAmount();

    // If the input amount exceeds remaining, set it to remaining
    if (!isNaN(amount) && amount > remaining) {
      setDonateAmount(remaining.toString());
    } else {
      setDonateAmount(value);
    }
  };

  const handleDonate = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setError('');
    setIsDonating(true);

    try {
      const amount = parseFloat(donateAmount);
      const remaining = getRemainingAmount();

      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid amount');
        setIsDonating(false);
        return;
      }

      if (amount > remaining) {
        setError(`Amount cannot exceed remaining goal of €${remaining.toFixed(2)}`);
        setIsDonating(false);
        return;
      }

      // Validate custom display name if custom type is selected
      if (displayType === 'custom' && (!customDisplayName || customDisplayName.trim() === '')) {
        setError('Please enter a display name');
        setIsDonating(false);
        return;
      }

      await donationAPI.create({
        campaignId: parseInt(id),
        amount: amount,
        displayType: displayType,
        customDisplayName: customDisplayName.trim()
      });

      // Refresh campaign data
      await fetchCampaignData();

      // Reset form and close modal
      setDonateAmount('');
      setDisplayType('default');
      setCustomDisplayName('');
      setShowDonateModal(false);

      alert('Thank you for your donation!');
    } catch (err) {
      setError(err.message || 'Failed to process donation');
    } finally {
      setIsDonating(false);
    }
  };

  const getProgress = () => {
    if (!campaign) return 0;
    return Math.min((campaign.currentAmount / campaign.goalAmount) * 100, 100);
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-500">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error && !campaign) {
    const isBlockchainId = id && id.startsWith('BC_');

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Campaign Not Found
          </h2>
          <p className="text-gray-500 mb-4">{error}</p>

          {isBlockchainId && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-left">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Note:</strong>
              </p>
              <p className="text-sm text-blue-700 mb-2">
                This campaign was accessed using a blockchain certificate ID, but it was not found in the database.
              </p>
              <p className="text-sm text-blue-700 mb-2">
                Blockchain is used only for evidence storage. To view blockchain evidence, use the Blockchain Search page.
              </p>
              <p className="text-xs text-blue-600 mt-3 font-mono break-all">
                Certificate ID: {id}
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-500 transition-colors"
            >
              Back to Home
            </button>
            {isBlockchainId && (
              <button
                onClick={() => navigate('/blockchain-search')}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-colors"
              >
                Blockchain Search
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Image */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <img
                src={campaign.imageUrl}
                alt={campaign.title}
                className="w-full h-96 object-cover"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/800x400?text=Campaign+Image';
                }}
              />
            </div>

            {/* Campaign Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {campaign.category.replace('_', ' ')}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {campaign.title}
              </h1>

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                <span className="flex items-center gap-1">
                  <Users size={16} />
                  by {campaign.organizerName}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={16} />
                  {formatDate(campaign.createdAt)}
                </span>
              </div>

              <div className="prose max-w-none">
                <h2 className="text-xl font-semibold mb-3">About this campaign</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{campaign.description}</p>
              </div>
            </div>

            {/* Recent Donations */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl font-semibold mb-4">
                Recent Donations ({donations.length})
              </h2>
              {donations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No donations yet. Be the first to contribute!</p>
              ) : (
                <div className="space-y-4">
                  {donations.slice(0, 10).map((donation) => (
                    <div key={donation.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                      <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Heart size={20} className="text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-gray-900">
                            {donation.displayName || donation.donorName || '匿名'}
                          </p>
                          <span className="font-bold text-emerald-600">{formatAmount(donation.amount)}</span>
                        </div>
                        {donation.message && (
                          <p className="text-sm text-gray-600 italic">"{donation.message}"</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{formatDate(donation.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-4">
              {/* Amount Info */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-3xl font-bold text-gray-900">
                    {formatAmount(campaign.currentAmount)}
                  </p>
                  {campaign.verificationStatus === 'VERIFIED' && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold" title="Data verified with blockchain">
                      <CheckCircle size={14} />
                      <span>Verified</span>
                    </div>
                  )}
                  {campaign.verificationStatus === 'TAMPERED' && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold" title="Warning: Data tampering detected">
                      <AlertCircle size={14} />
                      <span>Tampered</span>
                    </div>
                  )}
                </div>

                {/* Show blockchain amount if tampering detected */}
                {campaign.verificationStatus === 'TAMPERED' && campaign.blockchainAmount !== null && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-800 font-semibold mb-1">
                      ⚠️ Data Mismatch Detected
                    </p>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-red-700">Database shows:</span>
                        <span className="font-semibold text-red-900">{formatAmount(campaign.currentAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Blockchain record:</span>
                        <span className="font-semibold text-green-900">{formatAmount(campaign.blockchainAmount)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-red-600 mt-2">
                      The blockchain record is the authoritative source. This campaign's data may have been tampered with.
                    </p>
                  </div>
                )}

                {/* Show tampering history warning even if current data matches */}
                {campaign.verificationStatus === 'VERIFIED' && campaign.hasTamperingHistory && (
                  <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                    <p className="text-sm text-orange-800 font-semibold mb-1">
                      ⚠️ Tampering History Detected
                    </p>
                    <p className="text-xs text-orange-700">
                      This campaign has been tampered with {campaign.tamperingIncidentCount} time(s) in the past.
                      Current data now matches blockchain, but previous unauthorized modifications were detected and logged.
                    </p>
                    <p className="text-xs text-orange-600 mt-1 italic">
                      Even if data is corrected, the audit trail is permanent.
                    </p>
                  </div>
                )}

                <p className="text-gray-600 mb-4">
                  raised of {formatAmount(campaign.goalAmount)} goal
                </p>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${getProgress()}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  {getProgress().toFixed(1)}% funded
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900">{donations.length}</p>
                  <p className="text-sm text-gray-600">Donors</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900">
                    {campaign.status === 'COMPLETED' ? 'Completed' : 'Active'}
                  </p>
                  <p className="text-sm text-gray-600">Status</p>
                </div>
              </div>

              {/* Blockchain Certificate */}
              <div className={`mb-6 p-4 rounded-xl ${campaign.blockchainTxId
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-gray-50 border border-gray-200'
                }`}>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className={campaign.blockchainTxId ? 'text-blue-600' : 'text-gray-400'} size={20} />
                  <h3 className={`font-semibold ${campaign.blockchainTxId ? 'text-blue-900' : 'text-gray-600'}`}>
                    {campaign.blockchainTxId ? 'Blockchain Verified' : 'Blockchain Certificate'}
                  </h3>
                </div>

                {campaign.blockchainTxId ? (
                  <>
                    <p className="text-xs text-blue-700 mb-2">Blockchain Certificate ID:</p>
                    <div className="flex items-start gap-2">
                      <code className="text-xs font-mono text-blue-900 bg-white px-2 py-1 rounded border border-blue-200 flex-1 break-all cursor-text">
                        {campaign.blockchainTxId}
                      </code>
                      <div className="flex-shrink-0">
                        <BlockchainCopyButton text={campaign.blockchainTxId} />
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/blockchain-search')}
                      className="mt-3 w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100 transition-colors rounded-lg"
                    >
                      Verify on Blockchain →
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-600 mb-2">
                      This campaign is not recorded on the blockchain.
                    </p>
                    <button
                      onClick={() => navigate('/blockchain-search')}
                      className="mt-3 w-full py-2 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-100 transition-colors rounded-lg"
                    >
                      More about Blockchain Verification →
                    </button>
                  </>
                )}
              </div>

              {/* Donate Button */}
              {campaign.status === 'ACTIVE' && (
                <button
                  onClick={handleDonateClick}
                  className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-200 mb-4"
                >
                  Donate Now
                </button>
              )}

              {/* Share Button */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }}
                className="w-full py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Share2 size={20} />
                Share Campaign
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Donate Modal */}
      {showDonateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Make a Donation</h2>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (€)
                </label>
                <div className="mb-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Euro className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      value={donateAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      onWheel={(e) => e.target.blur()}
                      min="1"
                      max={getRemainingAmount()}
                      step="0.01"
                      placeholder="0.00"
                      className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-transparent transition-all"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Remaining goal: €{getRemainingAmount().toFixed(2)}
                  </p>
                </div>

                {/* Slider */}
                <div className="px-1">
                  <input
                    type="range"
                    min="1"
                    max={getRemainingAmount()}
                    step="1"
                    value={donateAmount || 0}
                    onChange={(e) => setDonateAmount(e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 slider"
                    style={{
                      background: `linear-gradient(to right, rgb(16 185 129) 0%, rgb(16 185 129) ${(donateAmount / getRemainingAmount()) * 100}%, rgb(229 231 235) ${(donateAmount / getRemainingAmount()) * 100}%, rgb(229 231 235) 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>€1</span>
                    <span>€{getRemainingAmount().toFixed(0)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <div className="space-y-2">
                  {/* Default - use user's display name */}
                  <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="displayType"
                      value="default"
                      checked={displayType === 'default'}
                      onChange={(e) => setDisplayType(e.target.value)}
                      className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 focus:ring-emerald-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">
                        Use my name
                      </span>
                      <p className="text-xs text-gray-500">
                        Display as "{user?.displayName || 'Your Name'}"
                      </p>
                    </div>
                  </label>

                  {/* Custom - user input display name */}
                  <label className="flex items-start gap-2 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="displayType"
                      value="custom"
                      checked={displayType === 'custom'}
                      onChange={(e) => setDisplayType(e.target.value)}
                      className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 focus:ring-emerald-500 focus:ring-2 mt-0.5"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">
                        Custom display name
                      </span>
                      <p className="text-xs text-gray-500 mb-2">
                        Choose a custom name to display
                      </p>
                      {displayType === 'custom' && (
                        <input
                          type="text"
                          value={customDisplayName}
                          onChange={(e) => setCustomDisplayName(e.target.value)}
                          placeholder="Enter display name"
                          maxLength="50"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      )}
                    </div>
                  </label>

                  {/* Anonymous */}
                  <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="displayType"
                      value="anonymous"
                      checked={displayType === 'anonymous'}
                      onChange={(e) => setDisplayType(e.target.value)}
                      className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 focus:ring-emerald-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">
                        Donate anonymously
                      </span>
                      <p className="text-xs text-gray-500">
                        Your name will not be displayed
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDonateModal(false);
                  setError('');
                  setDonateAmount('');
                  setDisplayType('default');
                  setCustomDisplayName('');
                }}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                disabled={isDonating}
              >
                Cancel
              </button>
              <button
                onClick={handleDonate}
                disabled={isDonating}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDonating ? 'Processing...' : 'Donate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="text-emerald-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
              <p className="text-gray-600">
                You need to be logged in to make a donation. Please login or create an account to continue.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-colors"
              >
                Go to Login
              </button>
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="w-full py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for blockchain copy button
function BlockchainCopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
      title="Copy transaction ID"
    >
      {copied ? (
        <CheckCircle size={16} className="text-green-600" />
      ) : (
        <Copy size={16} />
      )}
    </button>
  );
}
