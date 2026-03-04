import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, statsAPI, campaignAPI } from '@/utils/api';
import {
    ArrowRight,
    Shield,
    Eye,
    Coins,
    Target,
    ShieldCheck,
    Search,
    Sprout,
    TreePine,
    Leaf,
} from 'lucide-react';
import heroBg from '@/image/index.png';

const CATEGORIES = [
    { id: 'all', name: 'All' },
    { id: 'disaster_relief', name: 'Disaster Relief' },
    { id: 'medical_assistance', name: 'Medical Aid' },
    { id: 'education_support', name: 'Education' },
    { id: 'environmental', name: 'Environment' },
    { id: 'poverty_alleviation', name: 'Poverty Alleviation' },
    { id: 'community_development', name: 'Community' },
    { id: 'children_welfare', name: 'Children' },
    { id: 'elderly_care', name: 'Elderly' },
    { id: 'animal_welfare', name: 'Animals' },
    { id: 'other', name: 'Other' },
];

const formatAmount = (amount) =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);

const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return `${Math.floor(diff / 2592000)}mo ago`;
};

const CampaignCard = ({ data, onClick }) => {
    const percent = Math.min(Math.round((data.currentAmount / data.goalAmount) * 100), 100);

    return (
        <div
            onClick={onClick}
            className="group cursor-pointer bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-300"
        >
            <div className="relative h-48 overflow-hidden bg-gray-50">
                <img
                    src={data.imageUrl}
                    alt={data.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f9fafb' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='200' y='150' text-anchor='middle' dy='.35em'%3ENo Image%3C/text%3E%3C/svg%3E";
                    }}
                />
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-md text-xs font-semibold text-gray-700">
                    {CATEGORIES.find(c => c.id === data.category)?.name || data.category}
                </span>
            </div>

            <div className="p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                    {data.title}
                </h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{data.description}</p>

                <div className="w-full bg-emerald-50 rounded-full h-1.5 mb-3">
                    <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                    />
                </div>

                <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-900">{formatAmount(data.currentAmount)}</span>
                    <span className="text-gray-400">{percent}% of {formatAmount(data.goalAmount)}</span>
                </div>
            </div>
        </div>
    );
};

