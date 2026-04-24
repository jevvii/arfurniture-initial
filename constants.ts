
import { Box, ShoppingBag, LayoutDashboard, LogOut, User, ClipboardList, Megaphone, Settings } from 'lucide-react';

export const APP_NAME = "ARFurniture";
export const CURRENCY = "₱";

// Get API base URL from environment or construct it
export const getApiBaseUrl = (): string => {
  // In production (Vercel), use the env variable
  const envBase = (import.meta as any).env?.VITE_AUTH_API_BASE;
  if (envBase) {
    return envBase.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // In development, use localhost:4000
  return 'http://localhost:4000';
};

// Resolve asset URLs to work from any host (localhost, LAN IP, or tunnel)
// Handles relative paths, absolute URLs, and localhost URLs
export const resolveAssetUrl = (url: string | undefined): string => {
  if (!url) return '';
  
  // If it's already an absolute URL (http/https), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // For relative paths, resolve against the API server
  const apiBase = getApiBaseUrl();
  
  // Ensure path starts with /
  const path = url.startsWith('/') ? url : `/${url}`;
  
  return `${apiBase}${path}`;
};

export const NAV_ITEMS_CUSTOMER = [
  { label: 'Shop', path: '/', icon: ShoppingBag },
  { label: 'About', path: '/about', icon: User },
];

export const NAV_ITEMS_ADMIN = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Products', path: '/admin/products', icon: Box },
  { label: 'Orders', path: '/admin/orders', icon: ClipboardList },
  { label: 'Marketing', path: '/admin/marketing', icon: Megaphone },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];
