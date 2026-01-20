// API base URL - uses relative path, nginx will proxy to backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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
    return userStr ? JSON.parse(userStr) : null;
};

// Set user info to localStorage
export const setUser = (user) => {
    localStorage.setItem('user', JSON.stringify(user));
};

// Remove user info from localStorage
export const removeUser = () => {
    localStorage.removeItem('user');
};

// Public API request helper (no authentication required)
const publicApiRequest = async (endpoint, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });
    } catch (error) {
        // Network error or connection refused
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Unable to connect to server. Please ensure the backend service is running on http://localhost:8080');
        }
        throw error;
    }

    if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
            const error = await response.json();
            errorMessage = error.message || errorMessage;
        } catch (_) {
            // If response is not JSON, try to get text
            try {
                const text = await response.text();
                if (text) errorMessage = text;
            } catch (__) {
                // Use default error message
            }
        }
        throw new Error(errorMessage);
    }

    return response.json();
};

// API request helper (with authentication)
const apiRequest = async (endpoint, options = {}) => {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });
    } catch (error) {
        // Network error or connection refused
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Unable to connect to server. Please ensure the backend service is running on http://localhost:8080');
        }
        throw error;
    }

    if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
            const error = await response.json();
            errorMessage = error.message || errorMessage;
        } catch (_) {
            // If response is not JSON, try to get text
            try {
                const text = await response.text();
                if (text) errorMessage = text;
            } catch (__) {
                // Use default error message
            }
        }
        throw new Error(errorMessage);
    }

    return response.json();
};

// Auth API
export const authAPI = {
    login: async (email, password) => {
        return apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    },

    register: async (email, password) => {
        return apiRequest('/auth/register', {
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
        const response = await fetch(`${API_BASE_URL}/stats/public`);
        if (!response.ok) {
            throw new Error('Failed to fetch stats');
        }
        return response.json();
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

        const response = await fetch(`${API_BASE_URL}/upload/image`, {
            method: 'POST',
            headers,
            body: formData, // Don't set Content-Type, browser will set it with boundary
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to upload image');
        }

        return response.json();
    },
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
};
