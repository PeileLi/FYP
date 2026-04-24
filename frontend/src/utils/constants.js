export const CATEGORIES = [
    { id: 'all', name: 'All', label: 'All' },
    { id: 'disaster_relief', name: 'Disaster Relief', label: 'Disaster Relief' },
    { id: 'medical_assistance', name: 'Medical Aid', label: 'Medical Assistance' },
    { id: 'education_support', name: 'Education', label: 'Education Support' },
    { id: 'environmental', name: 'Environment', label: 'Environmental Protection' },
    { id: 'poverty_alleviation', name: 'Poverty Alleviation', label: 'Poverty Alleviation' },
    { id: 'community_development', name: 'Community', label: 'Community Development' },
    { id: 'children_welfare', name: 'Children', label: 'Children Welfare' },
    { id: 'elderly_care', name: 'Elderly', label: 'Elderly Care' },
    { id: 'animal_welfare', name: 'Animals', label: 'Animal Welfare' },
    { id: 'other', name: 'Other', label: 'Other' },
];

export const CAMPAIGN_STATUS = {
    PENDING:   { label: 'Pending Review', bg: 'bg-yellow-100',  text: 'text-yellow-700',  dot: 'bg-yellow-400',  border: 'border-yellow-200' },
    ACTIVE:    { label: 'Active',         bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400', border: 'border-emerald-200' },
    SUSPENDED: { label: 'Suspended',      bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-400',     border: 'border-red-200' },
    COMPLETED: { label: 'Completed',      bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-400',    border: 'border-blue-200' },
    CLOSED:    { label: 'Closed',         bg: 'bg-gray-200',    text: 'text-gray-600',    dot: 'bg-gray-400',    border: 'border-gray-200' },
};

export const getStatusClasses = (status) => {
    const m = CAMPAIGN_STATUS[status];
    if (!m) return 'bg-gray-100 text-gray-800 border-gray-200';
    return `${m.bg} ${m.text} ${m.border}`;
};

export const getStatusLabel = (status) =>
    CAMPAIGN_STATUS[status]?.label || status;

export const getCategoryName = (categoryId) =>
    CATEGORIES.find(c => c.id === categoryId)?.name || categoryId;
