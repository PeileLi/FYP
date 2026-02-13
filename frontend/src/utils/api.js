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
