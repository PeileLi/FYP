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

            if (response.status === 401) {
                if (token) {
                    console.warn('[apiRequest] Auth failed (401) for %s, clearing session', url);
                    removeToken();
                    removeUser();
                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                }
                throw new Error('Your session has expired. Please log in again.');
            }

            if (response.status === 403) {
                throw new Error(errorMessage || 'You do not have permission to perform this action.');
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
        return publicApiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username: email, password }),
        });
    },

    register: async (email, password) => {
        return publicApiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username: email, password }),
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

    changePassword: async (newPassword) => {
        return apiRequest('/user/password', {
            method: 'PUT',
            body: JSON.stringify({ newPassword }),
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

    setCoverImage: async (id, imageUrl) => {
        return apiRequest(`/campaigns/${id}/cover`, {
            method: 'PUT',
            body: JSON.stringify({ imageUrl }),
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
    uploadFile: async (file) => {
        return uploadAPI._upload(file, '/upload/file');
    },
    _upload: async (file, endpoint) => {
        const formData = new FormData();
        formData.append('file', file);

        const token = getToken();
        const headers = {};

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers,
                body: formData,
            });

            if (!response.ok) {
                const errorMessage = await parseErrorResponse(response);
                if (response.status === 413) {
                    throw new Error('File too large. Maximum size is 10MB');
                }
                throw new Error(errorMessage || 'Failed to upload file');
            }

            return response.json();
        } catch (error) {
            if (error.message) throw error;
            throw new Error('Failed to upload file. Please try again.');
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
    submitAudit: (id, body) => apiRequest(`/partner/audit/campaigns/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify(body),
    }),
    getAuditHistory: (id) => apiRequest(`/partner/audit/campaigns/${id}/history`, { method: 'GET' }),
    // Task Inbox
    getOpenTasks:      () => apiRequest('/partner/tasks/open',      { method: 'GET' }),
    getMyTasks:        () => apiRequest('/partner/tasks/mine',      { method: 'GET' }),
    getCompletedTasks: () => apiRequest('/partner/tasks/completed', { method: 'GET' }),
    acceptTask:        (id) => apiRequest(`/partner/tasks/${id}/accept`,  { method: 'POST', body: '{}' }),
    // Profile
    getProfile: () => apiRequest('/partner/profile', { method: 'GET' }),
    updateProfile: (body) => apiRequest('/partner/profile', { method: 'PUT', body: JSON.stringify(body) }),
    getFabricIdentity: () => apiRequest('/partner/profile/fabric-identity', { method: 'GET' }),
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
    getBlockchainTransactions: (page = 0, size = 50) =>
        apiRequest(`/admin/blockchain/transactions?page=${page}&size=${size}`, { method: 'GET' }),
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
