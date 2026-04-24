import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Box, Smartphone } from 'lucide-react';
import { Product } from '../../types';
import { db } from '../../services/db';
import { CURRENCY, resolveAssetUrl } from '../../constants';

export const ARViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadProduct = async () => {
      if (id) {
        console.log('ARViewer: Fetching product with ID:', id);
        try {
          const p = await db.getProductById(id);
          console.log('ARViewer: Product result:', p);
          setProduct(p || null);
          if (!p) {
            setError(`Product not found for ID: ${id}`);
          }
        } catch (err) {
          console.error('ARViewer: Error fetching product:', err);
          setError(`Error: ${err}`);
        }
        setLoading(false);
      }
    };
    loadProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading AR experience...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Box className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Product Not Found</h1>
          <p className="text-slate-500 mb-4">The product you're looking for doesn't exist.</p>
          {error && <p className="text-red-500 text-xs mb-4 bg-red-50 p-2 rounded">{error}</p>}
          <p className="text-slate-400 text-xs mb-6">ID: {id}</p>
          <Link to="/" className="text-indigo-600 font-medium hover:underline">
            ← Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  // Cast to any for the custom web component
  const ModelViewer = 'model-viewer' as any;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link 
            to={`/product/${product._id}`}
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-900 truncate">{product.name}</h1>
            <p className="text-sm text-indigo-600 font-medium">{CURRENCY}{product.price.toLocaleString()}</p>
          </div>
        </div>
      </header>

      {/* AR Model Viewer - Takes most of the screen */}
      <div className="flex-1 relative min-h-[60vh]">
        <ModelViewer
          src={resolveAssetUrl(product.arModelUrl)}
          poster={resolveAssetUrl(product.imageUrl)}
          alt={`3D model of ${product.name}`}
          shadow-intensity="1"
          camera-controls
          auto-rotate
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-scale="auto"
          reveal="auto"
          style={{ 
            width: '100%', 
            height: '100%', 
            minHeight: '60vh',
            backgroundColor: '#f8fafc'
          }}
        >
          {/* Custom AR Button - More prominent on mobile */}
          <button 
            slot="ar-button" 
            className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-8 py-4 rounded-full font-bold shadow-xl cursor-pointer hover:bg-indigo-700 transition-all flex items-center gap-3 text-lg active:scale-95"
          >
            <Smartphone className="w-6 h-6" />
            View in Your Space
          </button>

          {/* Loading indicator */}
          <div slot="poster" className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-slate-500">Loading 3D model...</p>
            </div>
          </div>
        </ModelViewer>

        {/* Interactive 3D Badge */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 shadow-sm flex items-center gap-1.5">
          <Box className="w-3.5 h-3.5" />
          Interactive 3D
        </div>
      </div>

      {/* Bottom Info Panel */}
      <div className="bg-white border-t border-slate-200 p-4 safe-area-inset-bottom">
        <div className="max-w-lg mx-auto">
          {/* Instructions */}
          <div className="bg-indigo-50 rounded-xl p-4 mb-4">
            <h3 className="font-bold text-indigo-900 text-sm mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              How to View in AR
            </h3>
            <ol className="text-sm text-indigo-800/80 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="bg-indigo-200 text-indigo-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                Tap "View in Your Space" button above
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-indigo-200 text-indigo-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                Point your camera at the floor
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-indigo-200 text-indigo-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                Tap to place the furniture & explore!
              </li>
            </ol>
          </div>

          {/* Product Quick Info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">{product.category}</p>
              <p className="text-sm text-slate-600">
                {product.dimensions.width} × {product.dimensions.height} × {product.dimensions.depth} {product.dimensions.unit}
              </p>
            </div>
            <Link 
              to={`/product/${product._id}`}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-slate-800 transition-colors"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