export default function Home() {
    const [campaigns, setCampaigns] = useState([]);
    const [stats, setStats] = useState({ totalRaised: 0, donorCount: 0, totalCampaigns: 0, successfulProjects: 0 });
    const [recentDonations, setRecentDonations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [statsData, campaignsData, donationsData] = await Promise.all([
                    statsAPI.getPublicStats(),
                    campaignAPI.getActive(),
                    statsAPI.getRecentDonations(),
                ]);
                setStats(statsData);
                setRecentDonations(donationsData || []);
                const shuffled = [...campaignsData].sort(() => 0.5 - Math.random());
                setCampaigns(shuffled.slice(0, Math.min(3, campaignsData.length)));
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleStartCampaign = () => {
        navigate(getToken() ? '/create-campaign' : '/login');
    };

    return (
        <div className="bg-white">
            {/* ── Hero ── */}
            <section
                className="relative overflow-hidden border-b border-gray-100"
                style={{
                    backgroundImage: `url(${heroBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                {/* Overlay for readability */}
                <div className="absolute inset-0 bg-white/80" />

                <div className="relative max-w-6xl mx-auto px-6 py-20 lg:py-28">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        {/* Left: Message */}
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-6 border border-emerald-100">
                                <Sprout size={14} />
                                Blockchain-Powered Donations
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] text-gray-900 mb-5">
                                Donate with<br />
                                <span className="text-emerald-600">full transparency.</span>
                            </h1>
                            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-lg">
                                Every donation is permanently recorded on the blockchain. You can track exactly where your money goes — no middlemen, no guesswork.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => navigate('/browse-campaigns')}
                                    className="px-7 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-emerald-200"
                                >
                                    Explore Campaigns <ArrowRight size={18} />
                                </button>
                                <button
                                    onClick={handleStartCampaign}
                                    className="px-7 py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border border-gray-200 transition-colors"
                                >
                                    Start a Campaign
                                </button>
                            </div>
                        </div>

                        {/* Right: Live Donation Feed + Total */}
                        <div className="backdrop-blur-md bg-white/60 rounded-3xl shadow-xl shadow-black/5 ring-1 ring-white/80 overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Live Donations</span>
                                </div>
                            </div>

                            {/* Scrolling donation feed */}
                            <div className="relative flex-1 min-h-0">
                                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white/60 to-transparent z-10 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/60 to-transparent z-10 pointer-events-none" />

                                <div className="h-[220px] overflow-hidden">
                                    <div className={`${recentDonations.length > 0 ? 'animate-scroll-up' : ''}`}>
                                        {recentDonations.length > 0 ? (
                                            [...recentDonations, ...recentDonations].map((d, i) => (
                                                <div key={i} className="flex items-center justify-between px-6 py-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white shadow-sm">
                                                            {(d.displayName || 'A').charAt(0).toUpperCase()}
                                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-gray-800 truncate">
                                                {d.displayName || 'Anonymous'}
                                            </div>
                                            <div className="text-xs text-gray-400 truncate">{timeAgo(d.date)}</div>
                                        </div>
                                                    </div>
                                                    <div className="text-sm font-bold text-emerald-600 flex-shrink-0 ml-3 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                                        +{formatAmount(d.amount)}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-sm text-gray-400 px-6 py-20">
                                                <Sprout size={16} className="mr-2 text-emerald-300" />
                                                Waiting for the first seed...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Total Raised */}
                            <div className="px-6 py-5 border-t border-white/30 backdrop-blur-sm bg-white/30">
                                <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Total Raised</div>
                                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-600">
                                    {formatAmount(stats.totalRaised)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── How It Works ── */}
            <section className="max-w-5xl mx-auto px-6 py-20">
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">How It Works</h2>
                <p className="text-gray-400 text-center mb-12">Simple, transparent, and trustworthy</p>

                <div className="grid md:grid-cols-3 gap-10">
                    {[
                        {
                            icon: <Coins size={22} />,
                            emoji: '🌱',
                            title: 'Donate',
                            desc: 'Pick a project you care about and donate any amount. It only takes a few clicks.',
                        },
                        {
                            icon: <Shield size={22} />,
                            emoji: '🌿',
                            title: 'Recorded',
                            desc: 'Your donation is automatically recorded on the blockchain. No one can alter or delete it.',
                        },
                        {
                            icon: <Eye size={22} />,
                            emoji: '🌳',
                            title: 'Verify',
                            desc: 'You get a certificate ID. Use it anytime to look up your donation and see exactly where it went.',
                        },
                    ].map((step, i) => (
                        <div key={step.title} className="text-center">
                            <div className="text-3xl mb-3">{step.emoji}</div>
                            <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-1">Step {i + 1}</div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Growth line connecting the steps */}
                <div className="hidden md:flex items-center justify-center mt-8">
                    <div className="flex items-center gap-1">
                        <Sprout size={14} className="text-emerald-300" />
                        <div className="w-24 h-px bg-gradient-to-r from-emerald-200 to-emerald-300" />
                        <Leaf size={14} className="text-emerald-400" />
                        <div className="w-24 h-px bg-gradient-to-r from-emerald-300 to-emerald-400" />
                        <TreePine size={14} className="text-emerald-500" />
                    </div>
                </div>
            </section>

            {/* ── Featured Campaigns ── */}
            <section className="bg-gray-50/60 py-20 border-y border-gray-100">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="flex items-end justify-between mb-10">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">Featured Campaigns</h2>
                            <p className="text-gray-400 text-sm">Projects that need your support right now</p>
                        </div>
                        <button
                            onClick={() => navigate('/browse-campaigns')}
                            className="hidden sm:flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                        >
                            View all <ArrowRight size={16} />
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-20">
                            <div className="inline-block w-7 h-7 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            <p className="mt-3 text-sm text-gray-400">Loading...</p>
                        </div>
                    ) : campaigns.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {campaigns.map(c => (
                                <CampaignCard
                                    key={c.id}
                                    data={c}
                                    onClick={() => navigate(`/campaigns/${c.id}`)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                            <Search size={40} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">No active campaigns yet</p>
                        </div>
                    )}

                    <div className="sm:hidden mt-8 text-center">
                        <button
                            onClick={() => navigate('/browse-campaigns')}
                            className="text-sm font-medium text-emerald-600"
                        >
                            View all campaigns →
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Trust ── */}
            <section className="max-w-5xl mx-auto px-6 py-20">
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Built on Trust</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-1">Verified Campaigns</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">Every campaign is reviewed before going live. Organizers are verified to prevent fraud.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Eye size={22} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-1">Full Transparency</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">All donation records live on the blockchain. Anyone can verify any transaction, any time.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Target size={22} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-1">Direct Impact</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">Funds go directly to campaign organizers. Track exactly how your contribution is used.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="border-t border-gray-100 bg-emerald-50/40">
                <div className="max-w-3xl mx-auto px-6 py-20 text-center">
                    <div className="text-4xl mb-4">🌳</div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Every great forest starts with a single seed.</h2>
                    <p className="text-gray-500 mb-8 max-w-xl mx-auto">
                        Start a campaign or support one today. Every contribution is permanently recorded and fully verifiable on the blockchain.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => navigate('/browse-campaigns')}
                            className="px-7 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors shadow-sm shadow-emerald-200"
                        >
                            Browse Campaigns
                        </button>
                        <button
                            onClick={() => navigate('/blockchain-search')}
                            className="px-7 py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border border-gray-200 transition-colors"
                        >
                            Verify a Donation
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
