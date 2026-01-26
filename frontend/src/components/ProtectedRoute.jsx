import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '@/utils/api';

/**
 * Protected Route Component
 * Redirects to login page if user is not authenticated
 * Saves the intended destination to redirect back after login
 */
export default function ProtectedRoute({ children }) {
    const token = getToken();
    const location = useLocation();

    if (!token) {
        // Redirect to login page and save the intended destination
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    return children;
}
