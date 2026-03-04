import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken, getUser } from '@/utils/api';

/**
 * Protected Route Component
 * Redirects to login if not authenticated.
 * Optionally accepts `requiredRole` to restrict access by role.
 */
export default function ProtectedRoute({ children, requiredRole }) {
    const token = getToken();
    const location = useLocation();

    if (!token) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    if (requiredRole) {
        const user = getUser();
        if (!user || user.role !== requiredRole) {
            return <Navigate to="/" replace />;
        }
    }

    return children;
}
