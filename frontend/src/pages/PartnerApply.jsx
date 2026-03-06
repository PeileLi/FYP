import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    Mail,
    FileText,
    CheckCircle,
    AlertCircle,
    Handshake,
    ArrowLeft,
} from 'lucide-react';
import { partnerAPI } from '@/utils/api';

export default function PartnerApply() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        organizationName: '',
        email: '',
        description: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await partnerAPI.apply(form);
            setSubmitted(true);
        } catch (err) {
            setError(err.message || 'Submission failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
                        <div className="flex justify-center mb-5">
                            <div className="bg-emerald-100 p-4 rounded-full">
                                <CheckCircle className="text-emerald-600" size={40} />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">Application Submitted</h2>
                        <p className="text-gray-500 mb-6 leading-relaxed">
                            Thank you for applying to become a partner. Our team will review your
                            application and send your account credentials to <strong>{form.email}</strong> once approved.
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-12 px-4">
            <div className="max-w-xl mx-auto">
                {/* Header */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back
                </button>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-100 p-2.5 rounded-xl">
                            <Handshake className="text-blue-600" size={24} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Partner Application</h1>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-6">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Organization Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    name="organizationName"
                                    value={form.organizationName}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. Green Future Foundation"
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="partner@organization.com"
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                About Your Organization <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    required
                                    rows={4}
                                    placeholder="Describe your organization, mission, and why you'd like to partner with BlockFund..."
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-lg shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Submitting...</span>
                                </div>
                            ) : (
                                'Submit Application'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
