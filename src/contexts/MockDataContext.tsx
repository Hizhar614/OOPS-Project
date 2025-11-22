import { createContext, useContext, ReactNode, useState } from "react";

// Types
export type UserRole = "customer" | "retailer" | "wholesaler";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  location: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  isLocal: boolean;
  sellerId: string;
  sellerName: string;
  description: string;
  wholesalerId?: string;
  isBulk?: boolean;
  bulkUnit?: string;
  availabilityDate: string;
}

export interface StockRequest {
  id: string;
  retailerId: string;
  retailerName: string;
  productId: string;
  productName: string;
  quantity: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface Retailer {
  id: string;
  name: string;
  distance: string;
  location: string;
  rating: number;
  productsCount: number;
}

export interface Wholesaler {
  id: string;
  name: string;
  category: string;
  location: string;
  rating: number;
  productsCount: number;
  catalogProducts: Product[];
}

export interface Order {
  id: string;
  customerId: string;
  sellerId?: string;
  products: { productId: string; quantity: number; price: number }[];
  total: number;
  status: "placed" | "processed" | "out_for_delivery" | "delivered";
  createdAt: string;
  deliveryAddress: string;
  paymentMethod?: string;
  scheduledDelivery?: string;
  isPaid?: boolean;
}

export interface Review {
  id: string;
  productId: string;
  orderId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface WholesalerOrder {
  id: string;
  retailerId: string;
  wholesalerId: string;
  wholesalerName: string;
  productName: string;
  quantity: number;
  status: "pending" | "shipped" | "arrived" | "completed";
  createdAt: string;
}

export interface CustomerQuery {
  id: string;
  customerId: string;
  customerName: string;
  message: string;
  status: "pending" | "replied";
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "order_status" | "stock_alert" | "general";
  title: string;
  message: string;
  orderId?: string;
  isRead: boolean;
  createdAt: string;
}

interface MockDataContextType {
  currentUser: User;
  products: Product[];
  retailers: Retailer[];
  wholesalers: Wholesaler[];
  orders: Order[];
  stockRequests: StockRequest[];
  reviews: Review[];
  wholesalerOrders: WholesalerOrder[];
  customerQueries: CustomerQuery[];
  notifications: Notification[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order["status"]) => void;
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  getRetailerProducts: (retailerId: string) => Product[];
  getWholesalerProducts: (wholesalerId: string) => Product[];
  updateStockRequestStatus: (requestId: string, status: "approved" | "rejected") => void;
  decreaseProductStock: (productId: string, quantity: number) => void;
  addReview: (review: Review) => void;
  getProductReviews: (productId: string) => Review[];
  addWholesalerOrder: (order: WholesalerOrder) => void;
  updateWholesalerOrderStatus: (orderId: string, status: WholesalerOrder["status"]) => void;
  getRetailerWholesalerOrders: (retailerId: string) => WholesalerOrder[];
  receiveStock: (orderId: string, productName: string, quantity: number, retailerId: string) => void;
  getRetailerQueries: (retailerId: string) => CustomerQuery[];
  replyToQuery: (queryId: string) => void;
  updateOrderPaymentStatus: (orderId: string, isPaid: boolean) => void;
  getUserNotifications: (userId: string) => Notification[];
  markNotificationAsRead: (notificationId: string) => void;
  getUnreadNotificationCount: (userId: string) => number;
}

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

// Mock Data
const mockUser: User = {
  id: "user-1",
  name: "John Doe",
  role: "customer",
  email: "john.doe@example.com",
  location: "New York, NY",
};

const mockRetailerId = "ret-1"; // Current retailer user ID
const mockWholesalerId = "whole-1"; // Current wholesaler user ID

const mockWholesalers: Wholesaler[] = [
  {
    id: "whole-1",
    name: "Metro Bulk Supplies",
    category: "General Groceries",
    location: "Industrial District, New York",
    rating: 4.7,
    productsCount: 450,
    catalogProducts: [
      {
        id: "whole-prod-1",
        name: "Basmati Rice - 50lb Bag",
        price: 3800,
        image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
        category: "Grains",
        stock: 200,
        isLocal: false,
        sellerId: "whole-1",
        sellerName: "Metro Bulk Supplies",
        description: "Premium long-grain basmati rice in bulk",
        availabilityDate: "Today",
      },
      {
        id: "whole-prod-2",
        name: "Organic Black Beans - 25lb",
        price: 2700,
        image: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=400",
        category: "Legumes",
        stock: 150,
        isLocal: false,
        sellerId: "whole-1",
        sellerName: "Metro Bulk Supplies",
        description: "Bulk organic black beans",
        availabilityDate: "Today",
      },
      {
        id: "whole-prod-3",
        name: "All-Purpose Flour - 50lb",
        price: 2400,
        image: "https://images.unsplash.com/photo-1628672749465-f0c0b0f9bffd?w=400",
        category: "Baking",
        stock: 300,
        isLocal: false,
        sellerId: "whole-1",
        sellerName: "Metro Bulk Supplies",
        description: "High-quality all-purpose flour",
        availabilityDate: "Today",
      },
      {
        id: "whole-prod-4",
        name: "Granulated Sugar - 50lb",
        price: 3000,
        image: "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=400",
        category: "Baking",
        stock: 250,
        isLocal: false,
        sellerId: "whole-1",
        sellerName: "Metro Bulk Supplies",
        description: "Pure granulated white sugar",
        availabilityDate: "Today",
      },
      {
        id: "whole-prod-5",
        name: "Olive Oil - 5 Gallon",
        price: 7500,
        image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400",
        category: "Oils",
        stock: 100,
        isLocal: false,
        sellerId: "whole-1",
        sellerName: "Metro Bulk Supplies",
        description: "Extra virgin olive oil in bulk",
        availabilityDate: "Today",
      },
    ],
  },
  {
    id: "whole-2",
    name: "Fresh Farm Distributors",
    category: "Fresh Produce",
    location: "Farmlands, New York",
    rating: 4.9,
    productsCount: 320,
    catalogProducts: [
      {
        id: "whole-prod-6",
        name: "Organic Carrots - 50lb Box",
        price: 3600,
        image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400",
        category: "Vegetables",
        stock: 180,
        isLocal: false,
        sellerId: "whole-2",
        sellerName: "Fresh Farm Distributors",
        description: "Fresh organic carrots in bulk",
        availabilityDate: "Today",
      },
      {
        id: "whole-prod-7",
        name: "Red Potatoes - 50lb Bag",
        price: 3200,
        image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400",
        category: "Vegetables",
        stock: 220,
        isLocal: false,
        sellerId: "whole-2",
        sellerName: "Fresh Farm Distributors",
        description: "Premium red potatoes",
        availabilityDate: "Today",
      },
      {
        id: "whole-prod-8",
        name: "Yellow Onions - 50lb",
        price: 2900,
        image: "https://images.unsplash.com/photo-1587486937006-d09d8c0e0aa7?w=400",
        category: "Vegetables",
        stock: 200,
        isLocal: false,
        sellerId: "whole-2",
        sellerName: "Fresh Farm Distributors",
        description: "Fresh yellow cooking onions",
        availabilityDate: "Today",
      },
      {
        id: "whole-prod-9",
        name: "Mixed Bell Peppers - 25lb",
        price: 4700,
        image: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400",
        category: "Vegetables",
        stock: 140,
        isLocal: false,
        sellerId: "whole-2",
        sellerName: "Fresh Farm Distributors",
        description: "Assorted colored bell peppers",
        availabilityDate: "Today",
      },
      {
        id: "whole-prod-10",
        name: "Fresh Lettuce - 24 Head Case",
        price: 2500,
        image: "https://images.unsplash.com/photo-1556801712-76c8eb07bbc9?w=400",
        category: "Vegetables",
        stock: 160,
        isLocal: false,
        sellerId: "whole-2",
        sellerName: "Fresh Farm Distributors",
        description: "Crisp romaine lettuce heads",
        availabilityDate: "Today",
      },
    ],
  },
  {
    id: "whole-3",
    name: "Organic Wholesale Co.",
    category: "Organic Products",
    location: "Green Valley, New York",
    rating: 4.8,
    productsCount: 280,
    catalogProducts: [
      {
        id: "whole-prod-11",
        name: "Organic Quinoa - 25lb",
        price: 6500,
        image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
        category: "Grains",
        stock: 120,
        isLocal: false,
        sellerId: "whole-3",
        sellerName: "Organic Wholesale Co.",
        description: "Premium organic quinoa",
        availabilityDate: "Today",
      },
      {
        id: "whole-prod-12",
        name: "Organic Chia Seeds - 10lb",
        price: 5400,
        image: "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400",
        category: "Seeds",
        stock: 90,
        isLocal: false,
        sellerId: "whole-3",
        sellerName: "Organic Wholesale Co.",
        description: "Pure organic chia seeds",
        availabilityDate: "Today",
      },
      {
        id: "whole-prod-13",
        name: "Organic Almonds - 25lb",
        price: 15400,
        image: "https://images.unsplash.com/photo-1508736793122-f516e3ba5569?w=400",
        category: "Nuts",
        stock: 75,
        isLocal: false,
        sellerId: "whole-3",
        sellerName: "Organic Wholesale Co.",
        description: "Raw organic almonds in bulk",
        availabilityDate: "Today",
      },
      {
        id: "whole-prod-14",
        name: "Organic Honey - 5 Gallon",
        price: 20300,
        image: "https://images.unsplash.com/photo-1587049352846-4a222e784210?w=400",
        category: "Sweeteners",
        stock: 50,
        isLocal: false,
        sellerId: "whole-3",
        sellerName: "Organic Wholesale Co.",
        description: "Pure organic raw honey",
        availabilityDate: "Today",
      },
      {
        id: "whole-prod-15",
        name: "Organic Coconut Oil - Gallon",
        price: 4400,
        image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400",
        category: "Oils",
        stock: 110,
        isLocal: false,
        sellerId: "whole-3",
        sellerName: "Organic Wholesale Co.",
        description: "Cold-pressed organic coconut oil",
        availabilityDate: "Today",
      },
    ],
  },
];

const mockProducts: Product[] = [
  // Wholesaler Bulk Products (5 items)
  {
    id: "bulk-prod-1",
    name: "50kg Rice Sack - Premium Basmati",
    price: 7500,
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
    category: "Grains",
    stock: 150,
    isLocal: false,
    sellerId: mockWholesalerId,
    sellerName: "Metro Bulk Supplies",
    description: "Premium long-grain basmati rice in 50kg bulk sacks",
    isBulk: true,
    bulkUnit: "50kg sack",
    availabilityDate: "Today",
  },
  {
    id: "bulk-prod-2",
    name: "Crate of Red Apples (200 count)",
    price: 12000,
    image: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400",
    category: "Fruits",
    stock: 85,
    isLocal: false,
    sellerId: mockWholesalerId,
    sellerName: "Metro Bulk Supplies",
    description: "Fresh red apples in commercial crates",
    isBulk: true,
    bulkUnit: "crate (200 count)",
    availabilityDate: "Today",
  },
  {
    id: "bulk-prod-3",
    name: "100L Milk Drum - Fresh Whole Milk",
    price: 19500,
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400",
    category: "Dairy",
    stock: 45,
    isLocal: false,
    sellerId: mockWholesalerId,
    sellerName: "Metro Bulk Supplies",
    description: "Fresh whole milk in 100L industrial drums",
    isBulk: true,
    bulkUnit: "100L drum",
    availabilityDate: "Today",
  },
  {
    id: "bulk-prod-4",
    name: "Wholesale Flour - 100kg Bag",
    price: 10400,
    image: "https://images.unsplash.com/photo-1628672749465-f0c0b0f9bffd?w=400",
    category: "Baking",
    stock: 200,
    isLocal: false,
    sellerId: mockWholesalerId,
    sellerName: "Metro Bulk Supplies",
    description: "All-purpose flour in 100kg commercial bags",
    isBulk: true,
    bulkUnit: "100kg bag",
    availabilityDate: "Today",
  },
  {
    id: "bulk-prod-5",
    name: "Commercial Sugar - 50kg Bag",
    price: 5700,
    image: "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=400",
    category: "Sweeteners",
    stock: 180,
    isLocal: false,
    sellerId: mockWholesalerId,
    sellerName: "Metro Bulk Supplies",
    description: "Granulated white sugar in 50kg bags",
    isBulk: true,
    bulkUnit: "50kg bag",
    availabilityDate: "Today",
  },
  // Retailer's Products (5 products - 3 in-store, 2 wholesaler proxy)
  {
    id: "prod-1",
    name: "Farm Fresh Organic Tomatoes",
    price: 410,
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400",
    category: "Vegetables",
    stock: 50,
    isLocal: true,
    sellerId: mockRetailerId,
    sellerName: "Green Valley Farm Store",
    description: "Locally grown organic tomatoes from nearby farms",
    availabilityDate: "Today",
  },
  {
    id: "prod-2",
    name: "Organic Milk - 1 Gallon",
    price: 455,
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400",
    category: "Dairy",
    stock: 100,
    isLocal: false,
    sellerId: mockRetailerId,
    sellerName: "Green Valley Farm Store",
    description: "Fresh organic milk",
    wholesalerId: "whole-2",
    availabilityDate: "2 Days",
  },
  {
    id: "prod-3",
    name: "Local Honey - Raw & Unfiltered",
    price: 1080,
    image: "https://images.unsplash.com/photo-1587049352846-4a222e784210?w=400",
    category: "Local Specialties",
    stock: 25,
    isLocal: true,
    sellerId: mockRetailerId,
    sellerName: "Green Valley Farm Store",
    description: "Pure honey from local beekeepers",
    availabilityDate: "Today",
  },
  {
    id: "prod-4",
    name: "Whole Wheat Pasta",
    price: 330,
    image: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400",
    category: "Pantry",
    stock: 80,
    isLocal: false,
    sellerId: mockRetailerId,
    sellerName: "Green Valley Farm Store",
    description: "Healthy whole wheat pasta",
    wholesalerId: "whole-1",
    availabilityDate: "3 Days",
  },
  {
    id: "prod-5",
    name: "Fresh Spinach",
    price: 290,
    image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400",
    category: "Vegetables",
    stock: 60,
    isLocal: false,
    sellerId: mockRetailerId,
    sellerName: "Green Valley Farm Store",
    description: "Fresh green spinach leaves",
    availabilityDate: "Today",
  },
  {
    id: "prod-6",
    name: "Artisan Sourdough Bread",
    price: 540,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
    category: "Local Specialties",
    stock: 30,
    isLocal: true,
    sellerId: "ret-2",
    sellerName: "Downtown Bakery",
    description: "Handcrafted sourdough made with local grains",
    availabilityDate: "Today",
  },
  {
    id: "prod-7",
    name: "Free-Range Farm Eggs",
    price: 495,
    image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400",
    category: "Dairy",
    stock: 40,
    isLocal: true,
    sellerId: "ret-3",
    sellerName: "Riverside Market",
    description: "Fresh eggs from local free-range chickens",
    availabilityDate: "Today",
  },
  {
    id: "prod-8",
    name: "Handmade Cheese Selection",
    price: 1320,
    image: "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=400",
    category: "Dairy",
    stock: 20,
    isLocal: true,
    sellerId: "ret-2",
    sellerName: "Downtown Bakery",
    description: "Artisan cheese made by local craftsmen",
    availabilityDate: "Today",
  },
  // Other Products
  {
    id: "prod-9",
    name: "Fresh Bananas",
    price: 250,
    image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400",
    category: "Fruits",
    stock: 150,
    isLocal: false,
    sellerId: "ret-3",
    sellerName: "Riverside Market",
    description: "Ripe yellow bananas",
    availabilityDate: "Today",
  },
  {
    id: "prod-10",
    name: "Greek Yogurt",
    price: 410,
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400",
    category: "Dairy",
    stock: 70,
    isLocal: false,
    sellerId: "ret-3",
    sellerName: "Riverside Market",
    description: "Creamy Greek yogurt",
    availabilityDate: "Today",
  },
  {
    id: "prod-11",
    name: "Red Bell Peppers",
    price: 370,
    image: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400",
    category: "Vegetables",
    stock: 8,
    isLocal: false,
    sellerId: "ret-2",
    sellerName: "Downtown Bakery",
    description: "Fresh red bell peppers",
    availabilityDate: "Today",
  },
  {
    id: "prod-12",
    name: "Olive Oil - Extra Virgin",
    price: 1240,
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400",
    category: "Pantry",
    stock: 35,
    isLocal: false,
    sellerId: "ret-2",
    sellerName: "Downtown Bakery",
    description: "Premium extra virgin olive oil",
    availabilityDate: "Today",
  },
  {
    id: "prod-13",
    name: "Fresh Strawberries",
    price: 495,
    image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400",
    category: "Fruits",
    stock: 55,
    isLocal: false,
    sellerId: "ret-3",
    sellerName: "Riverside Market",
    description: "Sweet fresh strawberries",
    availabilityDate: "Today",
  },
  {
    id: "prod-14",
    name: "Brown Rice - 5lb",
    price: 740,
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
    category: "Pantry",
    stock: 90,
    isLocal: false,
    sellerId: "ret-2",
    sellerName: "Downtown Bakery",
    description: "Wholesome brown rice",
    availabilityDate: "Today",
  },
  {
    id: "prod-15",
    name: "Avocados",
    price: 575,
    image: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400",
    category: "Fruits",
    stock: 65,
    isLocal: false,
    sellerId: "ret-3",
    sellerName: "Riverside Market",
    description: "Ripe avocados",
    availabilityDate: "Today",
  },
  {
    id: "prod-16",
    name: "Chicken Breast - Organic",
    price: 1075,
    image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400",
    category: "Meat",
    stock: 40,
    isLocal: false,
    sellerId: "ret-3",
    sellerName: "Riverside Market",
    description: "Fresh organic chicken breast",
    availabilityDate: "Today",
  },
  {
    id: "prod-17",
    name: "Blueberries",
    price: 660,
    image: "https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=400",
    category: "Fruits",
    stock: 50,
    isLocal: false,
    sellerId: "ret-2",
    sellerName: "Downtown Bakery",
    description: "Fresh sweet blueberries",
    availabilityDate: "Today",
  },
  {
    id: "prod-18",
    name: "Almond Milk - Unsweetened",
    price: 370,
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400",
    category: "Dairy",
    stock: 75,
    isLocal: false,
    sellerId: "ret-2",
    sellerName: "Downtown Bakery",
    description: "Unsweetened almond milk",
    availabilityDate: "Today",
  },
  {
    id: "prod-19",
    name: "Sweet Potatoes",
    price: 330,
    image: "https://images.unsplash.com/photo-1568569350062-ebfa3cb195df?w=400",
    category: "Vegetables",
    stock: 85,
    isLocal: false,
    sellerId: "ret-3",
    sellerName: "Riverside Market",
    description: "Fresh sweet potatoes",
    availabilityDate: "Today",
  },
  {
    id: "prod-20",
    name: "Dark Chocolate Bar - 70% Cacao",
    price: 410,
    image: "https://images.unsplash.com/photo-1511381939415-e44015466834?w=400",
    category: "Snacks",
    stock: 95,
    isLocal: false,
    sellerId: "ret-2",
    sellerName: "Downtown Bakery",
    description: "Rich dark chocolate",
    availabilityDate: "Today",
  },
];

const mockStockRequests: StockRequest[] = [
  {
    id: "req-1",
    retailerId: "ret-1",
    retailerName: "Green Valley Farm Store",
    productId: "bulk-prod-2",
    productName: "Crate of Red Apples (200 count)",
    quantity: 20,
    status: "pending",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "req-2",
    retailerId: "ret-2",
    retailerName: "Downtown Bakery",
    productId: "bulk-prod-4",
    productName: "Wholesale Flour - 100kg Bag",
    quantity: 15,
    status: "pending",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "req-3",
    retailerId: "ret-3",
    retailerName: "Riverside Market",
    productId: "bulk-prod-1",
    productName: "50kg Rice Sack - Premium Basmati",
    quantity: 10,
    status: "pending",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

const mockRetailers: Retailer[] = [
  {
    id: "ret-1",
    name: "Green Valley Farm Store",
    distance: "0.5km",
    location: "123 Farm Road, New York",
    rating: 4.8,
    productsCount: 156,
  },
  {
    id: "ret-2",
    name: "Downtown Bakery",
    distance: "2km",
    location: "456 Main Street, New York",
    rating: 4.6,
    productsCount: 89,
  },
  {
    id: "ret-3",
    name: "Riverside Market",
    distance: "3.5km",
    location: "789 River Avenue, New York",
    rating: 4.9,
    productsCount: 234,
  },
];

const mockReviews: Review[] = [
  {
    id: "rev-1",
    productId: "prod-1",
    orderId: "order-1",
    customerId: "user-1",
    customerName: "John Doe",
    rating: 5,
    comment: "Absolutely fresh! The tomatoes were perfect for my salad.",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "rev-2",
    productId: "prod-1",
    orderId: "order-2",
    customerId: "user-2",
    customerName: "Jane Smith",
    rating: 4,
    comment: "Great quality, but a bit pricey. Worth it for organic though.",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "rev-3",
    productId: "prod-3",
    orderId: "order-3",
    customerId: "user-3",
    customerName: "Mike Johnson",
    rating: 5,
    comment: "Best local honey I've ever tasted! Supporting local beekeepers.",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "rev-4",
    productId: "prod-6",
    orderId: "order-4",
    customerId: "user-1",
    customerName: "John Doe",
    rating: 5,
    comment: "This sourdough is amazing! The crust is perfect and it stays fresh for days.",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "rev-5",
    productId: "prod-7",
    orderId: "order-5",
    customerId: "user-4",
    customerName: "Sarah Williams",
    rating: 4,
    comment: "Fresh eggs with bright orange yolks. You can tell they're from happy chickens!",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock Orders with various statuses
const mockOrders: Order[] = [
  {
    id: "order-demo-1",
    customerId: "user-1",
    sellerId: mockRetailerId,
    products: [
      { productId: "prod-1", quantity: 2, price: 410 },
      { productId: "prod-3", quantity: 1, price: 1080 },
    ],
    total: 1900,
    status: "delivered",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryAddress: "123 Main Street, Apartment 4B, New York, NY 10001",
    paymentMethod: "Online Payment",
    scheduledDelivery: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "order-demo-2",
    customerId: "user-1",
    sellerId: mockRetailerId,
    products: [
      { productId: "prod-2", quantity: 3, price: 455 },
      { productId: "prod-5", quantity: 2, price: 290 },
    ],
    total: 1945,
    status: "out_for_delivery",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryAddress: "123 Main Street, Apartment 4B, New York, NY 10001",
    paymentMethod: "Cash on Delivery",
    scheduledDelivery: new Date().toISOString(),
  },
  {
    id: "order-demo-3",
    customerId: "user-1",
    sellerId: mockRetailerId,
    products: [
      { productId: "prod-6", quantity: 2, price: 540 },
      { productId: "prod-7", quantity: 1, price: 495 },
    ],
    total: 1575,
    status: "processed",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryAddress: "456 Oak Avenue, Suite 12, New York, NY 10002",
    paymentMethod: "Cash on Delivery",
    scheduledDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "order-demo-4",
    customerId: "user-1",
    sellerId: mockRetailerId,
    products: [
      { productId: "prod-9", quantity: 5, price: 250 },
      { productId: "prod-10", quantity: 2, price: 410 },
    ],
    total: 2070,
    status: "placed",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    deliveryAddress: "789 Pine Road, Building C, New York, NY 10003",
    paymentMethod: "Online Payment",
  },
  {
    id: "order-demo-5",
    customerId: "user-1",
    sellerId: mockRetailerId,
    products: [
      { productId: "prod-13", quantity: 3, price: 495 },
    ],
    total: 1485,
    status: "out_for_delivery",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryAddress: "321 Elm Street, House 7, New York, NY 10004",
    paymentMethod: "Cash on Delivery",
    scheduledDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const MockDataProvider = ({ children }: { children: ReactNode }) => {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [stockRequests, setStockRequests] = useState<StockRequest[]>(mockStockRequests);
  const [reviews, setReviews] = useState<Review[]>(mockReviews);
  const [wholesalerOrders, setWholesalerOrders] = useState<WholesalerOrder[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [customerQueries, setCustomerQueries] = useState<CustomerQuery[]>([
    {
      id: "query-1",
      customerId: "user-1",
      customerName: "John Doe",
      message: "Is the milk fresh today? I need it for my morning coffee.",
      status: "pending",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "query-2",
      customerId: "user-2",
      customerName: "Jane Smith",
      message: "Do you have organic vegetables available? I'm looking for pesticide-free options.",
      status: "pending",
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
  ]);

  const addOrder = (order: Order) => {
    setOrders((prev) => [...prev, order]);
  };

  const updateOrderStatus = (orderId: string, status: Order["status"]) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          const updatedOrder = { ...order, status };
          
          // Create notification for customer when order status changes
          const statusMessages: Record<Order["status"], string> = {
            placed: "Your order has been placed successfully!",
            processed: "Your order is being prepared.",
            out_for_delivery: "Your order is out for delivery!",
            delivered: "Your order has been delivered. Enjoy!",
          };
          
          const notification: Notification = {
            id: `notif-${Date.now()}`,
            userId: order.customerId,
            type: "order_status",
            title: `Order #${order.id.slice(-8)} Update`,
            message: statusMessages[status],
            orderId: order.id,
            isRead: false,
            createdAt: new Date().toISOString(),
          };
          
          setNotifications((prev) => [notification, ...prev]);
          
          return updatedOrder;
        }
        return order;
      })
    );
  };

  const addProduct = (newProduct: Omit<Product, "id">) => {
    const product: Product = {
      ...newProduct,
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => [product, ...prev]);
  };

  const getRetailerProducts = (retailerId: string) => {
    return products.filter((p) => p.sellerId === retailerId && !p.isBulk);
  };

  const getWholesalerProducts = (wholesalerId: string) => {
    return products.filter((p) => p.sellerId === wholesalerId && p.isBulk);
  };

  const updateStockRequestStatus = (requestId: string, status: "approved" | "rejected") => {
    setStockRequests((prev) =>
      prev.map((req) => (req.id === requestId ? { ...req, status } : req))
    );
  };

  const decreaseProductStock = (productId: string, quantity: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newStock = Math.max(0, p.stock - quantity);
          
          // Create notification for retailer when product goes out of stock
          if (newStock === 0 && p.stock > 0) {
            const notification: Notification = {
              id: `notif-${Date.now()}`,
              userId: p.sellerId,
              type: "stock_alert",
              title: "Product Out of Stock",
              message: `${p.name} is now out of stock. Please restock soon.`,
              isRead: false,
              createdAt: new Date().toISOString(),
            };
            setNotifications((prevNotifications) => [notification, ...prevNotifications]);
          }
          
          return { ...p, stock: newStock };
        }
        return p;
      })
    );
  };

