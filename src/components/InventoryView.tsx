import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Edit,
  AlertCircle,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  X,
  Check,
  Truck,
  Sparkles,
  Layers,
  Barcode,
  Printer,
  Zap,
  QrCode,
  Columns2,
  Columns3,
  LayoutGrid,
  Gem,
  Mic,
  User,
  UserCheck,
  Boxes
} from 'lucide-react';
import { Product, CategoryName, ProductVariant } from '../types';
import ProductDetailModal from './ProductDetailModal';
import NewItemModal from './NewItemModal';
import { LUXURY_IMAGE_FALLBACK } from '../lib/imageUtils';
import { useModalHistory } from '../utils/useModalHistory';
import { CartItem } from './SalesPanelModal';

interface FlyingDot {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface InventoryViewProps {
  products: Product[];
  selectedCategory: CategoryName | 'Todos';
  onSelectCategory: (category: CategoryName | 'Todos') => void;
  onDeleteProduct: (id: string) => void;
  onEditProduct: (product: Product) => void;
  onAddProduct: (product: Omit<Product, 'id' | 'salesCount' | 'createdAt'>) => void;
  onRecordTransaction?: (
    productId: string,
    type: 'entrada' | 'saida',
    quantity: number,
    price: number,
    updatedProductOverride?: Product,
    isSale?: boolean
  ) => void;
  suppliers: string[];
  onAddSupplier: (name: string) => void;
  onDeleteSupplier: (name: string) => void;
  onEditSupplier: (oldName: string, newName: string) => void;
  categories: string[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (name: string) => void;
  onEditCategory: (oldName: string, newName: string) => void;
  onOpenBarcodeScanner?: () => void;
  onOpenPrintTag?: (product: Product, variant?: any) => void;
  autoDeleteCategories?: string[];
  onToggleCategoryAutoDelete?: (categoryName: string) => void;
  onAddToCart?: (product: Product, variant?: any, qtyToAdd?: number) => void;
  cartCount?: number;
  onOpenSalesPanel?: () => void;
  cartItems?: CartItem[];
  onOpenLogin?: () => void;
  isAuthenticated?: boolean;
  onLogout?: () => void;
}

export default function InventoryView({
  products,
  selectedCategory,
  onSelectCategory,
  onDeleteProduct,
  onEditProduct,
  onAddProduct,
  onRecordTransaction,
  suppliers,
  onAddSupplier,
  onDeleteSupplier,
  onEditSupplier,
  categories,
  onAddCategory,
  onDeleteCategory,
  onEditCategory,
  onOpenBarcodeScanner,
  onOpenPrintTag,
  autoDeleteCategories = [],
  onToggleCategoryAutoDelete,
  onAddToCart,
  cartCount = 0,
  onOpenSalesPanel,
}: InventoryViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [gridCols, setGridCols] = useState<2 | 3>(() => {
    const saved = localStorage.getItem('marento_grid_cols');
    return saved === '3' ? 3 : 2;
  });
  const [flyingDots, setFlyingDots] = useState<FlyingDot[]>([]);

  const handleSetGridCols = (cols: 2 | 3) => {
    setGridCols(cols);
    localStorage.setItem('marento_grid_cols', cols.toString());
  };

  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);

  const triggerCartAdd = (btnEl: HTMLElement | null, prod: Product, variant?: ProductVariant) => {
    if (btnEl) {
      const btnRect = btnEl.getBoundingClientRect();
      const fabEl = document.getElementById('global-sales-fab');
      const fabRect = fabEl ? fabEl.getBoundingClientRect() : null;

      const startX = btnRect.left + btnRect.width / 2;
      const startY = btnRect.top + btnRect.height / 2;
      const endX = fabRect ? fabRect.left + fabRect.width / 2 : window.innerWidth - 40;
      const endY = fabRect ? fabRect.top + fabRect.height / 2 : window.innerHeight - 90;

      const newDot: FlyingDot = {
        id: Date.now() + Math.random(),
        startX,
        startY,
        endX,
        endY,
      };

      setFlyingDots((prev) => [...prev, newDot]);
    }

    if (onAddToCart) {
      onAddToCart(prod, variant);
    }
  };

  const handleVenderClick = (e: React.MouseEvent, prod: Product) => {
    e.stopPropagation();

    // Se o produto tiver variações, abre lista ágil para o usuário selecionar a variação desejada
    if (prod.variants && prod.variants.length > 0) {
      setVariantPickerProduct(prod);
      return;
    }

    // Caso não tenha variações, adiciona direto ao carrinho com animação de ponto vermelho
    const btnEl = e.currentTarget as HTMLElement;
    triggerCartAdd(btnEl, prod);
  };
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isTypingNewCat, setIsTypingNewCat] = useState(false);
  const [newCustomCategoryName, setNewCustomCategoryName] = useState('');
  const [isAddingCategoryInline, setIsAddingCategoryInline] = useState(false);
  const [newInlineCatName, setNewInlineCatName] = useState('');

  // Product Details modal state (Principal modal de detalhes e variações)
  const [detailProd, setDetailProd] = useState<Product | null>(null);

