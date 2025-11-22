import { createContext, useContext, ReactNode, useState } from "react";
import { Product } from "./MockDataContext";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string, sellerId?: string) => void;
  updateQuantity: (productId: string, quantity: number, sellerId?: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemsCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (product: Product, quantity: number = 1) => {
    setCartItems((prev) => {
      // Match by both product ID and seller ID to allow same product from different sellers
      const existingItem = prev.find(
        (item) => item.product.id === product.id && item.product.sellerId === product.sellerId
      );
      
      if (existingItem) {
        return prev.map((item) =>
          item.product.id === product.id && item.product.sellerId === product.sellerId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      
      return [...prev, { product, quantity }];
    });
  };

  const removeFromCart = (productId: string, sellerId?: string) => {
    setCartItems((prev) => 
      prev.filter((item) => {
        // If sellerId is provided, match both product ID and seller ID
        if (sellerId) {
          return !(item.product.id === productId && item.product.sellerId === sellerId);
        }
        // Otherwise, match only product ID (backward compatibility)
        return item.product.id !== productId;
      })
    );
  };

  const updateQuantity = (productId: string, quantity: number, sellerId?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, sellerId);
      return;
    }
    
    setCartItems((prev) =>
      prev.map((item) => {
        // If sellerId is provided, match both product ID and seller ID
        if (sellerId) {
          return item.product.id === productId && item.product.sellerId === sellerId
            ? { ...item, quantity }
            : item;
        }
        // Otherwise, match only product ID (backward compatibility)
        return item.product.id === productId ? { ...item, quantity } : item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const getCartItemsCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartItemsCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};
