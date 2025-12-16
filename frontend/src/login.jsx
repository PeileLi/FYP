import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sprout,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { authAPI, setToken, setUser } from '@/utils/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authAPI.login(email, password);

      // Store token and user info
      setToken(response.token);
      setUser({
        id: response.id,
        email: response.email,
      });

      // Redirect to home page or dashboard
      navigate('/');
    } catch (error) {
      setError(error.message || 'Invalid email or password. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Form Area */}
      <div className="w-full flex flex-col justify-center px-4 sm:px-12 xl:px-24 py-12 relative">
        {/* Back Button */}
        <div className="absolute top-8 left-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors group"
          >
            <div className="p-2 rounded-full group-hover:bg-emerald-50 transition-colors">
              <ArrowLeft size={20} />
            </div>
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>

        <div className="max-w-sm w-full mx-auto mt-16 lg:mt-0">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-1.5 rounded-lg shadow-sm">
                <Sprout className="text-white" size={24} strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-bold tracking-tight text-gray-900">
                BlockFund
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome Back</h1>
            <p className="text-gray-500">
              Sign in to continue your journey of kindness and make the world a better place.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-transparent transition-all"
                  placeholder="name@example.com"
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
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 cursor-pointer">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-emerald-600 hover:text-emerald-500 hover:underline">
                  Forgot password?
                </a>
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
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-emerald-200 hover:text-emerald-700 transition-all group">
                <svg className="h-5 w-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>
              <button className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-emerald-200 hover:text-emerald-700 transition-all group">
                <svg className="h-5 w-5 text-[#1877F2] group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-500 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
