import { createContext, useContext } from 'react';
import { CartItem, Product, ProductVariant } from '../types';

export interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, variant?: ProductVariant) => Promise<void>;
  removeFromCart: (id: string, variantId?: string) => Promise<void>;
  updateQuantity: (id: string, delta: number, variantId?: string) => Promise<void>;
  clearCart: () => Promise<void>;
  updateItemVariant: (product: Product, oldVariantId: string | undefined, newVariant: ProductVariant, quantity: number) => Promise<void>;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
