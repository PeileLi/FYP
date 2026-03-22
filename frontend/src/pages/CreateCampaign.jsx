import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Sprout,
    Euro,
    Upload,
    X,
    Tag,
    FileText,
    AlertCircle,
    ArrowLeft,
    Image,
    File,
    Loader2,
    CheckCircle
} from 'lucide-react';
import { campaignAPI, uploadAPI } from '../utils/api';
import { CATEGORIES } from '@/utils/constants';

function FileTypeIcon({ contentType, className }) {
    if (contentType?.startsWith('image/')) return <Image size={18} className={className || 'text-blue-500'} />;
    if (contentType?.includes('pdf')) return <FileText size={18} className={className || 'text-red-500'} />;
    return <File size={18} className={className || 'text-gray-500'} />;
}

export default function CreateCampaign() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [uploadingCount, setUploadingCount] = useState(0);

    const [formData, setFormData] = useState({
        title: '',
        category: '',
        description: '',
        goalAmount: '',
    });

    const categories = CATEGORIES.filter(c => c.id !== 'all').map(c => ({ value: c.id, label: c.label }));

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFilesSelected = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setError('');

        const maxSize = 10 * 1024 * 1024;
        const oversized = files.filter(f => f.size > maxSize);
        if (oversized.length > 0) {
            setError(`File(s) too large (max 10MB): ${oversized.map(f => f.name).join(', ')}`);
            return;
        }

        setUploadingCount(prev => prev + files.length);

        for (const file of files) {
            try {
                const result = await uploadAPI.uploadFile(file);
                const isImage = result.isImage || result.contentType?.startsWith('image/');
                let preview = null;
                if (isImage) {
                    preview = await new Promise(resolve => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(file);
                    });
                }
                setUploadedFiles(prev => [...prev, {
                    name: result.fileName || file.name,
                    url: result.url,
                    contentType: result.contentType || file.type,
                    isImage,
                    preview,
                }]);
            } catch (err) {
                setError(prev => prev ? `${prev}; ${file.name}: ${err.message}` : `${file.name}: ${err.message}`);
            } finally {
                setUploadingCount(prev => prev - 1);
            }
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (Number(formData.goalAmount) <= 0) {
                setError('Goal amount must be positive');
                setIsLoading(false);
                return;
            }

            if (uploadedFiles.length === 0) {
                setError('Please upload at least one file (image or document)');
                setIsLoading(false);
                return;
            }

            const firstImage = uploadedFiles.find(f => f.isImage);

            const documents = uploadedFiles.map(f => ({
                name: f.name,
                url: f.url,
                docType: f.isImage ? 'PHOTO' : 'OTHER',
                isImage: f.isImage,
            }));

            await campaignAPI.create({
                title: formData.title || undefined,
                category: formData.category,
                description: formData.description,
                goalAmount: Number(formData.goalAmount),
                imageUrl: firstImage?.url || null,
                documents,
            });

            navigate('/');
        } catch (err) {
            setError(err.message || 'Failed to create campaign. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const imageFiles = uploadedFiles.filter(f => f.isImage);
    const docFiles = uploadedFiles.filter(f => !f.isImage);

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center text-gray-500 hover:text-gray-700 mb-4 transition-colors"
                    >
                        <ArrowLeft size={20} className="mr-2" />
                        Back to Home
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-2 rounded-lg">
                            <Sprout className="text-emerald-600" size={32} />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Create New Campaign</h1>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Campaign Title (optional) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Campaign Title <span className="text-gray-400 text-xs">(optional)</span>
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                maxLength="120"
                                className="block w-full px-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-transparent transition-all"
                                placeholder="Give your campaign a meaningful title"
                            />
                            <p className="mt-1.5 text-xs text-gray-500">
                                If left blank, a title will be auto-generated.
                            </p>
                        </div>

                        {/* Category Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Campaign Category <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Tag className="h-5 w-5 text-gray-400" />
                                </div>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-transparent transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Select a category...</option>
                                    {categories.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            <p className="mt-1.5 text-xs text-gray-500">
                                Choose the category that best describes your campaign.
                            </p>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Detailed Description <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute top-3 left-3 pointer-events-none">
                                    <FileText className="h-5 w-5 text-gray-400" />
                                </div>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    required
                                    rows="8"
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-transparent transition-all resize-none"
                                    placeholder={"Provide a detailed description of your campaign:\n\n• What is the purpose of this campaign?\n• Who will benefit from it?\n• How will the funds be used?\n• What impact do you expect to achieve?\n\nBe as specific as possible to help auditors review your campaign."}
                                />
                            </div>
                            <p className="mt-1.5 text-xs text-gray-500">
                                Provide comprehensive information about your cause, goals, and fund usage plan.
                            </p>
                        </div>

                        {/* Goal Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Goal Amount (€) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Euro className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    name="goalAmount"
                                    value={formData.goalAmount}
                                    onChange={handleChange}
                                    onWheel={(e) => e.target.blur()}
                                    required
                                    min="1"
                                    step="0.01"
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-transparent transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="mt-1.5 text-xs text-gray-500">
                                The campaign will automatically close once this goal amount is reached.
                            </p>
                        </div>

                        {/* File Upload Area */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Supporting Files <span className="text-red-500">*</span>
                            </label>

                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                                onChange={handleFilesSelected}
                                className="hidden"
                                id="fileUpload"
                            />
                            <label
                                htmlFor="fileUpload"
                                className="flex flex-col items-center justify-center w-full py-10 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all"
                            >
                                <Upload className="w-10 h-10 mb-3 text-gray-400" />
                                <p className="mb-1 text-sm text-gray-600">
                                    <span className="font-semibold text-emerald-600">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-400">
                                    Images, PDF, Word, Excel, Text — up to 10MB per file
                                </p>
                            </label>
                            <p className="mt-1.5 text-xs text-gray-500">
                                Upload images and documents to support your campaign. The first image will be used as the cover by default. Third-party auditors can select a different cover later.
                            </p>

                            {uploadingCount > 0 && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-indigo-600">
                                    <Loader2 size={16} className="animate-spin" />
                                    Uploading {uploadingCount} file{uploadingCount > 1 ? 's' : ''}...
                                </div>
                            )}

                            {/* Uploaded image previews */}
                            {imageFiles.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Images ({imageFiles.length})</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {imageFiles.map((f, i) => {
                                            const realIndex = uploadedFiles.indexOf(f);
                                            return (
                                                <div key={realIndex} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                                                    <img src={f.preview || f.url} alt={f.name} className="w-full h-32 object-cover" />
                                                    {i === 0 && (
                                                        <span className="absolute top-2 left-2 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow">
                                                            Cover
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFile(realIndex)}
                                                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                    <p className="px-2 py-1.5 text-[11px] text-gray-600 truncate">{f.name}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Uploaded document list */}
                            {docFiles.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Documents ({docFiles.length})</p>
                                    <div className="space-y-2">
                                        {docFiles.map((f) => {
                                            const realIndex = uploadedFiles.indexOf(f);
                                            return (
                                                <div key={realIndex} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                                                    <FileTypeIcon contentType={f.contentType} />
                                                    <span className="flex-1 text-sm text-gray-700 truncate">{f.name}</span>
                                                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFile(realIndex)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isLoading || uploadingCount > 0}
                                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-emerald-200 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
                            >
                                {uploadingCount > 0 ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Uploading Files...</span>
                                    </div>
                                ) : isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Submitting for Review...</span>
                                    </div>
                                ) : (
                                    "Submit Campaign"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
