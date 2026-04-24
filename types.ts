
// Mongoose-like Schema Definitions

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

export enum AdminRole {
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

export interface Dimensions {
  width: number;
  height: number;
  depth: number;
  unit: 'cm' | 'in';
}

export interface Address {
  id?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  landmark?: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl: string; // Thumbnail/2D image
  images?: string[]; // Array of additional images
  arModelUrl: string; // .glb or .gltf URL
  dimensions: Dimensions;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isSale?: boolean;
  color?: string; // Main product color (hex or name)
  colorName?: string; // Added color name (e.g., "Light Oak")
  variants?: ProductVariant[]; // Added variants support
  createdAt: Date;
}

export interface ProductVariant {
  id: string;
  name: string; // e.g., "Red", "Blue"
  color: string; // Hex code or standard color name for UI swatches
  stock?: number;
  imageUrl: string;
  arModelUrl: string;
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariant?: ProductVariant; // Added selectedVariant
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageUrl: string;
  category: string;
  variantId?: string;
  variantName?: string;
}

export interface Order {
  _id: string;
  userId: string;
  customerName: string;
  recipientName: string;     // Added
  contactNumber: string;     // Added
  email?: string;            // Added
  items: OrderItem[];
  totalAmount: number;
  shippingAddress?: Address;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
}

export interface MarketingBanner {
  _id: string;
  title: string;
  subtitle?: string;
  description: string;
  imageUrl: string;
  badgeText?: string;
  buttonText: string;
  link: string;
  isActive: boolean;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  addresses: Address[];
  fname?: string;
  mname?: string;
  lname?: string;
  contactNumber?: string;
}

export interface DbUser {
  _id?: string;
  email: string;
  password: string;
  fname: string;
  mname?: string;
  lname: string;
  contactNumber: string;
  addresses: Address[];
}

export interface DbAdmin {
  _id?: string;
  fname: string;
  mname?: string;
  lname: string;
  email: string;
  username: string;
  password: string;
  role: AdminRole;
}

export interface DashboardStats {
  totalProducts: number;
  pendingOrders: number;
  activeCustomers: number;
  monthlyRevenue: number;
}

export interface StoreSettings {
  _id?: string;
  type: string;
  storeName: string;
  logoUrl?: string;
  updatedAt?: Date;
}
