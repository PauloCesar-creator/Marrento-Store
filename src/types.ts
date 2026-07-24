export type CategoryName = string;

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  name: string; // e.g., "Botão de Ouro", "Preto-Ultra9", "Rosa-Ultra9"
  quantity: number;
  imageUrl?: string;
  sku?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: CategoryName;
  price: number; // Unit selling value
  costPrice?: number; // Valor gasto / Custo de aquisição
  quantity: number; // Total quantity (sum of variants if variants exist)
  minStock: number; // Minimum stock threshold
  imageUrl: string;
  supplier: string;
  description: string;
  salesCount: number; // Total units sold
  createdAt: string;
  variants?: ProductVariant[]; // Smart Panel variations
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
