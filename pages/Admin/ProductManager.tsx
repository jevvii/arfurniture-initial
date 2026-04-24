
import React, { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Save, Upload, Box, AlertCircle, Image, PlusCircle, Loader2 } from 'lucide-react';
import { Product, ProductVariant } from '../../types';
import { db } from '../../services/db';
import { CURRENCY, resolveAssetUrl } from '../../constants';
import { ColorPicker } from '../../components/ColorPicker';

// Detect if running on localhost (laptop) vs dev tunnel (phone)
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const TUNNEL_URL = (import.meta as any).env?.VITE_AUTH_API_BASE?.replace(/\/$/, '') || 'http://localhost:4000';

// When on localhost: upload to localhost (fast, no size limits), save tunnel URL for mobile
// When on phone/tunnel: must upload through tunnel (may hit size limits)
const UPLOAD_BASE = isLocalhost ? 'http://localhost:4000' : TUNNEL_URL;

export const ProductManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // File refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const additionalImageInputRef = useRef<HTMLInputElement>(null);

  // Upload states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelFileName, setModelFileName] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingModel, setUploadingModel] = useState(false);

  // Additional images state
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [uploadingAdditionalImage, setUploadingAdditionalImage] = useState(false);

  // Variant management
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [newVariant, setNewVariant] = useState({
    name: '',
    color: '#000000',
    stock: '',
    imageUrl: '',
    arModelUrl: ''
  });
  const [variantFile, setVariantFile] = useState<File | null>(null);
  const [variantFileType, setVariantFileType] = useState<'image' | 'model'>('image');
  const [variantFilePreview, setVariantFilePreview] = useState('');
  const [uploadingVariant, setUploadingVariant] = useState(false);

  const variantFileInputRef = useRef<HTMLInputElement>(null);

  // Form State - ensure all values are always defined (never undefined) to prevent controlled/uncontrolled warnings
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: 'Chairs',
    color: '#000000',
    colorName: '',
    imageUrl: '',
    arModelUrl: '',
    width: '',
    height: '',
    unit: 'cm' as 'cm' | 'in',
    isFeatured: false,
    isNewArrival: false,
    isSale: false
  });

  // Helper to ensure input values are never undefined
  const safeValue = (value: string | number | boolean | undefined | null): string => {
    if (value === undefined || value === null) return '';
    return String(value);
  };

  useEffect(() => {
    const loadData = async () => {
      const data = await db.getProducts();
      setProducts(data);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await db.deleteProduct(id);
      setProducts(products.filter(p => p._id !== id));
    }
  };

  // Helper to extract filename from URL path
  const getFilenameFromUrl = (url: string): string => {
    if (!url) return '';
    const parts = url.split('/');
    return parts[parts.length - 1] || '';
  };

  const handleEdit = (product: Product) => {
    setEditingId(product._id);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      stock: product.stock?.toString() || '',
      category: product.category || 'Chairs',
      color: product.color || '#000000',
      colorName: product.colorName || '',
      imageUrl: product.imageUrl || '',
      arModelUrl: product.arModelUrl || '',
      width: product.dimensions?.width?.toString() || '',
      unit: product.dimensions?.unit || 'cm',
      isFeatured: product.isFeatured || false,
      isNewArrival: product.isNewArrival || false,
      isSale: product.isSale || false
    });
    // Reset upload states but show existing filenames
    setImageFile(null);
    setImagePreview(product.imageUrl || '');
    setModelFile(null);
    // Show existing model filename from URL
    setModelFileName(getFilenameFromUrl(product.arModelUrl || ''));
    // Load additional images
    setAdditionalImages(product.images || []);
    setVariants(product.variants || []);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      stock: '',
      category: 'Chairs',
      color: '#000000',
      colorName: '',
      imageUrl: '',
      arModelUrl: '',
      width: '',
      height: '',
      unit: 'cm',
      isFeatured: false,
      isNewArrival: false,
      isSale: false
    });
    // Reset upload states
    setImageFile(null);
    setImagePreview('');
    setModelFile(null);
    setModelFileName('');
    // Reset additional images
    setAdditionalImages([]);
    setVariants([]);
    setNewVariant({ name: '', color: '#000000', stock: '', imageUrl: '', arModelUrl: '' });
    setVariantFile(null);
    setVariantFileType('image');
    setVariantFilePreview('');
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (formError) setFormError('');
  };

  // Handle image file selection
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setFormError('Please select a valid image file');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview((e.target?.result as string) || '');
      };
      reader.readAsDataURL(file);
      if (formError) setFormError('');
    }
  };

  // Handle model file selection
  const handleModelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.glb')) {
        setFormError('Please select a valid .glb file');
        return;
      }
      setModelFile(file);
      setModelFileName(file.name);
      if (formError) setFormError('');
    }
  };

  // Upload file to server using FormData (actual file upload, not base64)
  // Files are organized into product-specific folders
  // Save as RELATIVE URL so it works from any host (localhost, LAN IP, or tunnel)
  // Server automatically deletes old files in the product folder
  const uploadFile = async (file: File, type: 'image' | 'model', productName?: string, variantName?: string): Promise<string> => {
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    // Pass productName and variantName as query params
    const folderName = encodeURIComponent(productName || 'uncategorized');
    const vName = variantName ? encodeURIComponent(variantName) : '';

    const response = await fetch(`${UPLOAD_BASE}/api/upload/${type}?productName=${folderName}&variantName=${vName}`, {
      method: 'POST',
      body: formDataUpload
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = await response.json();
    // Return RELATIVE path - will work from any host (localhost, LAN IP, tunnel)
    return result.url;
  };

  // Upload additional image (to gallery subfolder)
  const uploadAdditionalImage = async (file: File, productName?: string): Promise<string> => {
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    const folderName = encodeURIComponent(productName || 'uncategorized');

    const response = await fetch(`${UPLOAD_BASE}/api/upload/additional-image?productName=${folderName}`, {
      method: 'POST',
      body: formDataUpload
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = await response.json();
    return result.url;
  };

  // Delete additional image from server
  const deleteAdditionalImage = async (imageUrl: string): Promise<void> => {
    await fetch(`${UPLOAD_BASE}/api/upload/additional-image?url=${encodeURIComponent(imageUrl)}`, {
      method: 'DELETE'
    });
  };

  // Additional images handlers
  const handleAdditionalImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setFormError('Please select a valid image file');
        return;
      }
      try {
        setUploadingAdditionalImage(true);
        const uploadedUrl = await uploadAdditionalImage(file, formData.name);
        setAdditionalImages(prev => [...prev, uploadedUrl]);
      } catch (err) {
        setFormError('Failed to upload additional image');
      } finally {
        setUploadingAdditionalImage(false);
        // Reset the input
        if (additionalImageInputRef.current) {
          additionalImageInputRef.current.value = '';
        }
      }
    }
  };

  const handleRemoveAdditionalImage = async (index: number) => {
    const imageUrl = additionalImages[index];
    // Delete from server if it's a local file
    if (imageUrl.startsWith('/products/')) {
      try {
        await deleteAdditionalImage(imageUrl);
      } catch (err) {
        console.error('Failed to delete image from server:', err);
      }
    }
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
  };

  // Variant Handlers
  const handleVariantFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate based on file type
      if (variantFileType === 'image') {
        if (!file.type.startsWith('image/')) {
          setFormError('Please select a valid image file');
          return;
        }
        setVariantFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => {
          setVariantFilePreview((ev.target?.result as string) || '');
        };
        reader.readAsDataURL(file);
      } else {
        if (!file.name.toLowerCase().endsWith('.glb')) {
          setFormError('Please select a valid .glb file');
          return;
        }
        setVariantFile(file);
        setVariantFilePreview(file.name);
      }
    }
  };

  const handleAddVariant = async () => {
    if (!newVariant.name || !newVariant.color) {
      setFormError('Variant name and color are required');
      return;
    }

    // Check that we have exactly ONE file (either new upload or existing URL)
    const hasFile = variantFile || newVariant.imageUrl || newVariant.arModelUrl;
    if (!hasFile) {
      setFormError('Variant file is required (either image or 3D model)');
      return;
    }

    // Check if we're editing an existing product
    if (!editingId) {
      setFormError('Please save the product first before adding variants');
      return;
    }

    try {
      setUploadingVariant(true);
      let imageUrl = newVariant.imageUrl;
      let modelUrl = newVariant.arModelUrl;

      // Upload the file if one was selected
      if (variantFile) {
        const uploadedUrl = await uploadFile(variantFile, variantFileType, formData.name, newVariant.name);
        if (variantFileType === 'image') {
          imageUrl = uploadedUrl;
        } else {
          modelUrl = uploadedUrl;
        }
      }

      let updatedVariants;
      if (editingVariantId) {
        // Update existing variant
        updatedVariants = variants.map(v => v.id === editingVariantId ? {
          ...v,
          name: newVariant.name,
          color: newVariant.color,
          stock: parseInt(newVariant.stock) || 0,
          imageUrl: imageUrl,
          arModelUrl: modelUrl
        } : v);
        setEditingVariantId(null);
      } else {
        // Add new variant
        const variantToAdd: ProductVariant = {
          id: Date.now().toString(),
          name: newVariant.name,
          color: newVariant.color,
          stock: parseInt(newVariant.stock) || 0,
          imageUrl: imageUrl,
          arModelUrl: modelUrl
        };
        updatedVariants = [...variants, variantToAdd];
      }

      // Immediately save to database
      const productData = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
        images: additionalImages,
        variants: updatedVariants,
        dimensions: {
          width: parseFloat(formData.width) || 0,
          height: parseFloat(formData.height) || 0,
          depth: parseFloat(formData.depth) || 0,
          unit: formData.unit
        }
      };

      const updated = await db.updateProduct(editingId, productData);
      setProducts(prev => prev.map(p => p._id === editingId ? updated : p));
      setVariants(updatedVariants);

      // Reset form
      setNewVariant({ name: '', color: '#000000', stock: '', imageUrl: '', arModelUrl: '' });
      setVariantFile(null);
      setVariantFileType('image');
      setVariantFilePreview('');
      setFormError('');

    } catch (error) {
      console.error("Failed to add variant", error);
      setFormError("Failed to upload variant assets");
    } finally {
      setUploadingVariant(false);
    }
  };

  const handleRemoveVariant = async (id: string) => {
    if (!editingId) {
      // If not editing a product, just remove from local state
      setVariants(prev => prev.filter(v => v.id !== id));
      if (editingVariantId === id) {
        setEditingVariantId(null);
        setNewVariant({ name: '', color: '#000000', stock: '', imageUrl: '', arModelUrl: '' });
        setVariantFile(null);
        setVariantFileType('image');
        setVariantFilePreview('');
      }
      return;
    }

    try {
      // Remove from local state
      const updatedVariants = variants.filter(v => v.id !== id);
      setVariants(updatedVariants);

      // Immediately save to database (this will trigger backend cleanup)
      const productData = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
        images: additionalImages,
        variants: updatedVariants,
        dimensions: {
          width: parseFloat(formData.width) || 0,
          height: parseFloat(formData.height) || 0,
          depth: parseFloat(formData.depth) || 0,
          unit: formData.unit
        }
      };

      const updated = await db.updateProduct(editingId, productData);
      setProducts(prev => prev.map(p => p._id === editingId ? updated : p));

      if (editingVariantId === id) {
        setEditingVariantId(null);
        setNewVariant({ name: '', color: '#000000', stock: '', imageUrl: '', arModelUrl: '' });
        setVariantFile(null);
        setVariantFileType('image');
        setVariantFilePreview('');
      }
    } catch (error) {
      console.error("Failed to remove variant", error);
      setFormError("Failed to remove variant");
    }
  };

  const handleEditVariant = (variant: ProductVariant) => {
    console.log("Editing variant:", variant);
    setEditingVariantId(variant.id);
    setNewVariant({
      name: variant.name || '',
      color: variant.color || '#000000',
      stock: variant.stock?.toString() || '0',
      imageUrl: variant.imageUrl || '',
      arModelUrl: variant.arModelUrl || ''
    });
    // Determine which file type is present
    if (variant.imageUrl) {
      setVariantFileType('image');
      setVariantFilePreview(variant.imageUrl);
    } else if (variant.arModelUrl) {
      setVariantFileType('model');
      setVariantFilePreview(getFilenameFromUrl(variant.arModelUrl));
    }
    setVariantFile(null); // Clear any pending file

    // Scroll to variant form
    const variantForm = document.getElementById('variant-form');
    if (variantForm) variantForm.scrollIntoView({ behavior: 'smooth' });
  };

  const cancelEditVariant = () => {
    setEditingVariantId(null);
    setNewVariant({ name: '', color: '#000000', stock: '', imageUrl: '', arModelUrl: '' });
    setVariantFile(null);
    setVariantFileType('image');
    setVariantFilePreview('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) return "Product name is required";
    if (parseFloat(formData.price) < 0) return "Price cannot be negative";
    if (parseInt(formData.stock) < 0) return "Stock cannot be negative";
    // Validate image - require file upload if no existing image
    if (!imageFile && !formData.imageUrl && !editingId) return "Please select an image file";
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
      let finalModelUrl = formData.arModelUrl;

      // Upload image file if selected
      if (imageFile) {
        setUploadingImage(true);
        finalImageUrl = await uploadFile(imageFile, 'image', formData.name);
        setUploadingImage(false);
      }

      // Upload model file if selected
      if (modelFile) {
        setUploadingModel(true);
        finalModelUrl = await uploadFile(modelFile, 'model', formData.name);
        setUploadingModel(false);
      }

      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
        category: formData.category,
        color: formData.color,
        colorName: formData.colorName,
        imageUrl: finalImageUrl,
        images: additionalImages,
        variants: variants,
        arModelUrl: finalModelUrl,
        dimensions: {
          width: parseFloat(formData.width) || 0,
          height: parseFloat(formData.height) || 0,
          depth: parseFloat(formData.depth) || 0,
          unit: formData.unit
        },
        isFeatured: formData.isFeatured,
        isNewArrival: formData.isNewArrival,
        isSale: formData.isSale
      };

      if (editingId) {
        // Update
        const updated = await db.updateProduct(editingId, productData);
        setProducts(prev => prev.map(p => p._id === editingId ? updated : p));
      } else {
        // Create
        const created = await db.createProduct(productData);
        setProducts(prev => [...prev, created]);
      }

      setIsModalOpen(false);
      setEditingId(null);

      // Reset form
      setFormData({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: 'Chairs',
        color: '#000000',
        colorName: '',
        imageUrl: '',
        arModelUrl: '',
        width: '',
        height: '',
        unit: 'cm',
        isFeatured: false,
        isNewArrival: false,
        isSale: false
      });
      // Reset upload states
      setImageFile(null);
      setImagePreview('');
      setModelFile(null);
      setModelFileName('');
      // Reset additional images
      setAdditionalImages([]);
      setVariants([]);
      setNewVariant({ name: '', color: '#000000', stock: '', imageUrl: '', arModelUrl: '' });
      setVariantFile(null);
      setVariantFileType('image');
      setVariantFilePreview('');
    } catch (err) {
      setFormError("Failed to save product. Please try again.");
      setUploadingImage(false);
      setUploadingModel(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Product Management</h1>
          <p className="text-slate-500 text-sm">Manage inventory and AR assets</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tags</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading...</td></tr>
              ) : (
                products.map((product) => (
                  <tr key={product._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-slate-100 overflow-hidden border border-slate-200">
                          <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{product.name}</div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {/* Show default/main color */}
                            {product.color && (
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: product.color }}></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{product.colorName || 'Default'}</span>
                              </div>
                            )}

                            {/* Show variant colors */}
                            {product.variants && product.variants.length > 0 && (
                              <>
                                {product.variants.slice(0, 3).map((variant, idx) => (
                                  <div key={variant.id} className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: variant.color }}></div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{variant.name}</span>
                                  </div>
                                ))}
                                {product.variants.length > 3 && (
                                  <span className="text-[10px] font-bold text-slate-400">+{product.variants.length - 3}</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{product.category}</td>
                    <td className="px-6 py-4 text-slate-900 font-medium text-sm">{CURRENCY}{product.price.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.stock > 10 ? 'bg-green-100 text-green-700' : product.stock > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {product.stock} units
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {product.isFeatured && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded w-fit">Featured</span>}
                        {product.isNewArrival && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded w-fit">New</span>}
                        {product.isSale && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded w-fit">Sale</span>}
                        {product.arModelUrl && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded w-fit">AR Ready</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!loading && products.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No products found. Add your first one!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar">

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <form id="addProductForm" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Product Name *</label>
                      <input name="name" required value={formData.name || ''} onChange={handleInputChange} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="e.g. Modern Sofa" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                      <select name="category" value={formData.category || 'Chairs'} onChange={handleInputChange} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                        <option value="Chairs">Chairs</option>
                        <option value="Sofas">Sofas</option>
                        <option value="Tables">Tables</option>
                        <option value="Decor">Decor</option>
                        <option value="Storage">Storage</option>
                        <option value="Beds">Beds</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Price ({CURRENCY}) *</label>
                        <input type="number" step="0.01" min="0" name="price" required value={formData.price || ''} onChange={handleInputChange} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Stock *</label>
                        <input type="number" min="0" name="stock" required value={formData.stock || ''} onChange={handleInputChange} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0" />
                      </div>
                    </div>
                    <div className="flex gap-4 items-end">
                      <div className="flex-[2]">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Color Name *</label>
                        <input
                          type="text"
                          name="colorName"
                          required
                          value={formData.colorName || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-[42px]"
                          placeholder="e.g. Light Oak"
                        />
                      </div>
                      <div className="flex-[1.5]">
                        <ColorPicker
                          label="Color Value *"
                          value={formData.color}
                          onChange={(color) => setFormData(prev => ({ ...prev, color }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Product Image *</label>
                      <div className="flex gap-2">
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="flex-1 px-4 py-2 rounded-lg border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left text-sm text-slate-600"
                        >
                          {imageFile ? imageFile.name : (formData.imageUrl ? getFilenameFromUrl(formData.imageUrl) : 'Click to select image...')}
                        </button>
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-200 overflow-hidden">
                          {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" /> : <Upload className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>
                      {uploadingImage && <p className="text-xs text-indigo-600 mt-1">Uploading image...</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">AR Model (.glb)</label>
                      <input
                        ref={modelInputRef}
                        type="file"
                        accept=".glb"
                        onChange={handleModelFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => modelInputRef.current?.click()}
                        className="w-full px-4 py-2 rounded-lg border border-dashed border-slate-300 hover:border-purple-400 hover:bg-purple-50 transition-colors text-left text-sm text-slate-600 flex items-center gap-2"
                      >
                        <Box className="w-4 h-4 text-purple-500" />
                        {modelFile ? modelFileName : (formData.arModelUrl ? getFilenameFromUrl(formData.arModelUrl) : 'Click to select .glb file...')}
                      </button>
                      {uploadingModel && <p className="text-xs text-purple-600 mt-1">Uploading model...</p>}
                    </div>

                    {/* Tags Section */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <label className="block text-sm font-semibold text-slate-900 mb-2">Tags & Collections</label>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" name="isFeatured" checked={!!formData.isFeatured} onChange={handleInputChange} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                          <span className="text-sm text-slate-700">Featured Collection</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" name="isNewArrival" checked={!!formData.isNewArrival} onChange={handleInputChange} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                          <span className="text-sm text-slate-700">New Arrival</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input type="checkbox" name="isSale" checked={!!formData.isSale} onChange={handleInputChange} className="w-4 h-4 text-[#CD3C32] rounded border-slate-300 focus:ring-red-500" />
                          <span className="text-sm text-slate-700 group-hover:text-red-700 transition-colors">On Sale</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Images Section */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-slate-900">
                      <Image className="w-4 h-4 inline mr-1.5" />
                      Additional Images ({additionalImages.length})
                    </label>
                  </div>

                  {/* Upload additional image */}
                  <div className="mb-3">
                    <input
                      ref={additionalImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAdditionalImageFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => additionalImageInputRef.current?.click()}
                      disabled={uploadingAdditionalImage}
                      className="w-full px-3 py-2 rounded-lg border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-sm text-slate-600 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {uploadingAdditionalImage ? (
                        <>Uploading...</>
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4" />
                          Click to upload additional image
                        </>
                      )}
                    </button>
                  </div>

                  {/* Image gallery */}
                  {additionalImages.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {additionalImages.map((img, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white">
                            <img src={img} alt={`Additional ${index + 1}`} className="w-full h-full object-cover" />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdditionalImage(index)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-2">No additional images added</p>
                  )}
                </div>

                {/* Variants Section */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                  <label className="block text-sm font-semibold text-slate-900 mb-3">Product Variants</label>

                  {/* List of existing variants */}
                  {variants.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {variants.map((v) => (
                        <div key={v.id} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200">
                          <div className="w-10 h-10 rounded overflow-hidden bg-slate-100 flex-shrink-0">
                            <img src={resolveAssetUrl(v.imageUrl)} alt={v.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="w-6 h-6 rounded-full border border-slate-200 flex-shrink-0" style={{ backgroundColor: v.color }}></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">{v.name}</div>
                            <div className="text-xs text-slate-500">Stock: {v.stock || 0}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditVariant(v)}
                              className={`p-1 rounded transition-colors ${editingVariantId === v.id ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'}`}
                              title="Edit variant"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(v.id)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Delete variant"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add/Edit Variant Form */}
                  <div id="variant-form" className={`p-3 rounded-lg border-2 transition-all space-y-3 ${editingVariantId ? 'bg-indigo-50/30 border-indigo-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                          {editingVariantId ? 'Editing Variant' : 'Add New Variant'}
                        </div>
                        {variantFileType === 'image' && (variantFilePreview || newVariant.imageUrl) && (
                          <div className="w-6 h-6 rounded bg-slate-100 border border-slate-200 overflow-hidden">
                            <img src={variantFilePreview ? (variantFilePreview.startsWith('data:') ? variantFilePreview : resolveAssetUrl(variantFilePreview)) : resolveAssetUrl(newVariant.imageUrl)} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      {editingVariantId && (
                        <button
                          onClick={cancelEditVariant}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Cancel
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          placeholder="Name (e.g. Red)"
                          value={newVariant.name}
                          onChange={e => setNewVariant(prev => ({ ...prev, name: e.target.value }))}
                          className="flex-[2] px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-[42px]"
                        />
                        <div className="flex-1 min-w-[120px]">
                          <ColorPicker
                            value={newVariant.color}
                            onChange={(color) => setNewVariant(prev => ({ ...prev, color }))}
                          />
                        </div>
                        <input
                          placeholder="Stock"
                          type="number"
                          min="0"
                          value={newVariant.stock}
                          onChange={e => setNewVariant(prev => ({ ...prev, stock: e.target.value }))}
                          className="w-16 px-2 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-[42px]"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        {/* File Type Selector */}
                        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setVariantFileType('image')}
                            className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${variantFileType === 'image' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                          >
                            <Image className="w-4 h-4 mx-auto" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setVariantFileType('model')}
                            className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${variantFileType === 'model' ? 'bg-purple-600 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                          >
                            <Box className="w-4 h-4 mx-auto" />
                          </button>
                        </div>

                        {/* Single File Upload */}
                        <input
                          ref={variantFileInputRef}
                          type="file"
                          accept={variantFileType === 'image' ? 'image/*' : '.glb'}
                          onChange={handleVariantFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => variantFileInputRef.current?.click()}
                          className={`flex-1 px-3 py-2 border border-dashed rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 h-[42px] transition-colors ${variantFile || (variantFileType === 'image' ? newVariant.imageUrl : newVariant.arModelUrl)
                            ? (variantFileType === 'image' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-purple-50 border-purple-200 text-purple-600')
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                            }`}
                        >
                          {variantFileType === 'image' ? <Image className="w-4 h-4" /> : <Box className="w-4 h-4" />}
                          {variantFile
                            ? `New: ${variantFile.name}`
                            : (variantFileType === 'image'
                              ? (newVariant.imageUrl ? 'Image Ready' : 'Upload Image')
                              : (newVariant.arModelUrl ? 'Model Ready' : 'Upload Model')
                            )
                          }
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddVariant}
                        disabled={uploadingVariant}
                        className={`w-full h-[42px] px-4 flex items-center justify-center gap-2 rounded-lg transition-all shadow-sm font-medium text-sm ${editingVariantId ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-900 text-white hover:bg-slate-800'} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {uploadingVariant ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {editingVariantId ? 'Updating...' : 'Uploading...'}
                          </>
                        ) : editingVariantId ? (
                          <>
                            <Save className="w-4 h-4" />
                            Update Variant
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Add Variant
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                  <textarea name="description" rows={3} value={formData.description || ''} onChange={handleInputChange} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Product details..." />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <label className="block text-sm font-semibold text-slate-900 mb-3">Dimensions</label>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <span className="text-xs text-slate-500 mb-1 block">Width</span>
                      <input type="number" name="width" value={formData.width || ''} onChange={handleInputChange} className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm outline-none focus:border-indigo-500" placeholder="W" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 mb-1 block">Height</span>
                      <input type="number" name="height" value={formData.height || ''} onChange={handleInputChange} className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm outline-none focus:border-indigo-500" placeholder="H" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 mb-1 block">Depth</span>
                      <input type="number" name="depth" value={formData.depth || ''} onChange={handleInputChange} className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm outline-none focus:border-indigo-500" placeholder="D" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 mb-1 block">Unit</span>
                      <select name="unit" value={formData.unit || 'cm'} onChange={handleInputChange} className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm outline-none focus:border-indigo-500 bg-white">
                        <option value="cm">cm</option>
                        <option value="in">in</option>
                      </select>
                    </div>
                  </div>
                </div>


              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="addProductForm"
                disabled={isSubmitting}
                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm shadow-indigo-600/20 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> {editingId ? 'Update Product' : 'Save Product'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
