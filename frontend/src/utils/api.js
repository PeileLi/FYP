// API base URL - adjust based on your environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

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

// API request helper
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
            throw new Error('无法连接到服务器。请确保后端服务正在运行在 http://localhost:8080');
        }
        throw error;
    }

    if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
            const error = await response.json();
            errorMessage = error.message || errorMessage;
        } catch (e) {
            // If response is not JSON, try to get text
            try {
                const text = await response.text();
                if (text) errorMessage = text;
            } catch (textError) {
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

