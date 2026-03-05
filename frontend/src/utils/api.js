// API base URL - uses relative path, nginx will proxy to backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Request timeout (30 seconds)
const REQUEST_TIMEOUT = 30000;

// ============================================================================
// Local Storage Helpers
// ============================================================================

// Get token from localStorage
export const getToken = () => {
    return localStorage.getItem('token');
};

// Set token to localStorage
export const setToken = (token) => {
    localStorage.setItem('token', token);
};

// Remove token from localStorage
export const removeToken = () => {
    localStorage.removeItem('token');
};

// Get user info from localStorage
export const getUser = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch (e) {
        console.warn('Corrupt user data in localStorage, clearing');
        localStorage.removeItem('user');
        return null;
    }
};

// Set user info to localStorage
export const setUser = (user) => {
    localStorage.setItem('user', JSON.stringify(user));
};

// Remove user info from localStorage
export const removeUser = () => {
    localStorage.removeItem('user');
};

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Create a fetch request with timeout
 */
const fetchWithTimeout = (url, options, timeout = REQUEST_TIMEOUT) => {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
};

/**
 * Parse error response from server
 */
const parseErrorResponse = async (response) => {
    try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            return error.message || error.error || `HTTP ${response.status}`;
        } else {
            const text = await response.text();
            return text || `HTTP ${response.status}`;
        }
    } catch (e) {
        return `HTTP ${response.status}`;
    }
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyErrorMessage = (error) => {
    const message = error?.message || 'An unexpected error occurred';

    // Network errors
    if (message.includes('fetch') || message.includes('timeout')) {
        return 'Unable to connect to server. Please check your internet connection.';
    }

    // Authentication errors
    if (message.includes('401') || message.includes('Unauthorized')) {
        return 'Your session has expired. Please log in again.';
    }

    if (message.includes('403') || message.includes('Forbidden')) {
        return 'You don\'t have permission to perform this action.';
    }

    // Not found
    if (message.includes('404') || message.includes('not found')) {
        return 'The requested resource was not found.';
    }

    // Server errors
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
        return 'Server error. Please try again later.';
    }

    // Return original message for other errors
    return message;
};

// ============================================================================
// Core Request Functions
// ============================================================================

/**
 * Public API request helper (no authentication required)
 */
const publicApiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    try {
        const response = await fetchWithTimeout(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorMessage = await parseErrorResponse(response);
            throw new Error(`${response.status} ${errorMessage}`);
        }

        // Handle empty responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        }

        return response.text();

    } catch (error) {
        // Network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Network error: Unable to connect to server');
        }

        throw error;
    }
};

/**
 * API request helper (with authentication)
 */
const apiRequest = async (endpoint, options = {}) => {
    const token = getToken();
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetchWithTimeout(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorMessage = await parseErrorResponse(response);

            // 401 or 403: only clear session when we actually sent a token (avoid clear when proxy stripped header)
            if (response.status === 401 || response.status === 403) {
                if (token) {
                    console.warn('[apiRequest] Auth failed (%s) for %s, clearing session', response.status, url);
                    removeToken();
                    removeUser();
                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                }
                throw new Error('Your session has expired. Please log in again.');
            }

            throw new Error(`${response.status} ${errorMessage}`);
        }

        // Handle empty responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        }

        return response.text();

    } catch (error) {
        // Network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Network error: Unable to connect to server');
        }

        throw error;
    }
};

// ============================================================================
// API Endpoints
// ============================================================================

// Auth API
export const authAPI = {
    login: async (email, password) => {
        // Use publicApiRequest for login - don't treat 401 as session expired
        return publicApiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    },

    register: async (email, password) => {
        // Use publicApiRequest for register - no authentication required
        return publicApiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    },
};

// User API
export const userAPI = {
    getProfile: async () => {
        return apiRequest('/user/profile', {
            method: 'GET',
        });
    },

    updateProfile: async (displayName, avatarUrl) => {
        return apiRequest('/user/profile', {
            method: 'PUT',
            body: JSON.stringify({ displayName, avatarUrl }),
        });
    },

    updateAvatar: async (avatarUrl) => {
        return apiRequest('/user/profile', {
            method: 'PUT',
            body: JSON.stringify({ avatarUrl }),
        });
    },
};

// Stats API (public, no auth required)
export const statsAPI = {
    getPublicStats: async () => {
        try {
            return await publicApiRequest('/stats/public', {
                method: 'GET',
            });
        } catch (error) {
            // Return default stats if API fails
            console.warn('Failed to fetch stats, using defaults');
            return {
                totalRaised: 0,
                donorCount: 0,
                totalCampaigns: 0,
                successfulProjects: 0
            };
        }
    },
    getRecentDonations: async () => {
        try {
            return await publicApiRequest('/stats/recent-donations', { method: 'GET' });
        } catch (error) {
            console.warn('Failed to fetch recent donations');
            return [];
        }
    },
};

