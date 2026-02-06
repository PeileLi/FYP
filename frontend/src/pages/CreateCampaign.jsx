import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Sprout,
    Euro,
    Upload,
    X,
    Tag,
    FileText,
    AlertCircle,
    ArrowLeft
} from 'lucide-react';
import { campaignAPI, uploadAPI } from '../utils/api';

export default function CreateCampaign() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const [formData, setFormData] = useState({
        category: '',
        description: '',
        goalAmount: '',
        imageUrl: ''
    });

    // Predefined campaign categories
    const categories = [
        { value: 'disaster_relief', label: 'Disaster Relief' },
        { value: 'medical_assistance', label: 'Medical Assistance' },
        { value: 'education_support', label: 'Education Support' },
        { value: 'poverty_alleviation', label: 'Poverty Alleviation' },
        { value: 'environmental', label: 'Environmental Protection' },
        { value: 'community_development', label: 'Community Development' },
        { value: 'children_welfare', label: 'Children Welfare' },
        { value: 'elderly_care', label: 'Elderly Care' },
        { value: 'animal_welfare', label: 'Animal Welfare' },
        { value: 'other', label: 'Other' }
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file');
                return;
            }

            // Validate file size (50MB - matches backend and Supabase limit)
            if (file.size > 50 * 1024 * 1024) {
                setError('Image size must be less than 50MB');
                return;
            }

            setImageFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
            setError('');
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setFormData(prev => ({ ...prev, imageUrl: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Basic validation
            if (Number(formData.goalAmount) <= 0) {
                setError('Goal amount must be positive');
                setIsLoading(false);
                return;
            }

            // Upload image first if selected
            let imageUrl = formData.imageUrl;
            if (imageFile) {
                setIsUploading(true);
                try {
                    const uploadResult = await uploadAPI.uploadImage(imageFile);
                    imageUrl = uploadResult.url;
                } catch (uploadError) {
                    setError(uploadError.message || 'Failed to upload image');
                    setIsLoading(false);
                    setIsUploading(false);
                    return;
                }
                setIsUploading(false);
            }

            if (!imageUrl) {
                setError('Please select a campaign cover image');
                setIsLoading(false);
                return;
            }

            // Create campaign with uploaded image URL
            await campaignAPI.create({
                category: formData.category,
                description: formData.description,
                goalAmount: Number(formData.goalAmount),
                imageUrl: imageUrl
            });

            // Redirect to home
            navigate('/');
        } catch (err) {
            setError(err.message || 'Failed to create campaign. Please try again.');
        } finally {
            setIsLoading(false);
            setIsUploading(false);
        }
    };

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
                            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

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
                                        <option key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </option>
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
                                    placeholder="Provide a detailed description of your campaign:&#10;&#10;• What is the purpose of this campaign?&#10;• Who will benefit from it?&#10;• How will the funds be used?&#10;• What impact do you expect to achieve?&#10;&#10;Be as specific as possible to help auditors review your campaign."
                                />
                            </div>
                            <p className="mt-1.5 text-xs text-gray-500">
                                Provide comprehensive information about your cause, goals, and fund usage plan.
                            </p>
                        </div>

                        <div>
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
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Cover Image <span className="text-red-500">*</span>
                            </label>

                            {!imagePreview ? (
                                <div className="relative">
                                    <input
                                        type="file"
                                        id="imageUpload"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                    />
                                    <label
                                        htmlFor="imageUpload"
                                        className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-10 h-10 mb-3 text-gray-400" />
                                            <p className="mb-2 text-sm text-gray-500">
                                                <span className="font-semibold">Click to upload</span> or drag and drop
                                            </p>
                                            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 50MB</p>
                                        </div>
                                    </label>
                                </div>
                            ) : (
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-64 object-cover rounded-xl border border-gray-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            )}
                            <p className="mt-1.5 text-xs text-gray-500">
                                Upload an image to be displayed as the campaign cover.
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isLoading || isUploading}
                                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-emerald-200 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
                            >
                                {isUploading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Uploading Image...</span>
                                    </div>
                                ) : isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