  // Category management states
  const [isManageCatsOpen, setIsManageCatsOpen] = useState(false);
  const [editingCatName, setEditingCatName] = useState<string | null>(null);
  const [editingCatValue, setEditingCatValue] = useState('');
  const [deletingCatName, setDeletingCatName] = useState<string | null>(null);
  const [newCatNameInManager, setNewCatNameInManager] = useState('');

  // Supplier management states
  const [isManageSupsOpen, setIsManageSupsOpen] = useState(false);
  const [editingSupName, setEditingSupName] = useState<string | null>(null);
  const [editingSupValue, setEditingSupValue] = useState('');
  const [deletingSupName, setDeletingSupName] = useState<string | null>(null);
  const [newSupNameInManager, setNewSupNameInManager] = useState('');

  // Handle local file uploads (converts file to Base64)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Form states for Add / Edit
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<CategoryName>('');
  const [price, setPrice] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [minStock, setMinStock] = useState(5);
  const [supplier, setSupplier] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');

  // Set default state for add product
  const handleOpenAdd = () => {
    setName('');
    const defaultCat = categories[0] || '';
    setCategory(defaultCat);
    setSku(`SK-${Math.floor(100 + Math.random() * 900)}-${defaultCat ? defaultCat.slice(0,2).toUpperCase() : 'XX'}`);
    setPrice(0);
    setCostPrice(0);
    setQuantity(0);
    setMinStock(5);
    setSupplier(suppliers[0] || '');
    setDescription('');
    setImageUrl('');
    setError('');
    setIsAddOpen(true);
  };

  // Open Edit Product
  const handleOpenEdit = (prod: Product) => {
    setEditingProd(prod);
    setName(prod.name);
    setSku(prod.sku);
    setCategory(prod.category);
    setPrice(prod.price);
    setCostPrice(prod.costPrice || 0);
    setQuantity(prod.quantity);
    setMinStock(prod.minStock);
    setSupplier(prod.supplier);
    setDescription(prod.description);
    setImageUrl(prod.imageUrl);
    setError('');
  };