// Campaign API
export const campaignAPI = {
    create: async (campaignData) => {
        return apiRequest('/campaigns', {
            method: 'POST',
            body: JSON.stringify(campaignData),
        });
    },

    getAll: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const url = query ? `/campaigns?${query}` : '/campaigns';
        return publicApiRequest(url, {
            method: 'GET',
        });
    },

    getById: async (id) => {
        return publicApiRequest(`/campaigns/${id}`, {
            method: 'GET',
        });
    },

    getActive: async () => {
        return publicApiRequest('/campaigns?status=active', {
            method: 'GET',
        });
    },

    getMyCampaigns: async () => {
        return apiRequest('/campaigns/my-campaigns', {
            method: 'GET',
        });
    },

    getByTxId: async (txId) => {
        return publicApiRequest(`/campaigns/by-txid?txId=${encodeURIComponent(txId)}`, {
            method: 'GET',
        });
    },
};

// Donation API
export const donationAPI = {
    create: async (donationData) => {
        return apiRequest('/donations', {
            method: 'POST',
            body: JSON.stringify(donationData),
        });
    },

    getMyHistory: async () => {
        return apiRequest('/donations/my-history', {
            method: 'GET',
        });
    },

    getCampaignDonations: async (campaignId) => {
        return publicApiRequest(`/donations/campaign/${campaignId}`, {
            method: 'GET',
        });
    },
};

// File Upload API
export const uploadAPI = {
    uploadImage: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const token = getToken();
        const headers = {};

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetchWithTimeout(`${API_BASE_URL}/upload/image`, {
                method: 'POST',
                headers,
                body: formData, // Don't set Content-Type, browser will set it with boundary
            });

            if (!response.ok) {
                const errorMessage = await parseErrorResponse(response);

                if (response.status === 413) {
                    throw new Error('File too large. Maximum size is 50MB');
                }

                throw new Error(errorMessage || 'Failed to upload image');
            }

            return response.json();
        } catch (error) {
            if (error.message) {
                throw error;
            }
            throw new Error('Failed to upload image. Please try again.');
        }
    },
};

