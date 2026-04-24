
import { Product, Order, MarketingBanner, DashboardStats, CartItem, OrderItem } from '../types';

// API Base URL - uses the auth server
const API_BASE = (import.meta as any).env?.VITE_AUTH_API_BASE?.replace(/\/$/, '') || 'http://localhost:4000';

// Fallback data for when API is unavailable
const FALLBACK_PRODUCTS: Product[] = [
  {
    _id: '1',
    name: 'Eames Style Lounge Chair',
    description: 'A classic mid-century modern chair. Perfect for lounging and reading in style.',
    price: 18500,
    category: 'Chairs',
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80',
    arModelUrl: 'products/3dmodels/white_mesh.glb',
    dimensions: { width: 84, height: 84, depth: 85, unit: 'cm' },
    isFeatured: true,
    isNewArrival: false,
    isSale: false,
    createdAt: new Date(),
  },
];

const FALLBACK_BANNERS: MarketingBanner[] = [
  {
    _id: 'banner-1',
    title: 'Pinoy Craftsmanship Sale',
    subtitle: 'Support Local',
    description: 'Get the best Palochina deals from Valenzuela directly to your home. Up to 30% off.',
    imageUrl: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=80',
    badgeText: 'SALE',
    buttonText: 'SHOP NOW',
    link: '/',
    isActive: true
  },
];

class Database {
  // =====================
  // PRODUCTS
  // =====================
  async getProducts(): Promise<Product[]> {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      return data.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt)
      }));
    } catch (e) {
      console.warn('Using fallback products:', e);
      return FALLBACK_PRODUCTS;
    }
  }

  async getProductById(id: string): Promise<Product | undefined> {
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`);
      if (!res.ok) return undefined;
      const data = await res.json();
      return { ...data, createdAt: new Date(data.createdAt) };
    } catch (e) {
      console.warn('Failed to fetch product:', e);
      return FALLBACK_PRODUCTS.find(p => p._id === id);
    }
  }

  async createProduct(product: Omit<Product, '_id' | 'createdAt'>): Promise<Product> {
    const res = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (!res.ok) throw new Error('Failed to create product');
    const data = await res.json();
    return { ...data, createdAt: new Date(data.createdAt) };
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update product');
    const data = await res.json();
    return { ...data, createdAt: new Date(data.createdAt) };
  }

  async deleteProduct(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/products/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete product');
  }

  // =====================
  // ORDERS
  // =====================
  async getOrders(): Promise<Order[]> {
    try {
      const res = await fetch(`${API_BASE}/api/orders`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      return data.map((o: any) => ({
        ...o,
        createdAt: new Date(o.createdAt)
      }));
    } catch (e) {
      console.warn('Failed to fetch orders:', e);
      return [];
    }
  }

  async createOrder(order: Omit<Order, '_id' | 'createdAt' | 'status'>): Promise<Order> {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to create order' }));
      const error: any = new Error(errorData.error || 'Failed to create order');
      error.response = { data: errorData };
      throw error;
    }
    
    const data = await res.json();
    return { ...data, createdAt: new Date(data.createdAt) };
  }

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
    const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update order status');
  }

  async getOrder(id: string): Promise<Order | undefined> {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${id}`);
      if (!res.ok) return undefined;
      const data = await res.json();
      return { ...data, createdAt: new Date(data.createdAt) };
    } catch (e) {
      console.warn('Failed to fetch order:', e);
      return undefined;
    }
  }

  async deleteOrder(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/orders/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete order');
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    try {
      const res = await fetch(`${API_BASE}/api/orders/user/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user orders');
      const data = await res.json();
      return data.map((o: any) => ({
        ...o,
        createdAt: new Date(o.createdAt)
      }));
    } catch (e) {
      console.warn('Failed to fetch user orders:', e);
      return [];
    }
  }

  async cancelOrder(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/orders/${id}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Failed to cancel order' }));
      throw new Error(errorData.error || 'Failed to cancel order');
    }
  }

  // =====================
  // BANNERS
  // =====================
  async getBanners(): Promise<MarketingBanner[]> {
    try {
      const res = await fetch(`${API_BASE}/api/banners`);
      if (!res.ok) throw new Error('Failed to fetch banners');
      return await res.json();
    } catch (e) {
      console.warn('Using fallback banners:', e);
      return FALLBACK_BANNERS;
    }
  }

  async createBanner(banner: Omit<MarketingBanner, '_id'>): Promise<MarketingBanner> {
    const res = await fetch(`${API_BASE}/api/banners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(banner)
    });
    if (!res.ok) throw new Error('Failed to create banner');
    return await res.json();
  }

  async updateBanner(id: string, updates: Partial<MarketingBanner>): Promise<MarketingBanner> {
    const res = await fetch(`${API_BASE}/api/banners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update banner');
    return await res.json();
  }

  async deleteBanner(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/banners/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete banner');
  }

  // =====================
  // CART
  // =====================
  async getCart(userId: string): Promise<CartItem[]> {
    try {
      const res = await fetch(`${API_BASE}/api/cart/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch cart');
      const data = await res.json();
      return data.items || [];
    } catch (e) {
      console.warn('Failed to fetch cart:', e);
      return [];
    }
  }

  async addToCart(userId: string, productId: string, variantId?: string, quantity: number = 1): Promise<void> {
    const res = await fetch(`${API_BASE}/api/cart/${userId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, variantId, quantity })
    });
    if (!res.ok) throw new Error('Failed to add item to cart');
  }

  async updateCartItem(userId: string, productId: string, quantity: number, variantId?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/cart/${userId}/items/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity, variantId })
    });
    if (!res.ok) throw new Error('Failed to update cart item');
  }

  async removeFromCart(userId: string, productId: string, variantId?: string): Promise<void> {
    const url = variantId 
      ? `${API_BASE}/api/cart/${userId}/items/${productId}?variantId=${encodeURIComponent(variantId)}`
      : `${API_BASE}/api/cart/${userId}/items/${productId}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove item from cart');
  }

  async clearCart(userId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/cart/${userId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to clear cart');
  }

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const res = await fetch(`${API_BASE}/api/admin/dashboard-stats`);
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      return await res.json();
    } catch (e) {
      console.warn('Using fallback stats:', e);
      return {
        totalProducts: 156,
        pendingOrders: 89,
        activeCustomers: 1234,
        monthlyRevenue: 458230
      };
    }
  }
}

export const db = new Database();