  // Handle Add/Edit Submits
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !sku || !supplier) {
      setError('Por favor, preencha todos os campos obrigatórios (Nome, SKU, Fornecedor).');
      return;
    }

    if (price <= 0 && costPrice <= 0) {
      setError('O valor gasto ou o preço de venda deve ser maior que zero.');
      return;
    }

    const finalPrice = price > 0 ? price : costPrice;
    const finalCost = costPrice > 0 ? costPrice : price;

    // Default premium luxury image if empty
    const finalImageUrl = imageUrl.trim() || 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80';

    if (editingProd) {
      // Editing
      onEditProduct({
        ...editingProd,
        name,
        sku,
        category,
        price: finalPrice,
        costPrice: finalCost,
        quantity,
        minStock,
        supplier,
        description,
        imageUrl: finalImageUrl,
      });
      setEditingProd(null);
    } else {
      // Adding
      onAddProduct({
        name,
        sku,
        category,
        price: finalPrice,
        costPrice: finalCost,
        quantity,
        minStock,
        supplier,
        description,
        imageUrl: finalImageUrl,
      });
      setIsAddOpen(false);
    }
  };

  // Auto-generate SKU based on selected category when empty or default is unchanged
  const handleCategoryChange = (cat: CategoryName) => {
    setCategory(cat);
    setSku(`SK-${Math.floor(100 + Math.random() * 900)}-${cat.slice(0,2).toUpperCase()}`);
  };

  // Filter products by category and search term
  const filteredProducts = products.filter((prod) => {
    const matchesCategory = selectedCategory === 'Todos' || prod.category === selectedCategory;
    const matchesSearch =
      prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prod.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoriesList: (CategoryName | 'Todos')[] = Array.from(
    new Set(['Todos', ...categories])
  );

  // Helper to get stock badge styling
  const getStockBadgeStyle = (prod: Product) => {
    if (prod.quantity === 0) {
      return 'bg-red-500/20 border-red-500/30 text-red-400 font-bold';
    }
    return 'bg-black/80 border-white/10 text-[#ffd56d] font-bold';
  };

  return (
    <div className="space-y-6 pb-24" id="inventory-view-root">
      
      {/* 1. Page Title */}
      <div className="flex items-center justify-between" id="inv-header">
        <div id="inv-header-title">
          <h2 className="font-serif font-semibold text-2xl text-brand-neutral tracking-tight">
            Acervo de Luxo
          </h2>
          <p className="text-xs text-gray-500 font-sans mt-0.5">
            Gerenciamento geral de produtos e saldos.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2" id="inv-header-actions">
          {onOpenBarcodeScanner && (
            <button
              onClick={onOpenBarcodeScanner}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-primary text-black font-sans font-bold text-xs shadow-md transition duration-200 cursor-pointer hover:bg-brand-primary/90"
              id="inv-btn-scanner-header"
              title="Leitor de Código de Barras (Plug & Play)"
            >
              <Barcode className="w-4 h-4" />
              <span>Modo Bipar</span>
            </button>
          )}

          <button
            onClick={() => setIsManageCatsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-secondary hover:bg-brand-tertiary border border-brand-tertiary text-brand-neutral font-sans font-bold text-xs shadow-md transition duration-200 cursor-pointer"
            id="inv-btn-manage-cats"
          >
            <Tag className="w-4 h-4 text-brand-primary" />
            Categorias
          </button>

          <button
            onClick={() => setIsManageSupsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-secondary hover:bg-brand-tertiary border border-brand-tertiary text-brand-neutral font-sans font-bold text-xs shadow-md transition duration-200 cursor-pointer"
            id="inv-btn-manage-sups"
          >
            <Truck className="w-4 h-4 text-brand-primary" />
            Fornecedores
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-black font-sans font-bold text-xs shadow-md transition duration-200 cursor-pointer"
            id="inv-btn-add"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Novo Item
          </button>
        </div>
      </div>

      {/* Prominent High-Contrast "Cadastrar Novo Item" Action Button (Styled like Dashboard card, exclusively on Estoque page) */}
      <motion.div
        whileHover={{ scale: 1.008 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleOpenAdd}
        className="relative overflow-hidden rounded-2xl bg-[#1C1C1E] p-4 sm:p-5 border border-[#E5B842]/40 shadow-xl cursor-pointer transition flex items-center justify-between group"
        id="inv-hero-add-card"
      >
        <div className="absolute -right-10 -top-10 w-28 h-28 rounded-full bg-[#E5B842]/10 blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#E5B842]/15 border border-[#E5B842]/30 flex items-center justify-center text-[#ffd56d] group-hover:scale-105 transition shrink-0 shadow-md">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
          <div className="space-y-0.5">
            <span className="block text-[10px] tracking-widest font-bold uppercase text-[#D4A017] font-sans">
              CADASTRO DE PRODUTO
            </span>
            <h3 className="font-serif font-bold text-base sm:text-lg text-white group-hover:text-[#ffd56d] transition leading-tight">
              Cadastrar Novo Item
            </h3>
            <p className="text-xs text-[#8E8E93] hidden sm:block">
              Lançamento com foto em alta resolução, cálculo de lucro e SKU pelo cofre
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenAdd();
          }}
          className="relative z-10 px-4 py-2.5 rounded-xl bg-[#E5B842] group-hover:bg-[#ffd56d] text-[#121214] font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shrink-0 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Cadastrar</span>
        </button>
      </motion.div>

      {/* 2. Interactive Search and Filters */}
      <div className="space-y-3" id="inv-controls">
        {/* Search Input with Scanner Bipar Button */}
        <div className="flex gap-2" id="inv-search-wrapper">
          <div className="relative flex-1" id="inv-search-container">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" id="inv-search-icon" />
            <input
              type="text"
              placeholder="Procurar por nome, SKU, fornecedor ou código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-brand-secondary border border-brand-tertiary rounded-xl pl-10 pr-4 py-3 text-xs text-brand-neutral placeholder-gray-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              id="inv-search-input"
            />
          </div>

          {onOpenBarcodeScanner && (
            <button
              onClick={onOpenBarcodeScanner}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-3 rounded-xl bg-[#1C1C1E] hover:bg-[#2A2A2C] border border-[#ffd56d]/60 text-[#ffd56d] font-bold text-xs transition shadow-md cursor-pointer shrink-0 active:scale-95"
              id="inv-btn-bipar-search"
              title="Abrir Câmera para Escanear QR Code e Código de Barras"
            >
              <QrCode className="w-4 h-4 text-[#ffd56d]" />
              <span className="hidden sm:inline">Escanear QR Code</span>
            </button>
          )}
        </div>

        {/* Categories Scroller Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none snap-x" id="inv-pills">
          {categoriesList.map((cat, idx) => {
            const isAutoDel = autoDeleteCategories.includes(cat);
            return (
              <button
                key={`inv-pill-${cat}-${idx}`}
                onClick={() => onSelectCategory(cat)}
                className={`shrink-0 snap-start px-4 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-brand-primary border-brand-primary text-black'
                    : 'bg-brand-secondary border-brand-tertiary text-gray-400 hover:text-brand-neutral'
                }`}
                id={`inv-pill-${cat}`}
                title={isAutoDel ? 'Categoria com Auto-Exclusão ativa: produtos são apagados do estoque automaticamente ao vender' : undefined}
              >
                <span>{cat}</span>
                {isAutoDel && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ring-2 ring-amber-400/40" />
                )}
              </button>
            );
          })}

          {/* Quick inline add category button on the pills list */}
          {isAddingCategoryInline ? (
            <div className="flex items-center gap-1.5 shrink-0 bg-brand-secondary border border-brand-primary p-1.5 rounded-xl">
              <input
                type="text"
                placeholder="Nome..."
                value={newInlineCatName}
                onChange={(e) => setNewInlineCatName(e.target.value)}
                className="bg-brand-bg text-brand-neutral text-xs px-2 py-1 rounded border border-brand-tertiary focus:outline-none w-24"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = newInlineCatName.trim();
                  if (trimmed) {
                    onAddCategory(trimmed);
                    setNewInlineCatName('');
                    setIsAddingCategoryInline(false);
                  }
                }}
                className="px-2 py-1 bg-brand-primary text-black text-[10px] font-bold rounded cursor-pointer"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewInlineCatName('');
                  setIsAddingCategoryInline(false);
                }}
                className="px-2 py-1 bg-brand-tertiary text-gray-400 text-[10px] rounded hover:text-white cursor-pointer"
              >
                X
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingCategoryInline(true)}
              className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border border-dashed border-brand-primary/40 text-brand-primary hover:bg-brand-primary/10 transition flex items-center gap-1 cursor-pointer"
              id="inv-pill-add-cat-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar Categoria
            </button>
          )}
        </div>

        {/* View Mode Switcher Sub-Bar (2 Colunas vs 3 Colunas) */}
        <div className="flex items-center justify-between pt-1 text-xs" id="inv-grid-switcher-bar">
          <div className="text-[#8E8E93] text-xs font-sans">
            <span className="font-bold text-white">{filteredProducts.length}</span>{' '}
            {filteredProducts.length === 1 ? 'peça encontrada' : 'peças encontradas'}
          </div>

          <div className="flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-xl border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={() => handleSetGridCols(2)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                gridCols === 2
                  ? 'bg-gradient-to-r from-[#D4A017] to-[#ffd56d] text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
              id="inv-switch-cols-2"
              title="Exibir catálogo em 2 Colunas (Aura Luxury)"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>2 Colunas</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetGridCols(3)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                gridCols === 3
                  ? 'bg-gradient-to-r from-[#D4A017] to-[#ffd56d] text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
              id="inv-switch-cols-3"
              title="Exibir catálogo em 3 Colunas (Grid Compacto)"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>3 Colunas</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Product Cards Grid (Coluna 2 ou Coluna 3) */}
      <div
        className={
          gridCols === 2
            ? 'grid grid-cols-2 gap-3 sm:gap-4.5'
            : 'grid grid-cols-3 gap-2 sm:gap-3'
        }
        id="inv-grid"
      >
        {filteredProducts.map((prod, idx) => {
          if (gridCols === 3) {
            /* ============================================================
               COLUNA 3 COMPACT LUXURY CARD (coluna3 specification)
               ============================================================ */
            return (
              <motion.div
                key={`inv-prod-3col-${prod.id}-${idx}`}
                layout
                onClick={() => setDetailProd(prod)}
                className="relative flex flex-col rounded-xl sm:rounded-2xl border border-white/10 bg-[#1C1C1E] shadow-lg overflow-hidden group hover:border-[#ffd56d]/50 transition duration-200 cursor-pointer"
                id={`inv-card-${prod.id}`}
              >
                {/* Image Area with Top Badges */}
                <div className="relative h-28 sm:h-36 w-full overflow-hidden bg-black/60">
                  <img
                    src={prod.imageUrl || LUXURY_IMAGE_FALLBACK}
                    alt={prod.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = LUXURY_IMAGE_FALLBACK;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] via-transparent to-black/40 pointer-events-none" />

                  {/* Stock Badge Top-Right */}
                  <div className="absolute top-1.5 right-1.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-sans font-bold uppercase tracking-wider backdrop-blur-md border ${getStockBadgeStyle(
                        prod
                      )}`}
                    >
                      {prod.quantity} un
                    </span>
                  </div>

                  {/* Variations Pill if any */}
                  {prod.variants && prod.variants.length > 0 && (
                    <div className="absolute bottom-1.5 left-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#ffd56d] text-black shadow flex items-center gap-0.5">
                        <Sparkles className="w-2 h-2 stroke-[3]" />
                        {prod.variants.length} var
                      </span>
                    </div>
                  )}
                </div>

                {/* Content Area */}
                <div className="p-2 sm:p-2.5 flex flex-col justify-between flex-1 space-y-1.5">
                  <div>
                    <h3
                      className="font-sans font-bold text-xs text-white group-hover:text-[#ffd56d] transition truncate"
                      title={prod.name}
                    >
                      {prod.name}
                    </h3>
                    <span className="font-serif text-[#ffd56d] font-bold text-xs sm:text-sm tracking-tight block pt-0.5">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)}
                    </span>
                  </div>

                  {/* Fast Actions Footer */}
                  <div
                    className="flex items-center gap-1 pt-1.5 border-t border-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onOpenPrintTag && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPrintTag(prod);
                        }}
                        className="p-1 rounded-lg bg-black/40 hover:bg-[#D4A017]/20 border border-white/10 text-gray-400 hover:text-[#ffd56d] transition cursor-pointer"
                        title="Imprimir Etiqueta"
                      >
                        <Printer className="w-3 h-3" />
                      </button>
                    )}

                    {/* Vender button: jumps red dot to floating $ cart */}
                    <button
                      type="button"
                      onClick={(e) => handleVenderClick(e, prod)}
                      className="flex-1 py-1 px-1.5 rounded-lg bg-gradient-to-r from-[#D4A017] via-[#ffd56d] to-[#C59B27] hover:brightness-105 active:scale-95 text-black font-sans font-black text-[10px] sm:text-xs uppercase tracking-wider shadow flex items-center justify-center gap-1 transition cursor-pointer"
                      title="Adicionar ao carrinho de venda"
                    >
                      <Tag className="w-2.5 h-2.5 stroke-[2.8]" />
                      <span>Vender</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          }

          /* ============================================================
             COLUNA 2 EDITORIAL HAUTE LUXURY CARD (coluna2 specification)
             ============================================================ */
          return (
            <motion.div
              key={`inv-prod-2col-${prod.id}-${idx}`}
              layout
              onClick={() => setDetailProd(prod)}
              className="relative flex flex-col rounded-2xl border border-white/10 bg-[#1C1C1E] shadow-xl overflow-hidden group hover:border-[#ffd56d]/50 transition duration-200 cursor-pointer"
              id={`inv-card-${prod.id}`}
            >
              {/* Image Area with SKU and Stock Badges */}
              <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-black/60">
                <img
                  src={prod.imageUrl || LUXURY_IMAGE_FALLBACK}
                  alt={prod.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = LUXURY_IMAGE_FALLBACK;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] via-transparent to-black/35 pointer-events-none" />

                {/* SKU Badge Top-Left */}
                <div className="absolute top-2.5 left-2.5">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-black/80 backdrop-blur-md text-[#ffd56d] border border-white/10 shadow">
                    {prod.sku}
                  </span>
                </div>

                {/* Stock Status Pill Top-Right */}
                <div className="absolute top-2.5 right-2.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-sans font-bold uppercase tracking-wider backdrop-blur-md border ${getStockBadgeStyle(
                      prod
                    )}`}
                  >
                    {prod.quantity} un
                  </span>
                </div>

                {/* Variations count badge if any */}
                {prod.variants && prod.variants.length > 0 && (
                  <div className="absolute bottom-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-md text-[9px] uppercase font-bold bg-[#ffd56d] text-black shadow flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 stroke-[3]" />
                      {prod.variants.length} Variações
                    </span>
                  </div>
                )}
              </div>

              {/* Content Area */}
              <div className="p-3 sm:p-4 flex flex-col justify-between flex-1 space-y-2">
                <div>
                  <span className="text-[10px] text-[#D4A017] uppercase tracking-wider font-bold block truncate">
                    {prod.category}
                  </span>
                  <h3
                    className="font-sans font-bold text-xs sm:text-sm text-white group-hover:text-[#ffd56d] transition truncate pt-0.5"
                    title={prod.name}
                  >
                    {prod.name}
                  </h3>
                  <p className="text-[11px] text-[#8E8E93] line-clamp-1 pt-0.5">
                    {prod.description || `${prod.supplier || 'Marento'} • Acervo`}
                  </p>
                </div>

                {/* Price Display */}
                <div className="pt-0.5">
                  <span className="font-serif text-[#ffd56d] font-bold text-base sm:text-lg tracking-tight block">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)}
                  </span>
                </div>

                {/* Action Footer: Tag print, edit and Vender button */}
                <div
                  className="flex items-center justify-between gap-1.5 pt-2 border-t border-white/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1">
                    {onOpenPrintTag && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPrintTag(prod);
                        }}
                        className="p-1.5 rounded-lg bg-black/40 hover:bg-[#D4A017]/20 border border-white/10 text-gray-400 hover:text-[#ffd56d] transition cursor-pointer"
                        title="Imprimir Etiqueta"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(prod);
                      }}
                      className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                      title="Editar Produto"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Vender button: jumps red dot to floating $ cart */}
                  <button
                    type="button"
                    onClick={(e) => handleVenderClick(e, prod)}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-[#D4A017] via-[#ffd56d] to-[#C59B27] hover:brightness-105 active:scale-95 text-black font-sans font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-1 transition cursor-pointer"
                    title="Adicionar ao carrinho de venda"
                  >
                    <Tag className="w-3 h-3 stroke-[2.8]" />
                    <span>Vender</span>
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 bg-brand-secondary/30 rounded-2xl border border-dashed border-brand-tertiary" id="inv-empty">
            <ShoppingBag className="w-10 h-10 text-brand-tertiary mx-auto mb-3" id="inv-empty-icon" />
            <h4 className="font-serif text-brand-neutral font-semibold text-sm mb-1" id="inv-empty-title">Nenhum produto correspondente</h4>
            <p className="text-xs" id="inv-empty-desc">Não encontramos itens ativos que atendam aos seus filtros de pesquisa.</p>
            <button
              onClick={handleOpenAdd}
              className="mt-4 px-3.5 py-1.5 bg-brand-primary text-black rounded-lg text-[10px] font-bold font-sans uppercase tracking-wider hover:bg-brand-primary/90 transition cursor-pointer"
              id="inv-empty-add-btn"
            >
              Criar Novo Produto
            </button>
          </div>
        )}
      </div>

      {/* 4. Overlay Modals: Add / Edit Form Modal (Matching 'novo-item.jpeg') */}
      <NewItemModal
        isOpen={isAddOpen || !!editingProd}
        onClose={() => {
          setIsAddOpen(false);
          setEditingProd(null);
        }}
        onAddProduct={onAddProduct}
        categories={categories}
        suppliers={suppliers}
        onAddCategory={onAddCategory}
        onAddSupplier={onAddSupplier}
        editingProduct={editingProd}
        onEditProduct={onEditProduct}
      />

      <AnimatePresence>

        {isManageCatsOpen && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs"
              onClick={() => {
                setIsManageCatsOpen(false);
                setEditingCatName(null);
                setDeletingCatName(null);
              }}
              id="cat-mgr-overlay"
            />
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
              id="cat-mgr-modal-wrapper"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-brand-secondary border border-brand-tertiary/80 rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl flex flex-col pointer-events-auto"
                id="cat-mgr-modal"
              >
                <div className="flex items-center justify-between border-b border-brand-tertiary/40 pb-4 mb-4" id="cat-mgr-modal-header">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-brand-primary" />
                    <h3 className="font-serif font-semibold text-lg text-brand-neutral tracking-tight">
                      Gerenciar Categorias
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setIsManageCatsOpen(false);
                      setEditingCatName(null);
                      setDeletingCatName(null);
                    }}
                    className="p-1 rounded-lg hover:bg-brand-tertiary text-gray-400 hover:text-white transition cursor-pointer"
                    id="cat-mgr-close-btn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Add new category form inside the manager */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = newCatNameInManager.trim();
                    if (trimmed) {
                      onAddCategory(trimmed);
                      setNewCatNameInManager('');
                    }
                  }}
                  className="flex gap-2 mb-4"
                  id="cat-mgr-add-form"
                >
                  <input
                    type="text"
                    value={newCatNameInManager}
                    onChange={(e) => setNewCatNameInManager(e.target.value)}
                    placeholder="Adicionar nova categoria..."
                    className="flex-1 bg-brand-bg border border-brand-tertiary rounded-xl px-3 py-2 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary placeholder-gray-500"
                    id="cat-mgr-add-input"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-brand-primary text-black font-sans font-bold text-xs hover:bg-brand-primary/90 transition cursor-pointer flex items-center gap-1"
                    id="cat-mgr-add-submit"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    Adicionar
                  </button>
                </form>

                {/* Categories List */}
                <div className="space-y-2 overflow-y-auto max-h-64 pr-1 scrollbar-none" id="cat-mgr-list">
                  <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-brand-primary mb-1">
                    Categorias Cadastradas
                  </p>
                  {categories.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-xs">
                      Nenhuma categoria criada manualmente.
                    </div>
                  ) : (
                    categories.map((cat, idx) => (
                      <div
                        key={`cat-mgr-${cat}-${idx}`}
                        className="flex items-center justify-between p-2.5 bg-brand-bg/40 border border-brand-tertiary/30 rounded-xl hover:border-brand-tertiary transition"
                      >
                        {editingCatName === cat ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editingCatValue}
                              onChange={(e) => setEditingCatValue(e.target.value)}
                              className="flex-1 bg-brand-bg border border-brand-primary rounded-lg px-2.5 py-1 text-xs text-brand-neutral focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                onEditCategory(cat, editingCatValue);
                                setEditingCatName(null);
                              }}
                              className="p-1.5 rounded-lg bg-brand-primary text-black hover:bg-brand-primary/90 transition cursor-pointer"
                              title="Salvar alteração"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                            <button
                              onClick={() => setEditingCatName(null)}
                              className="p-1.5 rounded-lg bg-brand-tertiary text-gray-400 hover:text-white transition cursor-pointer"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 w-full">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-brand-neutral">
                                  {cat}
                                </span>
                                {autoDeleteCategories.includes(cat) && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                                    <Zap className="w-2.5 h-2.5 fill-amber-400" />
                                    Auto-Exclusão Ativa
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {/* Edit Trigger */}
                                <button
                                  onClick={() => {
                                    setEditingCatName(cat);
                                    setEditingCatValue(cat);
                                    setDeletingCatName(null);
                                  }}
                                  className="p-1.5 rounded-lg bg-brand-bg hover:bg-brand-tertiary border border-brand-tertiary/40 text-gray-400 hover:text-white transition cursor-pointer"
                                  title="Editar categoria"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Action (with inline confirm) */}
                                {deletingCatName === cat ? (
                                  <div className="flex items-center gap-1 ml-1">
                                    <button
                                      onClick={() => {
                                        onDeleteCategory(cat);
                                        setDeletingCatName(null);
                                      }}
                                      className="px-2 py-1 rounded bg-brand-red text-white text-[10px] font-bold hover:bg-brand-red/90 transition cursor-pointer"
                                    >
                                      Sim
                                    </button>
                                    <button
                                      onClick={() => setDeletingCatName(null)}
                                      className="px-2 py-1 rounded bg-brand-tertiary text-gray-300 text-[10px] hover:text-white transition cursor-pointer"
                                    >
                                      Não
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setDeletingCatName(cat);
                                      setEditingCatName(null);
                                    }}
                                    className="p-1.5 rounded-lg bg-brand-bg hover:bg-brand-red/10 border border-brand-tertiary/40 text-gray-400 hover:text-brand-red transition cursor-pointer"
                                    title="Excluir categoria"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Auto-Exclusão Switch */}
                            <div className="flex items-center justify-between pt-1.5 border-t border-brand-tertiary/20 text-[11px]">
                              <span className="text-gray-400 text-[10px] flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-400" />
                                Auto-Exclusão do Estoque ao Vender:
                              </span>
                              <button
                                type="button"
                                onClick={() => onToggleCategoryAutoDelete && onToggleCategoryAutoDelete(cat)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  autoDeleteCategories.includes(cat) ? 'bg-amber-400' : 'bg-brand-tertiary'
                                }`}
                                title="Ativar/Desativar exclusão automática do produto ao ser vendido (mantém o histórico)"
                              >
                                <span
                                  aria-hidden="true"
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                                    autoDeleteCategories.includes(cat) ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-brand-tertiary/40 pt-4 mt-4 flex justify-end" id="cat-mgr-modal-footer">
                  <button
                    onClick={() => {
                      setIsManageCatsOpen(false);
                      setEditingCatName(null);
                      setDeletingCatName(null);
                    }}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl bg-brand-tertiary text-gray-300 hover:text-white text-xs font-bold font-sans transition cursor-pointer text-center"
                    id="cat-mgr-close-btn-bottom"
                  >
                    Fechar
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}

        {isManageSupsOpen && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs"
              onClick={() => {
                setIsManageSupsOpen(false);
                setEditingSupName(null);
                setDeletingSupName(null);
              }}
              id="sup-mgr-overlay"
            />
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
              id="sup-mgr-modal-wrapper"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-brand-secondary border border-brand-tertiary/80 rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl flex flex-col pointer-events-auto"
                id="sup-mgr-modal"
              >
                <div className="flex items-center justify-between border-b border-brand-tertiary/40 pb-4 mb-4" id="sup-mgr-modal-header">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-brand-primary" />
                    <h3 className="font-serif font-semibold text-lg text-brand-neutral tracking-tight">
                      Gerenciar Fornecedores
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setIsManageSupsOpen(false);
                      setEditingSupName(null);
                      setDeletingSupName(null);
                    }}
                    className="p-1 rounded-lg hover:bg-brand-tertiary text-gray-400 hover:text-white transition cursor-pointer"
                    id="sup-mgr-close-btn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Add new supplier form inside the manager */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = newSupNameInManager.trim();
                    if (trimmed) {
                      onAddSupplier(trimmed);
                      setNewSupNameInManager('');
                    }
                  }}
                  className="flex gap-2 mb-4"
                  id="sup-mgr-add-form"
                >
                  <input
                    type="text"
                    value={newSupNameInManager}
                    onChange={(e) => setNewSupNameInManager(e.target.value)}
                    placeholder="Adicionar novo fornecedor..."
                    className="flex-1 bg-brand-bg border border-brand-tertiary rounded-xl px-3 py-2 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary placeholder-gray-500"
                    id="sup-mgr-add-input"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-brand-primary text-black font-sans font-bold text-xs hover:bg-brand-primary/90 transition cursor-pointer flex items-center gap-1"
                    id="sup-mgr-add-submit"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    Adicionar
                  </button>
                </form>

                {/* Suppliers List */}
                <div className="space-y-2 overflow-y-auto max-h-64 pr-1 scrollbar-none" id="sup-mgr-list">
                  <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-brand-primary mb-1">
                    Fornecedores Cadastrados
                  </p>
                  {suppliers.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-xs">
                      Nenhum fornecedor cadastrado.
                    </div>
                  ) : (
                    suppliers.map((sup, idx) => (
                      <div
                        key={`sup-mgr-${sup}-${idx}`}
                        className="flex items-center justify-between p-2.5 bg-brand-bg/40 border border-brand-tertiary/30 rounded-xl hover:border-brand-tertiary transition"
                      >
                        {editingSupName === sup ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editingSupValue}
                              onChange={(e) => setEditingSupValue(e.target.value)}
                              className="flex-1 bg-brand-bg border border-brand-primary rounded-lg px-2.5 py-1 text-xs text-brand-neutral focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                onEditSupplier(sup, editingSupValue);
                                setEditingSupName(null);
                              }}
                              className="p-1.5 rounded-lg bg-brand-primary text-black hover:bg-brand-primary/90 transition cursor-pointer"
                              title="Salvar alteração"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                            <button
                              onClick={() => setEditingSupName(null)}
                              className="p-1.5 rounded-lg bg-brand-tertiary text-gray-400 hover:text-white transition cursor-pointer"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs font-semibold text-brand-neutral">
                              {sup}
                            </span>
                            <div className="flex items-center gap-1">
                              {/* Edit Trigger */}
                              <button
                                onClick={() => {
                                  setEditingSupName(sup);
                                  setEditingSupValue(sup);
                                  setDeletingSupName(null);
                                }}
                                className="p-1.5 rounded-lg bg-brand-bg hover:bg-brand-tertiary border border-brand-tertiary/40 text-gray-400 hover:text-white transition cursor-pointer"
                                title="Editar fornecedor"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Action (with inline confirm) */}
                              {deletingSupName === sup ? (
                                <div className="flex items-center gap-1 ml-1">
                                  <button
                                    onClick={() => {
                                      onDeleteSupplier(sup);
                                      setDeletingSupName(null);
                                    }}
                                    className="px-2 py-1 rounded bg-brand-red text-white text-[10px] font-bold hover:bg-brand-red/90 transition cursor-pointer"
                                  >
                                    Sim
                                  </button>
                                  <button
                                    onClick={() => setDeletingSupName(null)}
                                    className="px-2 py-1 rounded bg-brand-tertiary text-gray-300 text-[10px] hover:text-white transition cursor-pointer"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setDeletingSupName(sup);
                                    setEditingSupName(null);
                                  }}
                                  className="p-1.5 rounded-lg bg-brand-bg hover:bg-brand-red/10 border border-brand-tertiary/40 text-gray-400 hover:text-brand-red transition cursor-pointer"
                                  title="Excluir fornecedor"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-brand-tertiary/40 pt-4 mt-4 flex justify-end" id="sup-mgr-modal-footer">
                  <button
                    onClick={() => {
                      setIsManageSupsOpen(false);
                      setEditingSupName(null);
                      setDeletingSupName(null);
                    }}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl bg-brand-tertiary text-gray-300 hover:text-white text-xs font-bold font-sans transition cursor-pointer text-center"
                    id="sup-mgr-close-btn-bottom"
                  >
                    Fechar
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Product Detail Modal (Visualizar Informações do Produto / Gestão de Variações) */}
      {detailProd && (
        <ProductDetailModal
          product={detailProd}
          isOpen={!!detailProd}
          onClose={() => setDetailProd(null)}
          onUpdateProduct={(updated) => {
            onEditProduct(updated);
            setDetailProd(updated);
          }}
          onOpenEdit={(p) => handleOpenEdit(p)}
          onOpenPrintTag={(p, v) => onOpenPrintTag && onOpenPrintTag(p, v)}
          onDeleteProduct={onDeleteProduct}
          onAddToCart={onAddToCart}
        />
      )}

      {/* Quick Variation Selector Modal: Seleção rápida e minimalista ao clicar em Vender */}
      <AnimatePresence>
        {variantPickerProduct && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4"
            id="quick-variant-picker-overlay"
            onClick={() => setVariantPickerProduct(null)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.96 }}
              transition={{ type: 'spring', damping: 26, stiffness: 360 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-sm bg-[#141416] border border-[#ffd56d]/30 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3 max-h-[85vh] flex flex-col my-auto"
              id="quick-variant-picker-window"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="min-w-0 pr-2">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-[#D4A017] font-sans">
                    SELECIONE A VARIAÇÃO
                  </span>
                  <h3 className="font-serif font-bold text-sm text-white truncate pt-0.5">
                    {variantPickerProduct.name}
                  </h3>
                  <span className="text-[11px] font-serif font-bold text-[#ffd56d]">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(variantPickerProduct.price)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setVariantPickerProduct(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-400 hover:text-white transition cursor-pointer shrink-0"
                  title="Fechar"
                  id="btn-quick-variant-close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Variations Quick List - Poucos detalhes para seleção rápida */}
              <div className="space-y-2 overflow-y-auto flex-1 pr-1 scrollbar-thin" id="quick-variant-list">
                {variantPickerProduct.variants?.map((v) => {
                  const isOutOfStock = v.quantity <= 0;
                  return (
                    <button
                      key={`quick-var-${v.id}`}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={(e) => {
                        const targetEl = e.currentTarget;
                        triggerCartAdd(targetEl, variantPickerProduct, v);
                        setVariantPickerProduct(null);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-2xl border transition text-left ${
                        isOutOfStock
                          ? 'bg-[#1C1C1E]/50 border-white/5 opacity-50 cursor-not-allowed'
                          : 'bg-[#1C1C1E] hover:bg-[#24242A] border-white/10 hover:border-[#ffd56d]/60 cursor-pointer active:scale-98 shadow-sm group'
                      }`}
                      id={`btn-quick-var-item-${v.id}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                          <img
                            src={v.imageUrl || variantPickerProduct.imageUrl || LUXURY_IMAGE_FALLBACK}
                            alt={v.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = LUXURY_IMAGE_FALLBACK;
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white group-hover:text-[#ffd56d] transition truncate">
                            {v.name}
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                            {v.quantity > 0 ? (
                              <span className="text-emerald-400 font-bold">{v.quantity} un disponível</span>
                            ) : (
                              <span className="text-red-400 font-bold">Sem estoque</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isOutOfStock ? (
                          <span className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-500 font-bold text-[10px]">
                            Esgotado
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#D4A017] to-[#ffd56d] text-black font-sans font-black text-xs uppercase tracking-wider shadow flex items-center gap-1 group-hover:brightness-105 transition">
                            <Tag className="w-3 h-3 stroke-[2.8]" />
                            <span>Vender</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Cancel Button */}
              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setVariantPickerProduct(null)}
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-bold transition cursor-pointer text-center"
                  id="btn-quick-variant-cancel"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Flying Red Dots Animation: leaping from product card straight into floating $ cart */}
      <AnimatePresence>
        {flyingDots.map((dot) => (
          <motion.div
            key={dot.id}
            initial={{
              left: dot.startX,
              top: dot.startY,
              scale: 1.4,
              opacity: 1,
            }}
            animate={{
              left: dot.endX,
              top: dot.endY,
              scale: 0.5,
              opacity: 0.9,
            }}
            transition={{
              duration: 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
            onAnimationComplete={() => {
              setFlyingDots((prev) => prev.filter((d) => d.id !== dot.id));
              const fab = document.getElementById('global-sales-fab');
              if (fab) {
                fab.classList.add('scale-125');
                setTimeout(() => fab.classList.remove('scale-125'), 180);
              }
            }}
            className="fixed pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-600 shadow-[0_0_15px_rgba(239,68,68,1)] border-2 border-white ring-2 ring-red-400"
          />
        ))}
      </AnimatePresence>

    </div>
  );
}
