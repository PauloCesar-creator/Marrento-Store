import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid,
  Package,
  ArrowUpRight,
  BarChart3,
  Bell,
  Sparkles
} from 'lucide-react';

import { Product, Transaction, Notification, CategoryName } from './types';
import { INITIAL_PRODUCTS, INITIAL_TRANSACTIONS, SUPPLIERS } from './data';

import DashboardView from './components/DashboardView';
import InventoryView from './components/InventoryView';
import EntryFormView from './components/EntryFormView';
import ReportsView from './components/ReportsView';
import NotificationPanel from './components/NotificationPanel';
import OperationModal from './components/OperationModal';

export default function App() {
  // 1. Core Persistent States (with localStorage fallback)
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('marento_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('marento_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Dynamic categories state - started empty (excluir as categorias) as requested
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('marento_categories');
    return saved ? JSON.parse(saved) : [];
  });

  // Dynamic suppliers state - initialized with values from data.ts
  const [suppliers, setSuppliers] = useState<string[]>(() => {
    const saved = localStorage.getItem('marento_suppliers');
    return saved ? JSON.parse(saved) : SUPPLIERS.map((s) => s.name);
  });

  // 2. Navigation & UI States
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Estoque' | 'Entradas' | 'Relatórios'>('Dashboard');
  const [selectedCategory, setSelectedCategory] = useState<CategoryName | 'Todos'>('Todos');
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // 3. Quick Operation Modal States
  const [isQuickOpOpen, setIsQuickOpOpen] = useState(false);
  const [quickOpProductId, setQuickOpProductId] = useState<string | undefined>(undefined);
  const [quickOpType, setQuickOpType] = useState<'entrada' | 'saida'>('entrada');

  // Sync state to localStorage on any state modification
  useEffect(() => {
    localStorage.setItem('marento_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('marento_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('marento_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('marento_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  // Add custom category
  const handleAddCategory = (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    if (categories.some((c) => c.toLowerCase() === cleanName.toLowerCase())) {
      alert('Esta categoria já existe!');
      return;
    }
    setCategories((prev) => [...prev, cleanName]);
  };

  // Delete custom category
  const handleDeleteCategory = (name: string) => {
    // Avoid using iframe-blocking confirm()
    setCategories((prev) => prev.filter((c) => c !== name));
    if (selectedCategory === name) {
      setSelectedCategory('Todos');
    }
  };

  // Edit/rename custom category
  const handleEditCategory = (oldName: string, newName: string) => {
    const cleanNewName = newName.trim();
    if (!cleanNewName || oldName === cleanNewName) return;
    
    // Check if new name already exists
    if (categories.some((c) => c.toLowerCase() === cleanNewName.toLowerCase())) {
      alert('Esta categoria já existe!');
      return;
    }

    setCategories((prev) => prev.map((c) => c === oldName ? cleanNewName : c));
    setProducts((prevProds) => prevProds.map((prod) => prod.category === oldName ? { ...prod, category: cleanNewName } : prod));
    if (selectedCategory === oldName) {
      setSelectedCategory(cleanNewName);
    }
  };

  // Add custom supplier
  const handleAddSupplier = (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    if (suppliers.some((s) => s.toLowerCase() === cleanName.toLowerCase())) {
      alert('Este fornecedor já existe!');
      return;
    }
    setSuppliers((prev) => [...prev, cleanName]);
  };

  // Delete supplier
  const handleDeleteSupplier = (name: string) => {
    setSuppliers((prev) => prev.filter((s) => s !== name));
  };

  // Edit/rename supplier
  const handleEditSupplier = (oldName: string, newName: string) => {
    const cleanNewName = newName.trim();
    if (!cleanNewName || oldName === cleanNewName) return;

    if (suppliers.some((s) => s.toLowerCase() === cleanNewName.toLowerCase())) {
      alert('Este fornecedor já existe!');
      return;
    }

    setSuppliers((prev) => prev.map((s) => s === oldName ? cleanNewName : s));
    setProducts((prevProds) =>
      prevProds.map((prod) =>
        prod.supplier === oldName ? { ...prod, supplier: cleanNewName } : prod
      )
    );
  };

  // Run on first load to force a clean manual setup slate for the user
  useEffect(() => {
    if (!localStorage.getItem('marento_manual_v4_clean')) {
      localStorage.removeItem('marento_products');
      localStorage.removeItem('marento_transactions');
      localStorage.removeItem('marento_categories');
      setProducts([]);
      setTransactions([]);
      setCategories([]);
      setSelectedCategory('Todos');
      localStorage.setItem('marento_manual_v4_clean', 'true');
    }
  }, []);

  // 4. Automatic low-stock checking and real-time notification generator
  useEffect(() => {
    const lowStockAlerts: Notification[] = [];
    products.forEach((prod) => {
      if (prod.quantity <= prod.minStock) {
        lowStockAlerts.push({
          id: `notif-low-${prod.id}`,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          type: 'low_stock',
          message: `O item "${prod.name}" está abaixo do estoque mínimo de reposição (${prod.quantity}/${prod.minStock} unidades)!`,
          timestamp: Date.now() - 1000 * 60 * 5, // 5 mins ago
          read: false,
        });
      }
    });
    setNotifications(lowStockAlerts);
  }, [products]);

  // Mark specific notification as read
  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Handle triggered replenishment from notification button
  const handleTriggerReplenish = (productId: string) => {
    setQuickOpProductId(productId);
    setQuickOpType('entrada');
    setIsQuickOpOpen(true);
    setIsNotifOpen(false);
  };

  // 5. Actions / Mutators
  // Add product
  const handleAddProduct = (newProd: Omit<Product, 'id' | 'salesCount' | 'createdAt'>) => {
    const product: Product = {
      ...newProd,
      id: `prod-${Date.now()}`,
      salesCount: 0,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [product, ...prev]);

    // Push automatic creation transaction
    if (newProd.quantity > 0) {
      handleRecordTransaction(product.id, 'entrada', newProd.quantity, newProd.price);
    }
  };

  // Edit product
  const handleEditProduct = (updatedProd: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProd.id ? updatedProd : p))
    );
  };

  // Delete product
  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    // Filter transactions associated
    setTransactions((prev) => prev.filter((t) => t.productId !== id));
  };

  // Perform entries and exits - update balances instantly
  const handleRecordTransaction = (
    productId: string,
    type: 'entrada' | 'saida',
    qty: number,
    price: number
  ) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    // Check availability if outflow
    if (type === 'saida' && prod.quantity < qty) {
      alert(`Quantidade insuficiente! Apenas ${prod.quantity} unidades disponíveis.`);
      return;
    }

    // Update quantity & sales count on product state
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updatedQty = type === 'entrada' ? p.quantity + qty : p.quantity - qty;
          const updatedSales = type === 'saida' ? p.salesCount + qty : p.salesCount;
          return { ...p, quantity: updatedQty, price: price, salesCount: updatedSales };
        }
        return p;
      })
    );

    // Push entry to transactions history
    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      productId,
      productName: prod.name,
      sku: prod.sku,
      category: prod.category,
      type,
      quantity: qty,
      price: price,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
    };

    setTransactions((prev) => [tx, ...prev]);
  };

  // Open transaction wizard modal
  const handleOpenQuickOp = (productId?: string, type?: 'entrada' | 'saida') => {
    setQuickOpProductId(productId);
    setQuickOpType(type || 'entrada');
    setIsQuickOpOpen(true);
  };

  // Active unread warnings count
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-neutral font-sans selection:bg-brand-primary selection:text-black flex flex-col justify-between" id="app-container">
      
      {/* 1. Header (Premium Luxury Style based on image 1) */}
      <header className="sticky top-0 z-40 bg-brand-bg/95 backdrop-blur-md border-b border-brand-tertiary/60 py-4 px-4 sm:px-6" id="app-header">
        <div className="max-w-4xl mx-auto flex items-center justify-between" id="header-inner">
          
          {/* Logo brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('Dashboard')} id="brand-logo-group">
            <div className="w-10 h-10 rounded-full border border-brand-primary flex items-center justify-center bg-brand-secondary/90 shadow-lg" id="brand-logo-circle">
              {/* Lion or crown placeholder using stars */}
              <Sparkles className="w-5 h-5 text-brand-primary animate-pulse" id="brand-logo-sparkle" />
            </div>
            <div id="brand-labels">
              <h1 className="font-serif font-black text-lg tracking-wide text-brand-primary leading-tight" id="brand-title">
                MARRENTO STORE
              </h1>
              <p className="text-[10px] text-gray-500 font-medium tracking-wider uppercase leading-none" id="brand-subtitle">
                Olá, Administrador
              </p>
            </div>
          </div>

          {/* Interactive Bell dropdown area */}
          <div className="relative" id="header-right-bell">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2.5 rounded-full bg-brand-secondary border border-brand-tertiary hover:border-brand-primary hover:text-brand-primary transition shadow-md cursor-pointer"
              title="Notificações de Estoque"
              id="header-bell-btn"
            >
              <Bell className="w-5 h-5 text-brand-primary" />
              
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2.5 w-2.5" id="header-bell-pulsing-badge">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-red"></span>
                </span>
              )}
            </button>

            {/* Float notification panel */}
            <NotificationPanel
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onTriggerReplenish={handleTriggerReplenish}
              isOpen={isNotifOpen}
              onClose={() => setIsNotifOpen(false)}
            />
          </div>

        </div>
      </header>

      {/* 2. Main Content Container (Bounded width, elegant layout margins) */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-6" id="app-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            id="app-tab-container"
          >
            {activeTab === 'Dashboard' && (
              <DashboardView
                products={products}
                transactions={transactions}
                categories={categories}
                onSelectCategory={setSelectedCategory}
                onNavigateToTab={setActiveTab}
                onOpenQuickOp={handleOpenQuickOp}
                onAddCategory={handleAddCategory}
              />
            )}

            {activeTab === 'Estoque' && (
              <InventoryView
                products={products}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                onOpenQuickOp={handleOpenQuickOp}
                onDeleteProduct={handleDeleteProduct}
                onEditProduct={handleEditProduct}
                onAddProduct={handleAddProduct}
                suppliers={suppliers}
                onAddSupplier={handleAddSupplier}
                onDeleteSupplier={handleDeleteSupplier}
                onEditSupplier={handleEditSupplier}
                categories={categories}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
                onEditCategory={handleEditCategory}
              />
            )}

            {activeTab === 'Entradas' && (
              <EntryFormView
                products={products}
                onAddProduct={handleAddProduct}
                onRecordTransaction={handleRecordTransaction}
                transactions={transactions}
                suppliers={suppliers}
                onAddSupplier={handleAddSupplier}
                categories={categories}
                onAddCategory={handleAddCategory}
              />
            )}

            {activeTab === 'Relatórios' && (
              <ReportsView
                products={products}
                transactions={transactions}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. Bottom Navigation Rail (Replicated exactly from mockups) */}
      <footer className="sticky bottom-0 z-40 bg-brand-bg/95 backdrop-blur-md border-t border-brand-tertiary/80 py-2" id="app-footer">
        <nav className="max-w-md mx-auto flex justify-around items-center px-4" id="app-nav">
          
          {/* Dashboard Tab */}
          <button
            onClick={() => setActiveTab('Dashboard')}
            className={`flex flex-col items-center gap-1 py-1 px-3 text-center transition cursor-pointer group ${
              activeTab === 'Dashboard' ? 'text-brand-primary' : 'text-gray-500 hover:text-brand-neutral'
            }`}
            id="nav-btn-dashboard"
          >
            <LayoutGrid className="w-5 h-5 transition group-hover:scale-105" />
            <span className="text-[10px] font-semibold tracking-wider">Dashboard</span>
          </button>

          {/* Estoque Tab */}
          <button
            onClick={() => setActiveTab('Estoque')}
            className={`flex flex-col items-center gap-1 py-1 px-3 text-center transition cursor-pointer group ${
              activeTab === 'Estoque' ? 'text-brand-primary' : 'text-gray-500 hover:text-brand-neutral'
            }`}
            id="nav-btn-estoque"
          >
            <Package className="w-5 h-5 transition group-hover:scale-105" />
            <span className="text-[10px] font-semibold tracking-wider">Estoque</span>
          </button>

          {/* Entradas Tab */}
          <button
            onClick={() => setActiveTab('Entradas')}
            className={`flex flex-col items-center gap-1 py-1 px-3 text-center transition cursor-pointer group ${
              activeTab === 'Entradas' ? 'text-brand-primary' : 'text-gray-500 hover:text-brand-neutral'
            }`}
            id="nav-btn-entradas"
          >
            <ArrowUpRight className="w-5 h-5 transition group-hover:scale-105" />
            <span className="text-[10px] font-semibold tracking-wider">Entradas</span>
          </button>

          {/* Relatórios Tab */}
          <button
            onClick={() => setActiveTab('Relatórios')}
            className={`flex flex-col items-center gap-1 py-1 px-3 text-center transition cursor-pointer group ${
              activeTab === 'Relatórios' ? 'text-brand-primary' : 'text-gray-500 hover:text-brand-neutral'
            }`}
            id="nav-btn-relatorios"
          >
            <BarChart3 className="w-5 h-5 transition group-hover:scale-105" />
            <span className="text-[10px] font-semibold tracking-wider">Relatórios</span>
          </button>

        </nav>
      </footer>

      {/* 4. Global Action Dialog: Stock Operations */}
      <OperationModal
        isOpen={isQuickOpOpen}
        onClose={() => setIsQuickOpOpen(false)}
        products={products}
        initialProductId={quickOpProductId}
        initialType={quickOpType}
        onConfirm={handleRecordTransaction}
      />

    </div>
  );
}
