import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Sprout,
    User,
    Lock,
    Eye,
    EyeOff,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import { authAPI, setToken, setUser } from '@/utils/api';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        if (email.length < 3) {
            setError('Email must be at least 3 characters');
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setIsLoading(false);
            return;
        }

        try {
            const response = await authAPI.register(email, password);

            setToken(response.token);
            setUser({
                id: response.id,
                username: response.username,
                displayName: response.displayName,
                orgName: response.orgName,
                avatarUrl: response.avatarUrl,
                role: response.role,
            });

            setSuccess('Account created successfully! Redirecting...');

            setTimeout(() => {
                navigate('/');
            }, 1500);
        } catch (error) {
            setError(error.message || 'Registration failed. Please try again.');
            console.error('Registration error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center px-4 py-12 bg-gray-50 min-h-[calc(100vh-64px)]">
            <div className="max-w-sm w-full">
                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-1.5 rounded-lg shadow-sm">
                            <Sprout className="text-white" size={24} strokeWidth={2.5} />
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-gray-900">
                            BlockFund
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">Create Account</h1>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                            <CheckCircle size={18} />
                            <span>{success}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                minLength={3}
                                maxLength={50}
                                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-transparent transition-all"
                                placeholder="Enter your email"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-transparent transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-transparent transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-emerald-200 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Creating account...</span>
                            </div>
                        ) : (
                            "Sign Up"
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-500 hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
