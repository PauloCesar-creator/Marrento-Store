export type CategoryName = string;

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: CategoryName;
  price: number; // Unit value
  quantity: number;
  minStock: number; // Minimum stock threshold
  imageUrl: string;
  supplier: string;
  description: string;
  salesCount: number; // Total units sold
  createdAt: string;
}

export interface Transaction {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: CategoryName;
  type: 'entrada' | 'saida'; // 'entrada' (restock) or 'saida' (sale/outflow)
  quantity: number;
  price: number; // Unit value at the time
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  timestamp: number; // Epoch for sorting
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
}

export interface Notification {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: 'low_stock' | 'restock' | 'sale';
  message: string;
  timestamp: number;
  read: boolean;
}