// Partner Application API
export const partnerAPI = {
    apply: async (data) => {
        return publicApiRequest('/partner/apply', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    getCampaigns: (status) => {
        const q = status ? `?status=${status}` : '';
        return apiRequest(`/partner/campaigns${q}`, { method: 'GET' });
    },
    endorse: (id, note) => apiRequest(`/partner/campaigns/${id}/endorse`, {
        method: 'POST',
        body: JSON.stringify({ note }),
    }),
    revokeEndorsement: (id) => apiRequest(`/partner/campaigns/${id}/revoke-endorsement`, { method: 'POST' }),
    // Audit API
    getAuditCampaigns: (auditStatus) => {
        const q = auditStatus ? `?auditStatus=${auditStatus}` : '';
        return apiRequest(`/partner/audit/campaigns${q}`, { method: 'GET' });
    },
    submitAudit: (id, body) => apiRequest(`/partner/audit/campaigns/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify(body),
    }),
    getAuditHistory: (id) => apiRequest(`/partner/audit/campaigns/${id}/history`, { method: 'GET' }),
    // Task Inbox
    getOpenTasks:      () => apiRequest('/partner/tasks/open',      { method: 'GET' }),
    getMyTasks:        () => apiRequest('/partner/tasks/mine',      { method: 'GET' }),
    getCompletedTasks: () => apiRequest('/partner/tasks/completed', { method: 'GET' }),
    getDeclineLogs:    (id) => apiRequest(`/partner/tasks/${id}/decline-logs`, { method: 'GET' }),
    acceptTask:        (id) => apiRequest(`/partner/tasks/${id}/accept`,  { method: 'POST', body: '{}' }),
    declineTask:       (id, reason) => apiRequest(`/partner/tasks/${id}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    }),
    // Material Review
    getCampaignDetail:    (id) => apiRequest(`/partner/campaigns/${id}/detail`, { method: 'GET' }),
    submitVerification:   (id, body) => apiRequest(`/partner/campaigns/${id}/verification`, { method: 'POST', body: JSON.stringify(body) }),
    getVerifications:     (id) => apiRequest(`/partner/campaigns/${id}/verifications`, { method: 'GET' }),
    addDocument:          (id, body) => apiRequest(`/partner/campaigns/${id}/documents`, { method: 'POST', body: JSON.stringify(body) }),
    addUpdate:            (id, body) => apiRequest(`/partner/campaigns/${id}/updates`, { method: 'POST', body: JSON.stringify(body) }),
    updateFundUsagePlan:  (id, plan) => apiRequest(`/partner/campaigns/${id}/fund-usage-plan`, { method: 'PUT', body: JSON.stringify({ plan }) }),
    getChainRecords:      (id) => apiRequest(`/partner/campaigns/${id}/chain-records`, { method: 'GET' }),
    // Profile
    getProfile: () => apiRequest('/partner/profile', { method: 'GET' }),
    updateProfile: (body) => apiRequest('/partner/profile', { method: 'PUT', body: JSON.stringify(body) }),
    getFabricIdentity: () => apiRequest('/partner/profile/fabric-identity', { method: 'GET' }),
    getPermissions: () => apiRequest('/partner/profile/permissions', { method: 'GET' }),
    getMyAudits: () => apiRequest('/partner/profile/my-audits', { method: 'GET' }),
};

// Admin API (ADMIN role required)
export const adminAPI = {
    getPartnerApplications: async (status) => {
        const query = status ? `?status=${status}` : '';
        return apiRequest(`/admin/partner-applications${query}`, { method: 'GET' });
    },
    approvePartnerApplication: async (id, tempPassword) => {
        return apiRequest(`/admin/partner-applications/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify(tempPassword ? { tempPassword } : {}),
        });
    },
    rejectPartnerApplication: async (id, reason) => {
        return apiRequest(`/admin/partner-applications/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify(reason ? { reason } : {}),
        });
    },
    getDashboardSummary: () => apiRequest('/admin/dashboard/summary', { method: 'GET' }),
    getDonations: (params = {}) => {
        const q = new URLSearchParams();
        if (params.campaignId) q.append('campaignId', params.campaignId);
        if (params.status)     q.append('status', params.status);
        if (params.from)       q.append('from', params.from);
        if (params.to)         q.append('to', params.to);
        return apiRequest(`/admin/donations${q.toString() ? '?' + q : ''}`, { method: 'GET' });
    },
    getDonationStats: () => apiRequest('/admin/donations/stats', { method: 'GET' }),
    verifyDonationTx: (id) => apiRequest(`/admin/donations/${id}/verify`, { method: 'GET' }),
    exportDonationsCsv: (params = {}) => {
        const q = new URLSearchParams();
        if (params.campaignId) q.append('campaignId', params.campaignId);
        if (params.status)     q.append('status', params.status);
        if (params.from)       q.append('from', params.from);
        if (params.to)         q.append('to', params.to);
        const token = localStorage.getItem('token');
        const url = `/api/admin/donations/export${q.toString() ? '?' + q : ''}`;
        return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    },
    getAllCampaigns: (status, keyword) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (keyword) params.append('keyword', keyword);
        const q = params.toString();
        return apiRequest(`/admin/campaigns${q ? '?' + q : ''}`, { method: 'GET' });
    },
    updateCampaignStatus: (id, status) =>
        apiRequest(`/admin/campaigns/${id}/status`, {
            method: 'POST',
            body: JSON.stringify({ status }),
        }),
    getAllUsers: () => apiRequest('/admin/users', { method: 'GET' }),
    getUserActivity: (id) => apiRequest(`/admin/users/${id}/activity`, { method: 'GET' }),
    toggleUserEnabled: (id) => apiRequest(`/admin/users/${id}/toggle-enabled`, { method: 'POST' }),
    getBlockchainStats: () => apiRequest('/admin/blockchain/stats', { method: 'GET' }),
    getBlockchainNodes: () => apiRequest('/admin/blockchain/nodes', { method: 'GET' }),
    getBlockchainTransactions: (page = 0, size = 50) =>
        apiRequest(`/admin/blockchain/transactions?page=${page}&size=${size}`, { method: 'GET' }),
    getBlockchainAuditLogs: (page = 0, size = 50) =>
        apiRequest(`/admin/blockchain/audit-logs?page=${page}&size=${size}`, { method: 'GET' }),
    getBlock: (blockNum) => apiRequest(`/admin/blockchain/block/${blockNum}`, { method: 'GET' }),
};

// Blockchain API (public, no authentication required)
export const blockchainAPI = {
    verifyCampaign: async (campaignId) => {
        return publicApiRequest(`/blockchain/verify/${campaignId}`, {
            method: 'GET',
        });
    },

    searchByTxId: async (txId) => {
        return publicApiRequest(`/blockchain/search?txId=${encodeURIComponent(txId)}`, {
            method: 'GET',
        });
    },

    searchDonation: async (donationId) => {
        return publicApiRequest(`/blockchain/donation/${encodeURIComponent(donationId)}`, {
            method: 'GET',
        });
    },
};
