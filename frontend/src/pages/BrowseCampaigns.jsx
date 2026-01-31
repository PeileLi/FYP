import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignAPI } from '@/utils/api';
import {
    ShieldCheck,
    ShieldAlert,
    Clock,
    Target,
    Search,
    Filter,
    X
} from 'lucide-react';

const CATEGORIES = [
    { id: 'all', name: 'All Categories' },
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
                <div className="flex items-center gap-2 mb-2 text-xs font-medium">
                    {data.verificationStatus === 'VERIFIED' ? (
                        <>
                            <ShieldCheck size={14} className="text-emerald-500" />
                            <span className="text-gray-500">Organizer: {data.organizerName}</span>
                        </>
                    ) : data.verificationStatus === 'TAMPERED' ? (
                        <>
                            <ShieldAlert size={14} className="text-red-500" />
                            <span className="text-red-600 font-semibold">⚠️ Data Tampered</span>
                        </>
                    ) : (
                        <>
                            <ShieldCheck size={14} className="text-gray-400" />
                            <span className="text-gray-500">Organizer: {data.organizerName}</span>
                        </>
                    )}
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-emerald-600 transition-colors">{data.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">{data.description}</p>

                {/* Show tampering warning */}
                {data.verificationStatus === 'TAMPERED' && data.blockchainAmount !== null && (
                    <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs text-red-700 font-semibold mb-1">⚠️ Amount Mismatch</p>
                        <div className="text-xs space-y-0.5">
                            <div className="flex justify-between">
                                <span className="text-red-600">DB:</span>
                                <span className="font-semibold">{formatAmount(data.currentAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-green-600">Blockchain:</span>
                                <span className="font-semibold">{formatAmount(data.blockchainAmount)}</span>
                            </div>
                        </div>
                    </div>
                )}

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

export default function BrowseCampaigns() {
    const [campaigns, setCampaigns] = useState([]);
    const [filteredCampaigns, setFilteredCampaigns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchCampaigns();
    }, []);

    useEffect(() => {
        filterCampaigns();
    }, [campaigns, searchTerm, selectedCategory]);

    const fetchCampaigns = async () => {
        try {
            setIsLoading(true);
            const data = await campaignAPI.getAll();
            setCampaigns(data);
        } catch (error) {
            console.error('Failed to fetch campaigns:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filterCampaigns = () => {
        let filtered = [...campaigns];

        // Filter by category
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(campaign => campaign.category === selectedCategory);
        }

        // Filter by search term
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(campaign => 
                campaign.title.toLowerCase().includes(term) ||
                campaign.description.toLowerCase().includes(term) ||
                campaign.organizerName.toLowerCase().includes(term)
            );
        }

        setFilteredCampaigns(filtered);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedCategory('all');
    };

    const hasActiveFilters = searchTerm !== '' || selectedCategory !== 'all';

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-900 to-green-800 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Browse All Campaigns</h1>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search Bar */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search campaigns by title, description, or organizer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>

                        {/* Filter Button (Mobile) */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="lg:hidden flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                        >
                            <Filter size={20} />
                            Filters
                        </button>
                    </div>

                    {/* Category Filter (Desktop & Mobile when shown) */}
                    <div className={`mt-4 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <Filter size={16} className="text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Category:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        selectedCategory === category.id
                                            ? 'bg-emerald-600 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {category.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Active Filters Display */}
                    {hasActiveFilters && (
                        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="font-medium">{filteredCampaigns.length}</span>
                                <span>campaign{filteredCampaigns.length !== 1 ? 's' : ''} found</span>
                            </div>
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                                <X size={16} />
                                Clear filters
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Campaigns Grid */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                {isLoading ? (
                    <div className="text-center py-20">
                        <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <p className="mt-4 text-gray-500">Loading campaigns...</p>
                    </div>
                ) : filteredCampaigns.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                        <Search size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
                        <p className="text-gray-500 mb-6">
                            {hasActiveFilters 
                                ? 'Try adjusting your search or filters'
                                : 'No campaigns are currently available'}
                        </p>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-500 transition-colors"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredCampaigns.map(campaign => (
                            <CampaignCard 
                                key={campaign.id} 
                                data={campaign}
                                onClick={() => navigate(`/campaigns/${campaign.id}`)}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
