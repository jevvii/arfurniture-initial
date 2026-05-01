
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ShoppingCart, Box, Wand2, Send, Smartphone, Truck, RefreshCw, ShieldCheck, Image as ImageIcon, CheckCircle, Plus, Minus } from 'lucide-react';
import { Product, ProductVariant } from '../../types';
import { db } from '../../services/db';
import { askProductAssistant } from '../../services/gemini';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { ModelViewerWrapper } from '../../components/ModelViewerWrapper';
import { ColorTintedImage } from '../../components/ColorTintedImage';
import { QRCodeModal } from '../../components/QRCodeModal';
import { CURRENCY, resolveAssetUrl } from '../../constants';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [product, setProduct] = useState<Product | undefined>();
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // AR Launch overlay (shown when coming from QR scan)
  const [showARLaunch, setShowARLaunch] = useState(false);
  const modelViewerRef = useRef<HTMLElement | null>(null);

  // View State
  const [viewMode, setViewMode] = useState<'image' | '3d'>('image');
  const [activeImage, setActiveImage] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);

  // Cart & Modal State
  const { cart, addToCart } = useCart();
  const { user } = useAuth();
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Chat state
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatAnswer, setChatAnswer] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  const maxAvailable = (selectedVariant?.stock ?? product?.stock ?? 0);
  
  const getInCartQuantity = () => {
    if (!product) return 0;
    return cart.find(item => 
      item._id === product._id && 
      (selectedVariant ? item.selectedVariant?.id === selectedVariant.id : !item.selectedVariant)
    )?.quantity || 0;
  };

  const availableToAdd = Math.max(0, maxAvailable - getInCartQuantity());
  const isAvailable = maxAvailable > 0;
  const isLowStock = maxAvailable > 0 && maxAvailable < 5;

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        setLoading(true);
        // Fetch current product and all products for recommendations
        const [currentProduct, allProducts] = await Promise.all([
          db.getProductById(id),
          db.getProducts()
        ]);

        setProduct(currentProduct);

        if (currentProduct) {
          setSelectedVariant(undefined);
          setActiveImage(resolveAssetUrl(currentProduct.imageUrl));

          // Filter related products: Same category, exclude current
          const related = allProducts
            .filter(p => p.category === currentProduct.category && p._id !== currentProduct._id)
            .slice(0, 4);

          // If we don't have enough same-category items, fill with others
          if (related.length < 4) {
            const others = allProducts
              .filter(p => p._id !== currentProduct._id && !related.find(r => r._id === p._id))
              .slice(0, 4 - related.length);
            setRelatedProducts([...related, ...others]);
          } else {
            setRelatedProducts(related);
          }
        }

        // Reset state for new product
        setViewMode('image'); // Reset to image default
        setChatAnswer('');
        setChatQuestion('');
        setLoading(false);
        setQuantity(1);
      }
    };
    loadData();
  }, [id]);

  // Check for AR launch parameter from QR code scan
  useEffect(() => {
    if (searchParams.get('ar') === 'true' && product && !loading) {
      setShowARLaunch(true);
      // Clear the ar param from URL
      searchParams.delete('ar');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, product, loading]);

  // Function to trigger AR on model-viewer
  const launchAR = () => {
    setShowARLaunch(false);
    setViewMode('3d');

    // Wait for model-viewer to mount, then trigger AR
    setTimeout(() => {
      const modelViewer = document.querySelector('model-viewer');
      if (modelViewer && (modelViewer as any).activateAR) {
        (modelViewer as any).activateAR();
      }
    }, 500);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !chatQuestion.trim()) return;

    setIsChatting(true);
    const answer = await askProductAssistant(chatQuestion, product);
    setChatAnswer(answer);
    setIsChatting(false);
  }

  const handleAddToCart = async () => {
    if (!product || isAddingToCart) return;
    
    if (availableToAdd <= 0) {
      setIsStockModalOpen(true);
      return;
    }

    if (quantity > availableToAdd) {
        setQuantity(availableToAdd);
        setIsStockModalOpen(true);
        return;
    }

    setIsAddingToCart(true);
    try {
      await addToCart(product, selectedVariant, quantity);
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (loading || !product) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  }

  // Handle multiple images - resolve URLs for current host
  const galleryImages = [
    { url: resolveAssetUrl(product.imageUrl), variant: undefined },
    ...(product.variants?.map(v => ({ url: resolveAssetUrl(product.imageUrl), variant: v })) || [])
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      {/* Full-screen AR Launch Overlay (shown when coming from QR scan) */}
      {showARLaunch && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 flex flex-col items-center justify-center p-6">
          <div className="text-center max-w-sm">
            {/* Product preview */}
            <div className="w-32 h-32 mx-auto mb-6 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
              <ColorTintedImage
                src={resolveAssetUrl(product.imageUrl)}
                color={selectedVariant?.color || product.color}
                alt={product.name}
                className="w-full h-full"
              />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">{product.name}</h1>
            <p className="text-indigo-200 mb-8">Ready to view in your space</p>

            {/* Big AR Launch Button */}
            <button
              onClick={launchAR}
              className="w-full bg-white text-indigo-900 py-5 px-8 rounded-2xl font-bold text-lg shadow-2xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 animate-pulse"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path>
              </svg>
              Tap to View in AR
            </button>

            <button
              onClick={() => setShowARLaunch(false)}
              className="mt-4 text-indigo-300 hover:text-white text-sm transition-colors"
            >
              View product details instead
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* Left Column: Media Viewer */}
        <div className="flex flex-col gap-4">
          <div className="h-[500px] lg:h-[600px] bg-slate-100 rounded-2xl relative group overflow-hidden border border-slate-100">

            {viewMode === '3d' ? (
              <div className="w-full h-full animate-in fade-in duration-500">
                <ModelViewerWrapper
                  src={resolveAssetUrl(product.arModelUrl)}
                  poster={activeImage}
                  alt={`3D model of ${product.name}`}
                  color={selectedVariant?.color || product.color}
                />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-lg text-xs font-medium text-slate-600 pointer-events-none z-10">
                  Interactive 3D
                </div>
              </div>
            ) : (
              <div className="w-full h-full animate-in fade-in duration-500">
                <ColorTintedImage
                  src={activeImage}
                  color={selectedVariant?.color || product.color}
                  alt={product.name}
                  className="w-full h-full"
                />
              </div>
            )}

            {/* View Toggle Controller */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur p-1.5 rounded-full shadow-lg border border-slate-200 flex gap-1">
              <button
                onClick={() => setViewMode('image')}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'image' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <ImageIcon className="w-4 h-4" /> Image
              </button>
              <button
                onClick={() => setViewMode('3d')}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${viewMode === '3d' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <Box className="w-4 h-4" /> 3D View
              </button>
            </div>
          </div>

          {/* Gallery Thumbnails (Synced with Variants) */}
          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => { 
                  setSelectedVariant(img.variant); 
                  setActiveImage(img.url);
                  setViewMode('image'); 
                }}
                className={`w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${selectedVariant?.id === img.variant?.id && viewMode === 'image' ? 'border-indigo-600 ring-2 ring-indigo-600/20' : 'border-slate-200 hover:border-indigo-300'}`}
              >
                <ColorTintedImage 
                  src={img.url} 
                  color={img.variant?.color} 
                  alt={`View ${idx + 1}`} 
                  className="w-full h-full" 
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="flex flex-col h-full">
          <div className="mb-auto">
            <span className="text-indigo-600 font-medium text-sm tracking-wider uppercase">{product.category}</span>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-2">{product.name}</h1>
            <div className="flex items-center justify-between mb-8">
              <div className="text-4xl font-bold text-slate-900">{CURRENCY}{product.price.toLocaleString()}</div>
              <div className={`text-sm font-bold px-3 py-1 rounded-full ${
                !isAvailable 
                  ? 'bg-red-50 text-red-600' 
                  : isLowStock 
                    ? 'bg-orange-50 text-orange-600 animate-pulse' 
                    : 'bg-slate-100 text-slate-600'
              }`}>
                {!isAvailable 
                  ? 'Out of Stock' 
                  : isLowStock 
                    ? `Only ${maxAvailable} remaining!` 
                    : `${maxAvailable} available`}
              </div>
            </div>

            {/* Variant Selector */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Available Wood Finishes</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedVariant(undefined);
                    setActiveImage(resolveAssetUrl(product.imageUrl));
                  }}
                  className={`group relative w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center ${!selectedVariant ? 'border-indigo-600 ring-2 ring-indigo-600/20 scale-110' : 'border-slate-200 hover:border-slate-400'}`}
                  title={product.colorName || 'Base Finish'}
                >
                  <span className="absolute inset-1 rounded-full border border-black/5" style={{ backgroundColor: product.color || '#F8F8F8' }}></span>
                  {!selectedVariant && (
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-900 bg-white px-2 py-0.5 rounded shadow-sm whitespace-nowrap z-10 uppercase tracking-tighter">
                      Original
                    </span>
                  )}
                </button>
                {product.variants?.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => {
                      setSelectedVariant(variant);
                      setActiveImage(resolveAssetUrl(product.imageUrl));
                    }}
                    className={`group relative w-12 h-12 rounded-full border-2 transition-all ${selectedVariant?.id === variant.id ? 'border-indigo-600 ring-2 ring-indigo-600/20 scale-110' : 'border-slate-200 hover:border-slate-400'
                      }`}
                    title={variant.name}
                  >
                    <span className="absolute inset-1 rounded-full border border-black/5" style={{ backgroundColor: variant.color }}></span>
                    {selectedVariant?.id === variant.id && (
                      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-900 bg-white px-2 py-0.5 rounded shadow-sm whitespace-nowrap z-10 uppercase tracking-tighter">
                        {variant.name.split(' ')[0]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Description Area */}
            <div className="prose prose-slate mb-8">
              <p className="text-lg text-slate-600 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Specs */}
            <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Dimensions</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Width</div>
                  <div className="font-mono text-slate-700">{product.dimensions.width} {product.dimensions.unit}</div>
                </div>
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Height</div>
                  <div className="font-mono text-slate-700">{product.dimensions.height} {product.dimensions.unit}</div>
                </div>
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Depth</div>
                  <div className="font-mono text-slate-700">{product.dimensions.depth} {product.dimensions.unit}</div>
                </div>
              </div>
            </div>

            {/* AI Chat Assistant */}
            <div className="bg-indigo-50/50 rounded-xl p-5 mb-8 border border-indigo-100">
              <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                <Wand2 className="w-4 h-4" /> Ask about this product
              </h3>
              {chatAnswer && (
                <div className="mb-4 p-3 bg-white rounded-lg text-sm text-slate-700 shadow-sm border border-indigo-50 animate-in fade-in slide-in-from-bottom-2">
                  {chatAnswer}
                </div>
              )}
              <form onSubmit={handleChatSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={chatQuestion}
                  onChange={e => setChatQuestion(e.target.value)}
                  placeholder="e.g., Will this fit in a small room?"
                  className="flex-1 text-sm px-4 py-3 rounded-lg bg-slate-800 text-white placeholder:text-slate-400 border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
                <button
                  type="submit"
                  disabled={isChatting || !chatQuestion}
                  className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-all hover:scale-105"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Policies Section */}
            <div className="border-t border-slate-200 pt-6 space-y-5 mb-8">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Shipping Costs</h4>
                  <p className="text-sm text-slate-500 leading-snug">
                    Free standard shipping on all orders over {CURRENCY}5,000. Expedited options available calculated at checkout.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Returns & Cancellations</h4>
                  <p className="text-sm text-slate-500 leading-snug">
                    Return within 30 days for a full refund. Cancel anytime before shipping for no charge.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Warranty Details</h4>
                  <p className="text-sm text-slate-500 leading-snug">
                    Includes a 3-year comprehensive warranty covering manufacturing defects and structural integrity.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-6 border-t border-slate-200 mt-auto">
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className={`flex items-center border rounded-xl overflow-hidden h-[56px] w-fit transition-colors ${isLowStock ? 'border-orange-200 bg-orange-50/30' : 'border-slate-200'}`}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || !isAvailable}
                  className="px-4 py-2 hover:bg-white disabled:opacity-20 transition-all text-slate-600"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className={`px-6 font-black text-xl min-w-[60px] text-center ${isLowStock ? 'text-orange-600' : 'text-slate-900'}`}>
                  {isAvailable ? quantity : 0}
                </span>
                <button
                  onClick={() => {
                    if (quantity < availableToAdd) {
                      setQuantity(quantity + 1);
                    }
                  }}
                  className="px-4 py-2 hover:bg-white disabled:opacity-20 transition-all text-slate-600"
                  disabled={quantity >= availableToAdd || !isAvailable}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!isAvailable || isAddingToCart}
                className={`flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95 ${
                  !isAvailable 
                    ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                    : isAddingToCart
                      ? 'bg-indigo-400 cursor-wait'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                }`}
              >
                {isAddingToCart ? (
                   <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                   <ShoppingCart className="w-5 h-5" />
                )}
                {!isAvailable ? 'Out of Stock' : isAddingToCart ? 'Adding...' : 'Add to Cart'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* QR Modal Trigger */}
              <button
                onClick={() => setIsQRModalOpen(true)}
                className="flex-1 sm:flex-none sm:w-auto bg-white border-2 border-indigo-600 text-indigo-600 px-6 py-4 rounded-xl font-bold text-lg hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
              >
                <Smartphone className="w-5 h-5" />
                <span className="hidden sm:inline">Scan for </span>AR
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* You May Also Like Section */}
      <div className="border-t border-slate-200 pt-12 pb-12">
        <h2 className="text-2xl font-bold text-slate-900 font-serif mb-8">You may also like</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedProducts.map((rp) => (
            <Link
              key={rp._id}
              to={`/product/${rp._id}`}
              className="group block bg-white rounded-xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col"
            >
              <div className="aspect-square overflow-hidden bg-slate-100 relative">
                <ColorTintedImage
                  src={resolveAssetUrl(rp.imageUrl)}
                  color={rp.color}
                  alt={rp.name}
                  className="w-full h-full"
                />
                {rp.isNewArrival && (
                  <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">New</span>
                )}
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <p className="text-xs text-slate-500 mb-1">{rp.category}</p>
                <h3 className="font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">{rp.name}</h3>
                <div className="mt-auto pt-2">
                  <p className="text-lg font-semibold text-slate-900">{CURRENCY}{rp.price.toLocaleString()}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* QR Code Modal for AR */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        productId={product._id}
        productName={product.name}
      />

      {/* Stock Limit Modal */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300 border border-slate-100">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Box className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Stock Limit Reached</h3>
              <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                {availableToAdd <= 0 
                  ? `You already have all ${maxAvailable} available units in your cart.` 
                  : `We only have ${maxAvailable} units total. You can only add ${availableToAdd} more to your cart.`}
              </p>
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
