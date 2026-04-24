import React, { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Save, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { MarketingBanner } from '../../types';
import { db } from '../../services/db';
import { resolveAssetUrl } from '../../constants';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const TUNNEL_URL = (import.meta as any).env?.VITE_AUTH_API_BASE?.replace(/\/$/, '') || 'http://localhost:4000';
const UPLOAD_BASE = isLocalhost ? 'http://localhost:4000' : TUNNEL_URL;

export const MarketingManager: React.FC = () => {
    const [banners, setBanners] = useState<MarketingBanner[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [uploadingImage, setUploadingImage] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        description: '',
        badgeText: '',
        buttonText: 'SHOP NOW',
        link: '/',
        imageUrl: '',
        isActive: true
    });

    useEffect(() => {
        loadBanners();
    }, []);

    const loadBanners = async () => {
        try {
            setLoading(true);
            const data = await db.getBanners();
            setBanners(data);
        } catch (err) {
            console.error('Failed to load banners', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this banner? This action cannot be undone.')) {
            try {
                await db.deleteBanner(id);
                setBanners(banners.filter(b => b._id !== id));
            } catch (err) {
                alert('Failed to delete banner');
            }
        }
    };

    const handleEdit = (banner: MarketingBanner) => {
        setEditingId(banner._id);
        setFormData({
            title: banner.title || '',
            subtitle: banner.subtitle || '',
            description: banner.description || '',
            badgeText: banner.badgeText || '',
            buttonText: banner.buttonText || '',
            link: banner.link || '',
            imageUrl: banner.imageUrl || '',
            isActive: banner.isActive !== undefined ? banner.isActive : true
        });
        setImageFile(null);
        setImagePreview(banner.imageUrl || '');
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingId(null);
        setFormData({
            title: '',
            subtitle: '',
            description: '',
            badgeText: '',
            buttonText: 'SHOP NOW',
            link: '/',
            imageUrl: '',
            isActive: true
        });
        setImageFile(null);
        setImagePreview('');
        setIsModalOpen(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (formError) setFormError('');
    };

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setFormError('Please select a valid image file');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => {
                setImagePreview((ev.target?.result as string) || '');
            };
            reader.readAsDataURL(file);
            if (formError) setFormError('');
        }
    };

    const uploadFile = async (file: File): Promise<string> => {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        const response = await fetch(`${UPLOAD_BASE}/api/upload/image?productName=banners`, {
            method: 'POST',
            body: formDataUpload
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const result = await response.json();
        return result.url;
    };

    const validateForm = () => {
        if (!formData.title.trim()) return "Title is required";
        if (!formData.description.trim()) return "Description is required";
        if (!formData.buttonText.trim()) return "Button text is required";
        if (!formData.link.trim()) return "Link URL is required";
        if (!imageFile && !formData.imageUrl) return "Please select a banner image file";
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const error = validateForm();
        if (error) {
            setFormError(error);
            return;
        }

        setIsSubmitting(true);

        try {
            let finalImageUrl = formData.imageUrl;

            if (imageFile) {
                setUploadingImage(true);
                finalImageUrl = await uploadFile(imageFile);
                setUploadingImage(false);
            }

            const bannerData = {
                title: formData.title,
                subtitle: formData.subtitle,
                description: formData.description,
                badgeText: formData.badgeText,
                buttonText: formData.buttonText,
                link: formData.link,
                imageUrl: finalImageUrl,
                isActive: formData.isActive
            };

            if (editingId) {
                const updated = await db.updateBanner(editingId, bannerData);
                setBanners(prev => prev.map(b => b._id === editingId ? updated : b));
            } else {
                const created = await db.createBanner(bannerData);
                setBanners(prev => [...prev, created]);
            }

            setIsModalOpen(false);
            setEditingId(null);
        } catch (err) {
            setFormError("Failed to save banner. Please try again.");
            setUploadingImage(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Marketing Manager</h1>
                    <p className="text-slate-500 text-sm">Manage front-page carousel banners</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
                >
                    <Plus className="w-4 h-4" /> Add Banner
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Banner</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading...</td></tr>
                            ) : (
                                banners.map((banner) => (
                                    <tr key={banner._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="w-32 h-16 rounded overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                                                {banner.imageUrl ? (
                                                    <img src={resolveAssetUrl(banner.imageUrl)} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="text-slate-400 text-xs text-center p-2">No Image</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{banner.title}</div>
                                            <div className="text-slate-500 text-xs mt-1 max-w-xs truncate">{banner.description}</div>
                                            <div className="text-indigo-600 text-xs mt-1">Link: {banner.link}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${banner.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {banner.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(banner)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(banner._id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                            {!loading && banners.length === 0 && (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">No banners found. Add your first one!</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Banner' : 'Add New Banner'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {formError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {formError}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">

                                {/* Image Upload Area */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Banner Image *</label>
                                    <p className="text-xs text-slate-500 mb-3 block">Suggested Resolution: <span className="font-bold text-slate-700">1920x800px</span> (or approx 2.4:1 ratio for uniform carousel sizing).</p>

                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 hover:bg-slate-50 transition-colors relative group">
                                        <input
                                            type="file"
                                            ref={imageInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageFileChange}
                                        />

                                        {imagePreview ? (
                                            <div className="relative rounded-lg overflow-hidden group-hover:opacity-90 transition-opacity flex items-center justify-center bg-slate-100 aspect-[2.4/1]">
                                                <img src={imagePreview.startsWith('data:') ? imagePreview : resolveAssetUrl(imagePreview)} alt="Banner Preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button type="button" onClick={() => imageInputRef.current?.click()} className="bg-white text-slate-900 px-4 py-2 rounded-lg font-medium text-sm">
                                                        Change Image
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-8" onClick={() => imageInputRef.current?.click()}>
                                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform cursor-pointer">
                                                    <Upload className="w-6 h-6" />
                                                </div>
                                                <p className="text-sm font-medium text-slate-900 mb-1">Click to upload image</p>
                                                <p className="text-xs text-slate-500">PNG, JPG up to 5MB</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Title *</label>
                                            <input name="title" required value={formData.title} onChange={handleInputChange} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="e.g. Summer Sale" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Subtitle</label>
                                            <input name="subtitle" value={formData.subtitle} onChange={handleInputChange} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. up to 50% off" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Badge Text</label>
                                            <input name="badgeText" value={formData.badgeText} onChange={handleInputChange} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. HOT" />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Description *</label>
                                            <textarea name="description" required rows={3} value={formData.description} onChange={handleInputChange} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Brief description visible on the banner..." />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1">Button Text *</label>
                                                <input name="buttonText" required value={formData.buttonText} onChange={handleInputChange} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. SHOP NOW" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1">Link URL *</label>
                                                <input name="link" required value={formData.link} onChange={handleInputChange} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. /?filter=sale" />
                                            </div>
                                        </div>
                                        <div className="flex items-center mt-2">
                                            <label className="text-sm font-semibold text-slate-700 mr-3 flex-grow">Active Status</label>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleInputChange} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 mt-6 border-t border-slate-200 flex justify-end gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-lg text-slate-600 font-medium hover:bg-slate-100 transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={isSubmitting || uploadingImage} className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center min-w-[140px] shadow-md shadow-indigo-600/20 disabled:opacity-70 disabled:cursor-not-allowed">
                                        {isSubmitting || uploadingImage ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {uploadingImage ? 'Uploading...' : 'Saving...'}</>
                                        ) : (
                                            <><Save className="w-4 h-4 mr-2" /> Save Banner</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
