import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Menu, X, Hexagon, User as UserIcon, LogOut, LogIn, Search, Bell, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../types';
import { APP_NAME, NAV_ITEMS_ADMIN, resolveAssetUrl, getApiBaseUrl } from '../constants';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cart } = useCart();
  const { user, logout, setAuthModalOpen, isAuthModalOpen } = useAuth();

  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [storeSettings, setStoreSettings] = useState({ name: APP_NAME, logoUrl: '' });

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;

  useEffect(() => {
    if (user && !isAdmin) {
      fetchNotifications();

      // Establish Server-Sent Events (SSE) stream for real-time pushing
      const sse = new EventSource(`${getApiBaseUrl()}/api/notifications/stream/${user._id}`);

      sse.onmessage = (event) => {
        try {
          const newNotification = JSON.parse(event.data);
          setNotifications(prev => [newNotification, ...prev]);
        } catch (error) {
          console.error("Failed to parse SSE notification:", error);
        }
      };

      return () => {
        sse.close();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/notifications/${user?._id}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await fetch(`${getApiBaseUrl()}/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!user) return;
      await fetch(`${getApiBaseUrl()}/api/notifications/user/${user._id}/read-all`, { method: 'PATCH' });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          setStoreSettings({
            name: data.storeName || APP_NAME,
            logoUrl: data.logoUrl || ''
          });
        }
      } catch (error) {
        console.error('Failed to fetch store settings:', error);
      }
    };
    fetchSettings();
  }, [location.pathname]); // Re-fetch on navigation in case settings changed (e.g. from admin)


  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/?q=${encodeURIComponent(searchInput)}`);
  };

  const handleCategoryClick = (category: string) => {
    navigate(`/?category=${encodeURIComponent(category)}`);
  };

  // Categories for the secondary nav
  const SHOP_CATEGORIES = [
    { label: 'Home', action: () => navigate('/') },
    { label: 'New Arrivals', action: () => navigate('/?filter=new') },
    { label: 'Featured', action: () => navigate('/?filter=featured') },
    { label: 'Chairs', action: () => handleCategoryClick('Chairs') },
    { label: 'Sofas', action: () => handleCategoryClick('Sofas') },
    { label: 'Tables', action: () => handleCategoryClick('Tables') },
    { label: 'Decor', action: () => handleCategoryClick('Decor') },
    { label: 'Sale', action: () => navigate('/?filter=sale') },
    { label: 'About Us', action: () => navigate('/about') },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header Wrapper */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">

        {/* TOP ROW: Logo, Search, User Actions */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 gap-8">

            {/* 1. Logo (Retained Original Style) */}
            <div className="flex-shrink-0">
              <Link to={isAdmin ? "/admin" : "/"} className="flex items-center gap-2 group">
                <div className="flex items-center gap-2">
                  {storeSettings.logoUrl ? (
                    <img
                      src={resolveAssetUrl(storeSettings.logoUrl)}
                      alt={storeSettings.name}
                      className="w-10 h-10 object-contain rounded-lg bg-white"
                    />
                  ) : (
                    <div className="p-2 bg-indigo-600 rounded-lg group-hover:bg-indigo-700 transition-colors">
                      <Hexagon className="w-6 h-6 text-white fill-current" />
                    </div>
                  )}
                  <span className="text-xl font-bold text-slate-900 tracking-tight">
                    {isAdmin ? 'Admin' : storeSettings.name}
                  </span>
                </div>
              </Link>
            </div>

            {/* 2. Central Search Bar (Customer Only) */}
            {!isAdmin && (
              <div className="flex-1 max-w-2xl hidden md:block">
                <form onSubmit={handleSearch} className="relative w-full">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search products, brands, and styles"
                    className="w-full h-11 pl-6 pr-12 rounded-full border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </form>
              </div>
            )}

            {/* 3. Right Icons */}
            <div className="flex items-center gap-4 sm:gap-6">

              {/* Admin Nav Links */}
              {isAdmin && (
                <div className="hidden md:flex items-center gap-4">
                  {NAV_ITEMS_ADMIN.map(item => (
                    <Link key={item.path} to={item.path} className={`text-sm font-medium hover:text-indigo-600 ${location.pathname === item.path ? 'text-indigo-600' : 'text-slate-600'}`}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}

              {/* User/Auth */}
              {user ? (
                <div className="relative group flex items-center cursor-pointer">
                  <div className="flex items-center gap-2 text-slate-700 hover:text-indigo-600 transition-colors">
                    <span className="hidden sm:block text-sm font-medium">{user.name}</span>
                    <UserIcon className="w-6 h-6" />
                  </div>
                  {/* Dropdown */}
                  <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="bg-white rounded-lg shadow-xl border border-slate-100 p-2 w-48">
                      <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-100 mb-1">
                        Signed in as <br /><strong className="text-slate-900">{user.email}</strong>
                      </div>
                      {!isAdmin && (
                        <>
                          <Link
                            to="/profile"
                            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <UserIcon className="w-4 h-4" /> Profile
                          </Link>
                          <Link
                            to="/orders"
                            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <ShoppingBag className="w-4 h-4" /> My Orders
                          </Link>
                        </>
                      )}
                      <button
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" /> Log Out
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-1 text-slate-700 hover:text-indigo-600 transition-colors"
                >
                  <span className="hidden sm:block text-sm font-medium">Log In</span>
                  <UserIcon className="w-6 h-6" />
                </button>
              )}

              {/* Notifications */}
              {!isAdmin && user && (
                <div className="relative flex">
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="text-slate-700 hover:text-indigo-600 transition-colors relative group"
                  >
                    <Bell className="w-6 h-6" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ring-2 ring-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {isNotificationsOpen && (
                    <div className="absolute -right-2 top-6 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-100 p-0 overflow-hidden z-50">
                      <div className="flex justify-between items-center p-3 border-b border-slate-100 bg-slate-50">
                        <span className="font-semibold text-slate-800">Notifications</span>
                        {unreadCount > 0 && (
                          <button onClick={markAllAsRead} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-slate-500 text-sm">No notifications</div>
                        ) : (
                          <div className="flex flex-col">
                            {notifications.map((notif) => (
                              <div
                                key={notif._id}
                                className={`p-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors cursor-pointer ${notif.isRead ? 'opacity-70' : 'bg-indigo-50/30'}`}
                                onClick={() => {
                                  if (!notif.isRead) markNotificationAsRead(notif._id);
                                  // Can navigate to order details page if needed: navigate(`/orders`)
                                }}
                              >
                                <div className="flex gap-3">
                                  <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${notif.isRead ? 'bg-slate-100 text-slate-500' : 'bg-indigo-100 text-indigo-600'}`}>
                                    <Bell className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className={`text-sm ${notif.isRead ? 'text-slate-600' : 'font-semibold text-slate-800'}`}>
                                      {notif.message}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                      {new Date(notif.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cart */}
              {!isAdmin && (
                <Link to="/cart" className="text-slate-700 hover:text-indigo-600 transition-colors relative">
                  <ShoppingBag className="w-6 h-6" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ring-2 ring-white">
                      {cartItemCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-1 text-slate-700 hover:text-indigo-600"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Secondary Navigation (Customer Only) */}
        {!isAdmin && (
          <div className="hidden md:block border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <nav className="flex justify-center items-center space-x-8 h-12">
                {SHOP_CATEGORIES.map((cat) => (
                  <button
                    key={cat.label}
                    onClick={cat.action}
                    className="text-sm font-medium tracking-wide text-slate-600 hover:text-indigo-600 hover:underline decoration-2 underline-offset-4 transition-all"
                  >
                    {cat.label}
                  </button>
                ))}
                <span className="h-4 w-px bg-slate-300 mx-2"></span>
                <Link to="/" className="text-sm font-medium tracking-wide text-indigo-600 hover:underline decoration-2 underline-offset-4">
                  All Products
                </Link>
              </nav>
            </div>
          </div>
        )}

        {/* Mobile Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 shadow-lg absolute w-full left-0 z-50">
            <div className="px-4 py-4 space-y-1">

              {/* Mobile Search */}
              {!isAdmin && (
                <form onSubmit={(e) => { handleSearch(e); setIsMobileMenuOpen(false); }} className="mb-4 relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full p-2 pl-4 pr-10 rounded-lg border border-slate-300 bg-slate-50"
                  />
                  <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search className="w-4 h-4" />
                  </button>
                </form>
              )}

              {isAdmin ? (
                NAV_ITEMS_ADMIN.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-3 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {item.label}
                  </Link>
                ))
              ) : (
                SHOP_CATEGORIES.map(cat => (
                  <button
                    key={cat.label}
                    onClick={() => { cat.action(); setIsMobileMenuOpen(false); }}
                    className="block w-full text-left px-3 py-3 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                  >
                    {cat.label}
                  </button>
                ))
              )}

              <div className="border-t border-slate-100 my-2 pt-2">
                {user ? (
                  <button
                    onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-3 text-red-600 font-medium hover:bg-red-50 rounded-lg"
                  >
                    <LogOut className="w-5 h-5" /> Logout
                  </button>
                ) : (
                  <button
                    onClick={() => { setAuthModalOpen(true); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-3 text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg"
                  >
                    <LogIn className="w-5 h-5" /> Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      {!isAdmin && (
        <footer className="bg-slate-900 text-slate-400 py-12 mt-auto border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-2 mb-4 text-white">
                  {storeSettings.logoUrl ? (
                    <img
                      src={resolveAssetUrl(storeSettings.logoUrl)}
                      alt={storeSettings.name}
                      className="w-8 h-8 object-contain rounded bg-white p-0.5"
                    />
                  ) : (
                    <div className="p-1.5 bg-indigo-600 rounded-md">
                      <Hexagon className="w-5 h-5 text-white fill-current" />
                    </div>
                  )}
                  <span className="text-2xl font-bold">{storeSettings.name}</span>
                </div>
                <p className="text-slate-500 max-w-sm">
                  The premier destination for AR-enabled furniture shopping. Visualize perfection in your home before you buy.
                </p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Shop</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/" className="hover:text-white transition-colors">New Arrivals</Link></li>
                  <li><Link to="/?filter=sale" className="hover:text-white transition-colors">Sale</Link></li>
                  <li><Link to="/cart" className="hover:text-white transition-colors">My Cart</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Admin</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/admin/login" className="hover:text-white transition-colors">Admin Login</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
              <p>© 2026 {storeSettings.name}. All rights reserved.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