  const addReview = (review: Review) => {
    setReviews((prev) => [...prev, review]);
  };

  const getProductReviews = (productId: string) => {
    return reviews.filter((r) => r.productId === productId);
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...updates } : p))
    );
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const addWholesalerOrder = (order: WholesalerOrder) => {
    setWholesalerOrders((prev) => [...prev, order]);
  };

  const updateWholesalerOrderStatus = (orderId: string, status: WholesalerOrder["status"]) => {
    setWholesalerOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status } : order))
    );
  };

  const getRetailerWholesalerOrders = (retailerId: string) => {
    return wholesalerOrders.filter((o) => o.retailerId === retailerId);
  };

  const receiveStock = (orderId: string, productName: string, quantity: number, retailerId: string) => {
    // Find existing product or create new one
    const existingProduct = products.find(
      (p) => p.name === productName && p.sellerId === retailerId
    );

    if (existingProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === existingProduct.id ? { ...p, stock: p.stock + quantity } : p
        )
      );
    } else {
      // Create new product with received stock
      addProduct({
        name: productName,
        price: 100, // Default price
        stock: quantity,
        category: "General",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
        isLocal: false,
        sellerId: retailerId,
        sellerName: "Green Valley Farm Store",
        description: `${productName} - Restocked`,
        availabilityDate: "Today",
      });
    }

    // Update order status
    updateWholesalerOrderStatus(orderId, "completed");
  };

  const getRetailerQueries = (retailerId: string) => {
    // For now, return all queries (in real app, filter by retailer)
    return customerQueries;
  };

  const replyToQuery = (queryId: string) => {
    setCustomerQueries((prev) =>
      prev.map((q) => (q.id === queryId ? { ...q, status: "replied" as const } : q))
    );
  };

  const updateOrderPaymentStatus = (orderId: string, isPaid: boolean) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, isPaid } : order))
    );
  };

  const getUserNotifications = (userId: string) => {
    return notifications.filter((n) => n.userId === userId).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  };

  const getUnreadNotificationCount = (userId: string) => {
    return notifications.filter((n) => n.userId === userId && !n.isRead).length;
  };

  return (
    <MockDataContext.Provider
      value={{
        currentUser: mockUser,
        products,
        retailers: mockRetailers,
        wholesalers: mockWholesalers,
        orders,
        stockRequests,
        reviews,
        wholesalerOrders,
        customerQueries,
        notifications,
        addOrder,
        updateOrderStatus,
        addProduct,
        updateProduct,
        deleteProduct,
        getRetailerProducts,
        getWholesalerProducts,
        updateStockRequestStatus,
        decreaseProductStock,
        addReview,
        getProductReviews,
        addWholesalerOrder,
        updateWholesalerOrderStatus,
        getRetailerWholesalerOrders,
        receiveStock,
        getRetailerQueries,
        replyToQuery,
        updateOrderPaymentStatus,
        getUserNotifications,
        markNotificationAsRead,
        getUnreadNotificationCount,
      }}
    >
      {children}
    </MockDataContext.Provider>
  );
};

export const useMockData = () => {
  const context = useContext(MockDataContext);
  if (!context) {
    throw new Error("useMockData must be used within MockDataProvider");
  }
  return context;
};
