import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, getUser, statsAPI, campaignAPI } from '@/utils/api';
import {
    Heart,
    ShieldCheck,
    Clock,
    Target,
    Users,
    Search,
    Sprout,
    ArrowRight,
    TrendingUp
} from 'lucide-react';

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

const ProgressBar = ({ current, total }) => {
    const percentage = Math.min((current / total) * 100, 100);
    return (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
    );
};

const CampaignCard = ({ data, onClick }) => {
    const percent = Math.round((data.currentAmount / data.goalAmount) * 100);

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div 
            onClick={onClick}
            className="bg-white rounded-xl shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col h-full group cursor-pointer"
        >
            <div className="relative h-48 overflow-hidden">
                <img
                    src={data.imageUrl}
                    alt={data.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x300?text=Campaign+Image';
                    }}
                />
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-emerald-700 uppercase tracking-wide shadow-sm">
                    {CATEGORIES.find(c => c.id === data.category)?.name || data.category}
                </div>
            </div>

            <div className="p-5 flex flex-col flex-grow">
                <div className="flex items-center gap-2 mb-2 text-gray-500 text-xs font-medium">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span>Organizer: {data.organizerName}</span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-emerald-600 transition-colors">{data.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">{data.description}</p>

                <div className="mt-auto">
                    <div className="flex justify-between text-sm mb-1 font-medium">
                        <span className="text-emerald-600">{formatAmount(data.currentAmount)}</span>
                        <span className="text-gray-400">Goal {formatAmount(data.goalAmount)}</span>
                    </div>

                    <ProgressBar current={data.currentAmount} total={data.goalAmount} />

                    <div className="flex justify-between items-center text-xs text-gray-400 mt-3 border-t border-gray-50 pt-3">
                        <div className="flex items-center gap-1">
                            <Target size={14} />
                            <span>{percent}% funded</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock size={14} />
                            <span>{data.status === 'COMPLETED' ? 'Completed' : 'Active'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function Home() {
    const [campaigns, setCampaigns] = useState([]);
    const [displayedCampaigns, setDisplayedCampaigns] = useState([]);
    const [stats, setStats] = useState({
        totalRaised: 0,
        donorCount: 0,
        totalCampaigns: 0,
        successfulProjects: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [statsData, campaignsData] = await Promise.all([
                    statsAPI.getPublicStats(),
                    campaignAPI.getActive()
                ]);
                setStats(statsData);
                setCampaigns(campaignsData);
                
                // Randomly select 4-5 campaigns
                const shuffled = [...campaignsData].sort(() => 0.5 - Math.random());
                const randomCount = Math.floor(Math.random() * 2) + 4; // 4 or 5
                setDisplayedCampaigns(shuffled.slice(0, Math.min(randomCount, campaignsData.length)));
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Format currency for display
    const formatCurrency = (amount) => {
        if (amount >= 1000000) {
            return `€${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
            return `€${(amount / 1000).toFixed(1)}K`;
        }
        return `€${amount}`;
    };

    // Format number for display
    const formatNumber = (num) => {
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K+`;
        }
        return num.toString();
    };

    const handleStartCampaign = () => {
        const token = getToken();
        if (token) {
            navigate('/create-campaign');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="bg-gray-50">
            {/* Hero Section */}
            <div className="relative bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 overflow-hidden">
                {/* Background Texture */}
                <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/diagmonds.png')]"></div>

                {/* Sprout/Plant Decorative Elements */}
                <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-emerald-950/50 to-transparent"></div>

                {/* Animated Plant-like Blobs */}
                <div className="absolute top-0 right-0 -mt-32 -mr-32 w-[32rem] h-[32rem] bg-emerald-400 rounded-full mix-blend-overlay filter blur-[120px] opacity-25 animate-blob"></div>
                <div className="absolute bottom-0 left-0 -mb-32 -ml-32 w-[28rem] h-[28rem] bg-green-500 rounded-full mix-blend-overlay filter blur-[100px] opacity-25 animate-blob animation-delay-2000"></div>
                <div className="absolute top-1/3 right-1/4 w-[24rem] h-[24rem] bg-teal-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-20 animate-blob"></div>

                {/* Sprout Icon Decorative Elements */}
                <div className="absolute top-20 left-10 opacity-10">
                    <Sprout className="text-white" size={120} strokeWidth={1} />
                </div>
                <div className="absolute bottom-20 right-20 opacity-10 rotate-12">
                    <Sprout className="text-white" size={100} strokeWidth={1} />
                </div>
                <div className="absolute top-1/2 right-10 opacity-10 -rotate-12">
                    <Sprout className="text-white" size={80} strokeWidth={1} />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
                    <div className="text-center max-w-3xl mx-auto">
                        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6 drop-shadow-lg">
                            The best time to plant a tree was ten years ago;<br className="hidden sm:block" />
                            the <span className="text-emerald-400">second best time</span> is now
                        </h1>
                        <p className="text-emerald-100 text-lg md:text-xl mb-10 leading-relaxed max-w-2xl mx-auto">
                            Every moment presents an opportunity to make a positive impact. Join us in creating meaningful change, no matter where you start your journey.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-full text-lg shadow-lg shadow-emerald-900/30 transition-all hover:scale-105 flex items-center justify-center gap-2 border border-emerald-400/20">
                                Start Donating <Heart size={20} fill="currentColor" />
                            </button>
                            <button onClick={handleStartCampaign} className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold rounded-full text-lg border border-white/20 transition-all flex items-center justify-center gap-2">
                                Start Campaign <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Wave Decoration */}
                <div className="absolute bottom-0 w-full h-16 bg-gradient-to-t from-gray-50 to-transparent"></div>
            </div>

            {/* Statistics Bar */}
            <div className="bg-white border-b border-gray-200 relative z-10 -mt-8 mx-4 md:mx-auto max-w-6xl rounded-2xl shadow-xl shadow-gray-200/50">
                <div className="px-4 sm:px-6 py-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-100">
                        <div className="text-center group">
                            <div className="text-3xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{formatCurrency(stats.totalRaised)}</div>
                            <div className="text-sm text-gray-500 mt-1 uppercase tracking-wide">Total Raised</div>
                        </div>
                        <div className="text-center group">
                            <div className="text-3xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{formatNumber(stats.donorCount)}</div>
                            <div className="text-sm text-gray-500 mt-1 uppercase tracking-wide">Donors</div>
                        </div>
                        <div className="text-center group">
                            <div className="text-3xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{stats.successfulProjects}</div>
                            <div className="text-sm text-gray-500 mt-1 uppercase tracking-wide">Successful Projects</div>
                        </div>
                        <div className="text-center hidden md:block group">
                            <div className="text-3xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">100%</div>
                            <div className="text-sm text-gray-500 mt-1 uppercase tracking-wide">Transparency</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

                {/* Title */}
                <div className="mb-10">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Campaigns</h2>
                    <p className="text-gray-500">Discover those in need and make a difference</p>
                </div>

                {/* Loading State */}
                {isLoading ? (
                    <div className="text-center py-20">
                        <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <p className="mt-4 text-gray-500">Loading campaigns...</p>
                    </div>
                ) : (
                    <>
                        {/* Campaigns Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {displayedCampaigns.map(campaign => (
                                <CampaignCard 
                                    key={campaign.id} 
                                    data={campaign}
                                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                                />
                            ))}
                        </div>

                        {displayedCampaigns.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                                <Search size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900">No campaigns found</h3>
                            </div>
                        )}

                        {/* View All Button */}
                        {displayedCampaigns.length > 0 && (
                            <div className="mt-12 text-center">
                                <button
                                    onClick={() => navigate('/browse-campaigns')}
                                    className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full text-lg shadow-lg shadow-emerald-200 transition-all hover:scale-105 flex items-center justify-center gap-2 mx-auto"
                                >
                                    View All Campaigns
                                    <ArrowRight size={20} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Trust & Security Section */}
            <section className="bg-gradient-to-b from-emerald-50 to-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900">Why Choose BlockFund?</h2>
                        <p className="mt-4 text-gray-600 max-w-2xl mx-auto">We are committed to building the most transparent and efficient crowdfunding platform, ensuring every donation makes a real impact.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 hover:-translate-y-1 transition-transform duration-300">
                            <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-6 text-emerald-600">
                                <ShieldCheck size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Strict Verification</h3>
                            <p className="text-gray-600">All campaign organizers and medical documents are verified through both manual and automated systems to prevent fraud.</p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 hover:-translate-y-1 transition-transform duration-300">
                            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-6 text-blue-600">
                                <TrendingUp size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Full Transparency</h3>
                            <p className="text-gray-600">Using blockchain technology to record every donation flow, with full project execution transparency available at all times.</p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 hover:-translate-y-1 transition-transform duration-300">
                            <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-6 text-orange-600">
                                <Target size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Precise Support</h3>
                            <p className="text-gray-600">Big data matching connects those in need with donors' intentions, ensuring help reaches where it's needed most.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
