import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid,
  Package,
  ArrowUpRight,
  BarChart3,
  Bell,
  Sparkles,
  Barcode,
  Printer,
  Receipt,
  Database,
  User,
  UserCheck,
  Lock,
  AlertCircle
} from 'lucide-react';

import { Product, Transaction, Notification, CategoryName, ProductVariant } from './types';
import { INITIAL_PRODUCTS, INITIAL_TRANSACTIONS, SUPPLIERS } from './data';

import DashboardView from './components/DashboardView';
import InventoryView from './components/InventoryView';
import EntryFormView from './components/EntryFormView';
import ReportsView from './components/ReportsView';
import NotificationPanel from './components/NotificationPanel';
import OperationModal from './components/OperationModal';
import BarcodeScannerModal from './components/BarcodeScannerModal';
import PrintTagModal from './components/PrintTagModal';
import PrintReceiptModal from './components/PrintReceiptModal';
import NfceModal from './components/NfceModal';
import DatabaseStatusModal from './components/DatabaseStatusModal';
import LoginModal from './components/LoginModal';
import { useBarcodeScanner } from './utils/useBarcodeScanner';
import { generateUUID } from './utils/uuid';
import { supabase } from './lib/supabase';
import {
  dbFetchCategories,
  dbAddCategory,
  dbDeleteCategory,
  dbFetchSuppliers,
  dbAddSupplier,
  dbDeleteSupplier,
  dbFetchProducts,
  dbSaveProduct,
  dbDeleteProduct,
  dbFetchTransactions,
  dbSaveTransaction
} from './lib/dbService';

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
    const parsed: string[] = saved ? JSON.parse(saved) : [];
    return Array.from(new Set(parsed.filter(Boolean)));
  });

  // Dynamic suppliers state - initialized with values from data.ts
  const [suppliers, setSuppliers] = useState<string[]>(() => {
    const saved = localStorage.getItem('marento_suppliers');
    const parsed: string[] = saved ? JSON.parse(saved) : SUPPLIERS.map((s) => s.name);
    return Array.from(new Set(parsed.filter(Boolean)));
  });

  // 2. Navigation & UI States
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Estoque' | 'Entradas' | 'Relatórios'>('Dashboard');
  const [selectedCategory, setSelectedCategory] = useState<CategoryName | 'Todos'>('Todos');
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Authentication State (Persistent via localStorage)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('marento_auth_token') === 'logged_in_admin';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleTabClick = (tab: 'Dashboard' | 'Estoque' | 'Entradas' | 'Relatórios') => {
    if (tab === 'Relatórios' && !isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setActiveTab('Relatórios');
  };

  const handleLogout = () => {
    localStorage.removeItem('marento_auth_user');
    localStorage.removeItem('marento_auth_token');
    setIsAuthenticated(false);
    if (activeTab === 'Relatórios') {
      setActiveTab('Dashboard');
    }
  };

  // 3. Quick Operation Modal States
  const [isQuickOpOpen, setIsQuickOpOpen] = useState(false);
  const [quickOpProductId, setQuickOpProductId] = useState<string | undefined>(undefined);
  const [quickOpType, setQuickOpType] = useState<'entrada' | 'saida'>('entrada');

  // 4. Barcode Scanner, Database, Printer & NFC-e Modals States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isDbStatusOpen, setIsDbStatusOpen] = useState(false);
  const [dbSyncError, setDbSyncError] = useState<string | null>(null);
  const [printTagProduct, setPrintTagProduct] = useState<Product | null>(null);
  const [printTagVariant, setPrintTagVariant] = useState<ProductVariant | null>(null);
  const [isPrintTagOpen, setIsPrintTagOpen] = useState(false);
  const [printReceiptTx, setPrintReceiptTx] = useState<Transaction | null>(null);
  const [isPrintReceiptOpen, setIsPrintReceiptOpen] = useState(false);
  const [isNfceOpen, setIsNfceOpen] = useState(false);
  const [nfceProduct, setNfceProduct] = useState<Product | null>(null);
  const [nfceVariant, setNfceVariant] = useState<ProductVariant | null>(null);

  // Global Plug & Play USB/Bluetooth Barcode Scanner Listener
  useBarcodeScanner({
    onScan: () => {
      setIsScannerOpen(true);
    },
    enabled: true,
  });

  const handleOpenPrintTag = (prod: Product, variant?: ProductVariant) => {
    setPrintTagProduct(prod);
    setPrintTagVariant(variant || null);
    setIsPrintTagOpen(true);
  };

  const handleOpenPrintReceipt = (tx: Transaction) => {
    setPrintReceiptTx(tx);
    setIsPrintReceiptOpen(true);
  };

  const handleOpenNfce = (prod?: Product | null, variant?: ProductVariant | null) => {
    setNfceProduct(prod || null);
    setNfceVariant(variant || null);
    setIsNfceOpen(true);
  };

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

  // Initial Sync & Real-Time Sync from Supabase across devices
  useEffect(() => {
    async function loadFromSupabase() {
      try {
        const [remoteCats, remoteSups, remoteProds, remoteTxs] = await Promise.all([
          dbFetchCategories(),
          dbFetchSuppliers(),
          dbFetchProducts(),
          dbFetchTransactions()
        ]);

        if (remoteCats.length > 0) {
          setCategories(Array.from(new Set(remoteCats)));
        }
        if (remoteSups.length > 0) {
          setSuppliers(Array.from(new Set(remoteSups)));
        }
        if (remoteProds.length > 0) {
          setProducts((prev) => {
            const map = new Map<string, Product>();
            prev.forEach((p) => map.set(p.id, p));
            remoteProds.forEach((p) => map.set(p.id, p));
            return Array.from(map.values());
          });
        }
        if (remoteTxs.length > 0) {
          setTransactions((prev) => {
            const map = new Map<string, Transaction>();
            prev.forEach((t) => map.set(t.id, t));
            remoteTxs.forEach((t) => map.set(t.id, t));
            return Array.from(map.values());
          });
        }
      } catch (e) {
        console.warn('Supabase fetch attempt completed with warnings:', e);
      }
    }

    loadFromSupabase();

    // Setup Supabase Realtime channel for instant cross-device updates
    let channel: any;
    try {
      channel = supabase
        .channel('marento-realtime-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'categories' },
          async () => {
            const remoteCats = await dbFetchCategories();
            if (remoteCats.length > 0) setCategories(Array.from(new Set(remoteCats)));
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'suppliers' },
          async () => {
            const remoteSups = await dbFetchSuppliers();
            if (remoteSups.length > 0) setSuppliers(Array.from(new Set(remoteSups)));
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          async () => {
            const remoteProds = await dbFetchProducts();
            if (remoteProds.length > 0) setProducts(remoteProds);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'product_variants' },
          async () => {
            const remoteProds = await dbFetchProducts();
            if (remoteProds.length > 0) setProducts(remoteProds);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions' },
          async () => {
            const remoteTxs = await dbFetchTransactions();
            if (remoteTxs.length > 0) setTransactions(remoteTxs);
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime channel setup warning:', err);
    }

    // Secondary fallback polling every 10s for seamless sync
    const pollInterval = setInterval(() => {
      loadFromSupabase();
    }, 10000);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      clearInterval(pollInterval);
    };
  }, []);

  // Add custom category
  const handleAddCategory = async (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    if (categories.some((c) => c.toLowerCase() === cleanName.toLowerCase())) {
      alert('Esta categoria já existe!');
      return;
    }
    setCategories((prev) => [...prev, cleanName]);
    // Save to Supabase
    const res = await dbAddCategory(cleanName);
    if (res && !res.success && res.error) {
      setDbSyncError(`Aviso Supabase (Categoria): ${res.error}`);
    } else {
      setDbSyncError(null);
    }
  };

  // Delete custom category
  const handleDeleteCategory = async (name: string) => {
    setCategories((prev) => prev.filter((c) => c !== name));
    if (selectedCategory === name) {
      setSelectedCategory('Todos');
    }
    // Delete from Supabase
    await dbDeleteCategory(name);
  };

  // Edit/rename custom category
  const handleEditCategory = async (oldName: string, newName: string) => {
    const cleanNewName = newName.trim();
    if (!cleanNewName || oldName === cleanNewName) return;
    
    if (categories.some((c) => c.toLowerCase() === cleanNewName.toLowerCase())) {
      alert('Esta categoria já existe!');
      return;
    }

    setCategories((prev) => prev.map((c) => c === oldName ? cleanNewName : c));
    setProducts((prevProds) => prevProds.map((prod) => prod.category === oldName ? { ...prod, category: cleanNewName } : prod));
    if (selectedCategory === oldName) {
      setSelectedCategory(cleanNewName);
    }

    // Sync deletion of old and addition of new to Supabase
    await dbDeleteCategory(oldName);
    await dbAddCategory(cleanNewName);
  };

  // Add custom supplier
  const handleAddSupplier = async (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    if (suppliers.some((s) => s.toLowerCase() === cleanName.toLowerCase())) {
      alert('Este fornecedor já existe!');
      return;
    }
    setSuppliers((prev) => [...prev, cleanName]);
    const res = await dbAddSupplier(cleanName);
    if (res && !res.success && res.error) {
      setDbSyncError(`Aviso Supabase (Fornecedor): ${res.error}`);
    } else {
      setDbSyncError(null);
    }
  };

  // Delete supplier
  const handleDeleteSupplier = async (name: string) => {
    setSuppliers((prev) => prev.filter((s) => s !== name));
    await dbDeleteSupplier(name);
  };

  // Edit/rename supplier
  const handleEditSupplier = async (oldName: string, newName: string) => {
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

    await dbDeleteSupplier(oldName);
    await dbAddSupplier(cleanNewName);
  };

  // Run on first load to seed sample Rolex/Ultra9 item with variations if slate is empty
  useEffect(() => {
    if (!localStorage.getItem('marento_smartpanel_sample_v1')) {
      const sampleVariants = [
        {
          id: 'var-ouro',
          name: 'Botão de Ouro',
          quantity: 10,
          imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80',
          sku: 'SK-888-OURO'
        },
        {
          id: 'var-preto',
          name: 'Preto-Ultra9',
          quantity: 8,
          imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
          sku: 'SK-888-PRET'
        },
        {
          id: 'var-rosa',
          name: 'Rosa-Ultra9',
          quantity: 5,
          imageUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=600&q=80',
          sku: 'SK-888-ROSA'
        },
        {
          id: 'var-cinza',
          name: 'Cinza-Ultra9',
          quantity: 7,
          imageUrl: 'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?auto=format&fit=crop&w=600&q=80',
          sku: 'SK-888-CINZ'
        },
        {
          id: 'var-azul',
          name: 'Azul-Ultra9',
          quantity: 5,
          imageUrl: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=600&q=80',
          sku: 'SK-888-AZUL'
        }
      ];

      const sampleProduct: Product = {
        id: 'prod-rolex-smart',
        name: 'Relógio Ultra9 Esporte Silicone (Rolex)',
        sku: 'SK-888-RLX',
        category: 'Relógios',
        price: 50.00,
        quantity: 35, // Sum of 10 + 8 + 5 + 7 + 5
        minStock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
        supplier: 'Geneva Watches S/A',
        description: 'Relógio esportivo com variações de cores e pulseiras do mesmo valor. Selecione as variações no Painel Inteligente.',
        salesCount: 15,
        createdAt: new Date().toISOString(),
        variants: sampleVariants
      };

      setProducts((prev) => (prev.length === 0 ? [sampleProduct] : prev));
      setCategories((prev) => (prev.length === 0 ? ['Relógios', 'Acessórios'] : prev));
      localStorage.setItem('marento_smartpanel_sample_v1', 'true');
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
  const handleAddProduct = async (newProd: Omit<Product, 'id' | 'salesCount' | 'createdAt'>) => {
    const product: Product = {
      ...newProd,
      id: generateUUID(),
      salesCount: 0,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [product, ...prev]);

    // Save product to Supabase
    const res = await dbSaveProduct(product);
    if (res && !res.success && res.error) {
      setDbSyncError(`Aviso Supabase ao salvar produto "${product.name}": ${res.error}`);
    } else {
      setDbSyncError(null);
    }

    // Push automatic creation transaction
    if (newProd.quantity > 0) {
      handleRecordTransaction(product.id, 'entrada', newProd.quantity, newProd.price);
    }
  };

  // Edit product
  const handleEditProduct = async (updatedProd: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProd.id ? updatedProd : p))
    );
    const res = await dbSaveProduct(updatedProd);
    if (res && !res.success && res.error) {
      setDbSyncError(`Aviso Supabase ao editar produto: ${res.error}`);
    } else {
      setDbSyncError(null);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setTransactions((prev) => prev.filter((t) => t.productId !== id));
    await dbDeleteProduct(id);
  };

  // Perform entries and exits - update balances instantly
  const handleRecordTransaction = async (
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

    const updatedQty = type === 'entrada' ? prod.quantity + qty : prod.quantity - qty;
    const updatedSales = type === 'saida' ? prod.salesCount + qty : prod.salesCount;
    const updatedProduct: Product = {
      ...prod,
      quantity: updatedQty,
      price: price,
      salesCount: updatedSales
    };

    // Update quantity & sales count on product state
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? updatedProduct : p))
    );

    // Sync updated stock to Supabase
    const prodRes = await dbSaveProduct(updatedProduct);

    // Push entry to transactions history
    const tx: Transaction = {
      id: generateUUID(),
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

    // Save transaction to Supabase
    const txRes = await dbSaveTransaction(tx);

    if ((prodRes && !prodRes.success && prodRes.error) || (txRes && !txRes.success && txRes.error)) {
      const err = prodRes?.error || txRes?.error;
      setDbSyncError(`Aviso Supabase ao registrar movimentação: ${err}`);
    } else {
      setDbSyncError(null);
    }
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

          {/* Header Action Buttons: Nota Fiscal, Leitor, Status do Banco & Bell */}
          <div className="flex items-center gap-2" id="header-right-actions">
            
            {/* Emitir Nota Fiscal Button */}
            <button
              onClick={() => handleOpenNfce()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-amber-500/10 border border-amber-500/60 text-amber-300 hover:bg-amber-500 hover:text-black transition shadow-md cursor-pointer font-bold text-xs"
              title="Emitir Nota Fiscal Eletrônica (NFC-e / DANFE)"
              id="header-nfce-btn"
            >
              <Receipt className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Emitir Nota Fiscal</span>
            </button>

            {/* Status do Banco Button */}
            <button
              onClick={() => setIsDbStatusOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-brand-secondary border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-black transition shadow-md cursor-pointer font-bold text-xs"
              title="Verificar Conexão com o Banco Supabase"
              id="header-db-status-btn"
            >
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Status do Banco</span>
            </button>

            {/* Leitor de Código de Barras Bipar Button */}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-brand-secondary border border-brand-primary/60 text-brand-primary hover:bg-brand-primary hover:text-black transition shadow-md cursor-pointer font-bold text-xs"
              title="Abrir Leitor de Código de Barras Plug & Play"
              id="header-scanner-btn"
            >
              <Barcode className="w-4 h-4" />
              <span className="hidden sm:inline">Modo Bipar</span>
            </button>

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

            {/* User Icon Button (Ao lado direito da notificação) */}
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 p-2 rounded-full bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 hover:bg-rose-950/40 hover:border-rose-500/50 hover:text-rose-400 transition shadow-md cursor-pointer text-xs font-bold"
                title="Clique para Sair (Logout)"
                id="header-user-logout-btn"
              >
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <span className="hidden sm:inline pr-1">admin</span>
              </button>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="p-2.5 rounded-full bg-brand-secondary border border-brand-primary/60 text-brand-primary hover:bg-brand-primary hover:text-black transition shadow-md cursor-pointer"
                title="Login de Acesso aos Relatórios"
                id="header-user-login-btn"
              >
                <User className="w-5 h-5" />
              </button>
            )}
          </div>

        </div>
      </header>

      {/* DB Sync Warning Banner if write operation has issue */}
      {dbSyncError && (
        <div className="bg-amber-950/90 border-b border-amber-500/50 text-amber-200 px-4 py-2.5 text-xs flex items-center justify-between shadow-xl z-30 animate-fade-in" id="db-sync-error-banner">
          <div className="flex items-center gap-2 max-w-2xl">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium">{dbSyncError}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsDbStatusOpen(true)}
              className="px-2.5 py-1 bg-amber-500 text-black font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-amber-400 transition cursor-pointer"
            >
              Resolver
            </button>
            <button
              onClick={() => setDbSyncError(null)}
              className="text-amber-400 hover:text-amber-200 text-xs px-1 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
                onNavigateToTab={(tab) => handleTabClick(tab as any)}
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
                onOpenBarcodeScanner={() => setIsScannerOpen(true)}
                onOpenPrintTag={handleOpenPrintTag}
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
              isAuthenticated ? (
                <ReportsView
                  products={products}
                  transactions={transactions}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4 bg-brand-secondary/40 border border-brand-tertiary rounded-2xl max-w-md mx-auto" id="protected-reports-gate">
                  <div className="p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
                    <Lock className="w-10 h-10" />
                  </div>
                  <h3 className="font-serif font-bold text-xl text-brand-neutral">Acesso Restrito</h3>
                  <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                    Apenas usuários autenticados têm acesso ao módulo de Relatórios e métricas avançadas do sistema.
                  </p>
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="px-6 py-2.5 rounded-xl bg-brand-primary text-black font-bold text-xs hover:bg-brand-primary/90 transition shadow-lg cursor-pointer"
                    id="gate-login-btn"
                  >
                    Fazer Login como Admin
                  </button>
                </div>
              )
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. Bottom Navigation Rail (Replicated exactly from mockups) */}
      <footer className="sticky bottom-0 z-40 bg-brand-bg/95 backdrop-blur-md border-t border-brand-tertiary/80 py-2" id="app-footer">
        <nav className="max-w-md mx-auto flex justify-around items-center px-4" id="app-nav">
          
          {/* Dashboard Tab */}
          <button
            onClick={() => handleTabClick('Dashboard')}
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
            onClick={() => handleTabClick('Estoque')}
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
            onClick={() => handleTabClick('Entradas')}
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
            onClick={() => handleTabClick('Relatórios')}
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

      {/* 5. Plug & Play Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        onOpenQuickOp={handleOpenQuickOp}
        onOpenPrintTag={handleOpenPrintTag}
        onOpenNfce={handleOpenNfce}
      />

      {/* 6. Emitir Nota Fiscal (DANFE NFC-e / Cupom Fiscal EPSON) Modal */}
      <NfceModal
        isOpen={isNfceOpen}
        onClose={() => setIsNfceOpen(false)}
        products={products}
        initialProduct={nfceProduct}
        initialVariant={nfceVariant}
        onConfirmSaleAndPrint={(productId, quantity, price) => {
          handleRecordTransaction(productId, 'saida', quantity, price);
        }}
      />

      {/* 7. Thermal Barcode Label / Tag Printer Modal */}
      <PrintTagModal
        isOpen={isPrintTagOpen}
        onClose={() => setIsPrintTagOpen(false)}
        product={printTagProduct}
        selectedVariant={printTagVariant}
      />

      {/* 8. Thermal Receipt / Movement Voucher Printer Modal */}
      <PrintReceiptModal
        isOpen={isPrintReceiptOpen}
        onClose={() => setIsPrintReceiptOpen(false)}
        transaction={printReceiptTx}
      />

      {/* 8. Database Status & Health Checker Modal */}
      <DatabaseStatusModal
        isOpen={isDbStatusOpen}
        onClose={() => setIsDbStatusOpen(false)}
      />

      {/* 9. Login / Auth Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

    </div>
  );
}
