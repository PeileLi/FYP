import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getToken, getUser, setUser, removeToken, removeUser, userAPI } from '@/utils/api';
import {
    Search,
    Menu,
    X,
    Sprout,
    User,
    LogOut,
    ChevronDown,
    Settings,
    History,
    UserCircle,
    Globe,
    Users,
    Folders,
    Shield
} from 'lucide-react';

const NavButton = ({ children, primary = false, onClick }) => (
    <button
        onClick={onClick}
        className={`px-5 py-2.5 rounded-full font-medium transition-all duration-200 ${primary
            ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-300/50'
            : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
    >
        {children}
    </button>
);

export default function Layout({ children }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(!!getToken());
    const [user, setUserState] = useState(getUser());
    const navigate = useNavigate();
    const location = useLocation();
    const userMenuRef = useRef(null);

    // Fetch latest user info from server on mount and when token changes
    useEffect(() => {
        const fetchUserInfo = async () => {
            const token = getToken();
            if (token) {
                // First, use cached user data immediately
                const cachedUser = getUser();
                if (cachedUser) {
                    setUserState(cachedUser);
                    setIsLoggedIn(true);
                }

                try {
                    // Then fetch latest user info from server in background
                    const userData = await userAPI.getProfile();
                    // Update localStorage with latest data
                    setUser({
                        id: userData.id,
                        email: userData.email,
                        displayName: userData.displayName,
                        avatarUrl: userData.avatarUrl,
                    });
                    setUserState({
                        id: userData.id,
                        email: userData.email,
                        displayName: userData.displayName,
                        avatarUrl: userData.avatarUrl,
                    });
                    setIsLoggedIn(true);
                } catch (error) {
                    // Do not clear token here: 401 is already handled in api.js (clear + auth:unauthorized).
                    // Clearing on message containing "403" or "Unauthorized" can wrongly log out the user
                    // when backend returns 500/503 with such text in the body.
                    console.error('Failed to fetch user info:', error);
                    console.warn('Keeping cached session on profile fetch failure');
                    if (cachedUser) {
                        setUserState(cachedUser);
                        setIsLoggedIn(true);
                    }
                }
            } else {
                setIsLoggedIn(false);
                setUserState(null);
            }
        };

        fetchUserInfo();
    }, []);

    // Check auth status on location change (in case of login/logout elsewhere)
    useEffect(() => {
        const token = getToken();
        setIsLoggedIn(!!token);
        if (token) {
            // Try to get from localStorage first, but also fetch from server if needed
            const localUser = getUser();
            setUserState(localUser);
        } else {
            setUserState(null);
        }
    }, [location]);

    // When backend returns 401, session is cleared in api.js; update UI to show logged out (no redirect)
    useEffect(() => {
        const handleUnauthorized = () => {
            setIsLoggedIn(false);
            setUserState(null);
        };
        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, []);

    // Listen for user profile updates
    useEffect(() => {
        const handleUserUpdate = () => {
            setUserState(getUser());
        };

        window.addEventListener('userProfileUpdated', handleUserUpdate);

        return () => {
            window.removeEventListener('userProfileUpdated', handleUserUpdate);
        };
    }, []);

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };

        if (isUserMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isUserMenuOpen]);

    const handleLogout = () => {
        removeToken();
        removeUser();
        setIsUserMenuOpen(false);
        setIsLoggedIn(false);
        setUserState(null);
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <div
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => navigate('/')}
                            onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform shadow-sm">
                                <Sprout className="text-white" size={20} strokeWidth={2.5} />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-gray-900">
                                BlockFund
                            </span>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-8">
                            <Link to="/browse-campaigns" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors">Browse Projects</Link>
                            <a href="#" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors">How It Works</a>
                            <a href="#" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors">About Us</a>
                            <Link to="/blockchain-search" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1">
                                <Shield size={16} />
                                Blockchain Verify
                            </Link>
                        </div>

                        {/* Desktop Actions */}
                        <div className="hidden md:flex items-center gap-3">
                            <div className="relative hidden lg:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search campaigns..."
                                    className="pl-9 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 transition-all hover:bg-gray-50 border border-transparent hover:border-emerald-100"
                                />
                            </div>

                            {isLoggedIn ? (
                                <div className="relative" ref={userMenuRef}>
                                    <button
                                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-medium hover:bg-emerald-100 transition-colors cursor-pointer"
                                    >
                                        <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-emerald-200 flex items-center justify-center bg-white">
                                            {user?.avatarUrl ? (
                                                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={18} className="text-emerald-600" />
                                            )}
                                        </div>
                                        <span>{user?.displayName || 'User'}</span>
                                        <ChevronDown size={16} className={`transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isUserMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                                            <button
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    navigate('/profile');
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                            >
                                                <UserCircle size={18} />
                                                <span>Profile</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    navigate('/donation-history');
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                            >
                                                <History size={18} />
                                                <span>Donation History</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    navigate('/my-campaigns');
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                            >
                                                <Folders size={18} />
                                                <span>My Campaigns</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    navigate('/blockchain-search');
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                            >
                                                <Shield size={18} />
                                                <span>Blockchain Verify</span>
                                            </button>

                                            <div className="h-px bg-gray-100 my-1 mx-2"></div>

                                            <button
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    navigate('/settings');
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                            >
                                                <Settings size={18} />
                                                <span>Account Settings</span>
                                            </button>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                                            >
                                                <LogOut size={18} />
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link to="/login">
                                    <NavButton>Login</NavButton>
                                </Link>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white border-b border-gray-100 animate-in slide-in-from-top-5">
                        <div className="px-4 pt-2 pb-6 space-y-2">
                            <Link to="/browse-campaigns" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600" onClick={() => setIsMobileMenuOpen(false)}>Browse Projects</Link>
                            <Link to="/blockchain-search" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                                <Shield size={18} />
                                Blockchain Verify
                            </Link>
                            <a href="#" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600">How It Works</a>
                            <a href="#" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600">About Us</a>
                            <div className="pt-4 flex flex-col gap-2">
                                {isLoggedIn ? (
                                    <>
                                        <div className="w-full py-3 rounded-xl bg-emerald-50 font-medium text-emerald-700 text-center flex items-center justify-center gap-2">
                                            <User size={18} />
                                            <span>{user?.displayName || 'User'}</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setIsMobileMenuOpen(false);
                                                navigate('/profile');
                                            }}
                                            className="w-full py-3 rounded-xl border border-gray-200 font-medium text-gray-700 text-center hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <UserCircle size={18} />
                                            <span>Profile</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsMobileMenuOpen(false);
                                                navigate('/donation-history');
                                            }}
                                            className="w-full py-3 rounded-xl border border-gray-200 font-medium text-gray-700 text-center hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <History size={18} />
                                            <span>Donation History</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsMobileMenuOpen(false);
                                                navigate('/my-campaigns');
                                            }}
                                            className="w-full py-3 rounded-xl border border-gray-200 font-medium text-gray-700 text-center hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Folders size={18} />
                                            <span>My Campaigns</span>
                                        </button>
                                        <div className="h-px bg-gray-100 my-1"></div>
                                        <button
                                            onClick={() => {
                                                setIsMobileMenuOpen(false);
                                                navigate('/settings');
                                            }}
                                            className="w-full py-3 rounded-xl border border-gray-200 font-medium text-gray-700 text-center hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Settings size={18} />
                                            <span>Account Settings</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsMobileMenuOpen(false);
                                                handleLogout();
                                            }}
                                            className="w-full py-3 rounded-xl border border-red-200 font-medium text-red-600 text-center hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <LogOut size={18} />
                                            <span>Logout</span>
                                        </button>
                                    </>
                                ) : (
                                    <Link to="/login" className="w-full py-3 rounded-xl border border-gray-200 font-medium text-gray-700 text-center hover:bg-gray-50 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Page Content */}
            <div className="flex-grow">
                {children}
            </div>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-300 py-12 border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                        <div className="col-span-1 md:col-span-1">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-1.5 rounded-lg">
                                    <Sprout className="text-white" size={18} strokeWidth={2.5} />
                                </div>
                                <span className="text-xl font-bold text-white">BlockFund</span>
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Connecting every kind soul, making compassion know no distance.
                            </p>
                        </div>

                        <div>
                            <h4 className="text-white font-bold mb-4">About Us</h4>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#" className="hover:text-emerald-400 transition-colors">Platform Overview</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-bold mb-4">Help Center</h4>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#" className="hover:text-emerald-400 transition-colors">FAQ</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-bold mb-4">Follow Us</h4>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-emerald-600 cursor-pointer transition-colors">
                                    <Globe size={18} />
                                </div>
                                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-emerald-600 cursor-pointer transition-colors">
                                    <Users size={18} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
                        <p>© 2025 BlockFund Inc. All rights reserved.</p>
                        <div className="flex gap-6 mt-4 md:mt-0">
                            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
