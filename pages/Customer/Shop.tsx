
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Product, MarketingBanner } from '../../types';
import { db } from '../../services/db';
import { CURRENCY, resolveAssetUrl } from '../../constants';

const ProductCard: React.FC<{ product: Product }> = ({ product }) => (
  <Link
    to={`/product/${product._id}`}
    className="group block bg-white rounded-xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col"
  >
    <div className="aspect-square overflow-hidden bg-slate-100 relative">
      <img
        src={resolveAssetUrl(product.imageUrl)}
        alt={product.name}
        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute top-2 left-2 flex flex-col gap-1">
        {product.isNewArrival && (
          <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">New</span>
        )}
        {product.isFeatured && (
          <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">Featured</span>
        )}
        {product.isSale && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">Sale</span>
        )}
      </div>
      <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
        <ArrowRight className="w-4 h-4 text-indigo-600" />
      </div>
    </div>
    <div className="p-4 flex flex-col flex-grow">
      <p className="text-xs text-slate-500 mb-1">{product.category}</p>
      <h3 className="font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">{product.name}</h3>
      <div className="mt-auto pt-2 flex items-center justify-between">
        <p className="text-lg font-semibold text-slate-900">{CURRENCY}{product.price.toLocaleString()}</p>
        <p className={`text-xs font-medium ${product.stock > 0 ? 'text-slate-500' : 'text-red-500'}`}>
          {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
        </p>
      </div>
    </div>
  </Link>
);

const BannerCarousel: React.FC<{ banners: MarketingBanner[] }> = ({ banners }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!banners.length) return null;

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % banners.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);

  return (
    <div className="relative w-full md:h-[320px] h-auto bg-[#fdfbf7] rounded-none md:rounded-xl overflow-hidden mb-12 group border border-slate-100">
      <div
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((banner) => (
          <div key={banner._id} className="min-w-full flex flex-col md:flex-row relative overflow-hidden">
            {banner.badgeText && (
              <div className="absolute top-0 left-0 z-10">
                <div className="bg-[#CD3C32] text-white text-xs font-bold px-8 py-1 shadow-md transform -rotate-45 -translate-x-8 translate-y-4 w-32 text-center">
                  {banner.badgeText}
                </div>
              </div>
            )}

            <div className="md:w-1/2 relative h-48 md:h-full order-2 md:order-1">
              <img src={resolveAssetUrl(banner.imageUrl)} alt={banner.title} className="w-full h-full object-cover" />
            </div>

            <div className="md:w-1/2 p-6 md:p-10 flex flex-col justify-center items-start text-left bg-[#fdfbf7] order-1 md:order-2">
              {banner.subtitle && (
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 font-sans">
                  {banner.subtitle}
                </h4>
              )}
              <h2 className="text-2xl md:text-4xl font-serif font-medium text-slate-900 mb-3 leading-tight">
                {banner.title}
              </h2>
              <p className="text-slate-600 mb-6 text-sm md:text-base leading-relaxed max-w-md line-clamp-2">
                {banner.description}
              </p>
              <Link
                to={banner.link}
                className="bg-slate-900 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
              >
                {banner.buttonText}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-slate-800 opacity-0 group-hover:opacity-100 transition-all shadow-lg z-20"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-slate-800 opacity-0 group-hover:opacity-100 transition-all shadow-lg z-20"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {banners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-2 h-2 rounded-full transition-all ${currentIndex === idx ? 'bg-slate-900 w-4' : 'bg-slate-300'
              }`}
          />
        ))}
      </div>
    </div>
  );
};

export const Shop: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<MarketingBanner[]>([]);
  const [loading, setLoading] = useState(true);

  // Use URL params for state
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';
  const categoryFilter = searchParams.get('category') || 'All';
  const specialFilter = searchParams.get('filter'); // 'new', 'sale', 'featured'

  useEffect(() => {
    const loadData = async () => {
      const [prodData, bannerData] = await Promise.all([
        db.getProducts(),
        db.getBanners()
      ]);
      setProducts(prodData);
      setBanners(bannerData.filter(b => b.isActive));
      setLoading(false);
    };
    loadData();
  }, []);

  // Filter Logic
  const filteredProducts = products.filter(product => {
    // Search
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());

    // Category
    const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;

    // Special Filters
    let matchesSpecial = true;
    if (specialFilter === 'new') matchesSpecial = product.isNewArrival || false;
    if (specialFilter === 'featured') matchesSpecial = product.isFeatured || false;
    if (specialFilter === 'sale') matchesSpecial = product.isSale || false;

    return matchesSearch && matchesCategory && matchesSpecial;
  });

  const newArrivals = products.filter(p => p.isNewArrival);
  const featuredProducts = products.filter(p => p.isFeatured);
  const isHomeView = !searchTerm && categoryFilter === 'All' && !specialFilter;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Conditional Rendering for Homepage vs Filtered View */}

      {/* 1. Banner Carousel (Homepage Only) */}
      {!loading && isHomeView && <BannerCarousel banners={banners} />}

      {/* 2. New Arrivals Highlight (Homepage Only) */}
      {!loading && isHomeView && newArrivals.length > 0 && (
        <section className="py-8 bg-emerald-50/50 rounded-3xl px-6 mb-12 -mx-2 md:mx-0">
          <div className="flex justify-between items-end mb-6">
            <div>
              <span className="text-emerald-600 font-bold tracking-wider text-xs uppercase mb-2 block">Fresh Finds</span>
              <h2 className="text-3xl font-bold text-slate-900 font-serif flex items-center gap-2">
                New Arrivals
              </h2>
            </div>
            <Link to="/?filter=new" className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 pb-2">
            {newArrivals.slice(0, 4).map(product => (
              <div key={product._id} className="flex-none w-64 md:w-auto">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Featured Collection (Homepage Only) */}
      {!loading && isHomeView && featuredProducts.length > 0 && (
        <section className="py-8 bg-indigo-50/50 rounded-3xl px-6 mb-12 -mx-2 md:mx-0">
          <div className="flex justify-between items-end mb-6">
            <div>
              <span className="text-indigo-600 font-bold tracking-wider text-xs uppercase mb-2 block">Hand Picked</span>
              <h2 className="text-3xl font-bold text-slate-900 font-serif">Featured Collection</h2>
            </div>
            <Link to="/?filter=featured" className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 pb-2">
            {featuredProducts.slice(0, 4).map(product => (
              <div key={product._id} className="flex-none w-64 md:w-auto">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Main Product Grid Header */}
      <div className="mb-8 mt-4 pt-8 border-t border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 font-serif">
          {searchTerm && <>Results for <span className="text-indigo-600">"{searchTerm}"</span></>}
          {categoryFilter !== 'All' && `${categoryFilter}`}
          {specialFilter === 'new' && 'New Arrivals'}
          {specialFilter === 'featured' && 'Featured Collection'}
          {specialFilter === 'sale' && 'On Sale'}
          {isHomeView && 'All Products'}
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          {filteredProducts.length} products found
        </p>
      </div>

      {/* 5. Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 h-80 animate-pulse border border-slate-100">
              <div className="bg-slate-200 h-48 rounded-lg mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {filteredProducts.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}

      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No products found</h3>
          <p className="text-slate-500">Try adjusting your search or filter.</p>
          <Link to="/" className="mt-4 inline-block text-indigo-600 font-medium hover:underline">Clear Filters</Link>
        </div>
      )}
    </div>
  );
};
