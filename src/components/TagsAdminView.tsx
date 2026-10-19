import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tag as TagIcon,
  Printer,
  Search,
  CheckSquare,
  Square,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  Layers,
  Copy,
  Check,
  Eye,
  FileText,
  AlertCircle,
  Barcode,
  Volume2,
  CheckCircle2
} from 'lucide-react';
import { Product, ProductVariant } from '../types';
import BarcodeDisplay from './BarcodeDisplay';
import { playScanBeep } from '../utils/barcodeUtils';

interface TagsAdminViewProps {
  products: Product[];
  categories: string[];
}

export interface PrintableTagItem {
  id: string; // unique key in print queue
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  sku: string;
  code: string; // unique variant or product code
  barcode: string;
  price: number;
  category: string;
  stock: number;
  copies: number;
}

export default function TagsAdminView({ products, categories }: TagsAdminViewProps) {
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  // Selection state: map of itemId -> number of copies
  // itemId is `prodId` for base products, or `prodId:varId` for variants
  const [selectedCopies, setSelectedCopies] = useState<Record<string, number>>({});

  // Label formatting presets
  const [labelSize, setLabelSize] = useState<'50x30' | '40x25' | '30x15' | '60x40' | 'a4_30' | 'a4_14'>('50x30');
  const [barcodeType, setBarcodeType] = useState<'code128' | 'qrcode'>('code128');
  const [showStoreName, setShowStoreName] = useState(true);
  const [customStoreName, setCustomStoreName] = useState('MARRENTO STORE');
  const [showPrice, setShowPrice] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showCategory, setShowCategory] = useState(false);
  const [previewMode, setPreviewMode] = useState<'roll' | 'grid'>('roll');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Barcode Scanner Testing Bench states
  const [isScannerTesterOpen, setIsScannerTesterOpen] = useState(false);
  const [testScanInput, setTestScanInput] = useState('');
  const [testScanResult, setTestScanResult] = useState<{
    product: Product;
    variant?: ProductVariant;
    code: string;
  } | null>(null);
  const [testScanError, setTestScanError] = useState<string | null>(null);
  const testInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus test input when tester opens
  useEffect(() => {
    if (isScannerTesterOpen) {
      setTimeout(() => {
        testInputRef.current?.focus();
      }, 50);
    }
  }, [isScannerTesterOpen]);

  const handleRunTestScan = (codeToTest: string) => {
    const clean = codeToTest.trim();
    if (!clean) return;

    let matchedProd: Product | null = null;
    let matchedVar: ProductVariant | null = null;

    for (const prod of products) {
      if (
        prod.sku.toLowerCase() === clean.toLowerCase() ||
        prod.id.toLowerCase() === clean.toLowerCase()
      ) {
        matchedProd = prod;
        break;
      }
      if (prod.variants) {
        const v = prod.variants.find(
          (v) =>
            v.code?.toLowerCase() === clean.toLowerCase() ||
            v.sku?.toLowerCase() === clean.toLowerCase() ||
            v.barcode?.toLowerCase() === clean.toLowerCase() ||
            v.id.toLowerCase() === clean.toLowerCase()
        );
        if (v) {
          matchedProd = prod;
          matchedVar = v;
          break;
        }
      }
    }

    if (matchedProd) {
      playScanBeep(1200, 0.15);
      setTestScanResult({
        product: matchedProd,
        variant: matchedVar || undefined,
        code: clean,
      });
      setTestScanError(null);
    } else {
      setTestScanResult(null);
      setTestScanError(`Código "${clean}" lido pelo scanner, porém não foi encontrado no catálogo de produtos cadastrados.`);
    }
    setTestScanInput('');
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    products.forEach((p) => {
      if (p.variants && p.variants.length > 0) {
        next[p.id] = true;
      }
    });
    setExpandedProductIds(next);
  };

  const handleCollapseAll = () => {
    setExpandedProductIds({});
  };

  // Toggle expand product variations
  const toggleExpand = (productId: string) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // Helper to get key for item
  const getItemKey = (productId: string, variantId?: string) => {
    return variantId ? `${productId}:${variantId}` : productId;
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== 'Todos' && p.category !== selectedCategory) {
        return false;
      }

      // Stock filter
      if (onlyInStock) {
        const totalQty = p.variants && p.variants.length > 0
          ? p.variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
          : p.quantity;
        if (totalQty <= 0) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(query);
        const matchSku = p.sku.toLowerCase().includes(query);
        const matchCat = p.category.toLowerCase().includes(query);
        const matchVariant = p.variants?.some(
          (v) =>
            v.name.toLowerCase().includes(query) ||
            v.sku?.toLowerCase().includes(query) ||
            v.code?.toLowerCase().includes(query)
        );
        return matchName || matchSku || matchCat || matchVariant;
      }

      return true;
    });
  }, [products, selectedCategory, onlyInStock, searchTerm]);

  // Handle single item selection toggle
  const toggleItemSelection = (
    productId: string,
    variantId?: string,
    initialStock: number = 1
  ) => {
    const key = getItemKey(productId, variantId);
    setSelectedCopies((prev) => {
      const next = { ...prev };
      if (next[key] !== undefined && next[key] > 0) {
        delete next[key];
      } else {
        next[key] = 1;
      }
      return next;
    });
  };

  // Update copies for item
  const updateCopies = (productId: string, variantId: string | undefined, delta: number) => {
    const key = getItemKey(productId, variantId);
    setSelectedCopies((prev) => {
      const current = prev[key] || 0;
      const nextVal = Math.max(0, current + delta);
      const next = { ...prev };
      if (nextVal <= 0) {
        delete next[key];
      } else {
        next[key] = nextVal;
      }
      return next;
    });
  };

  // Set direct number of copies
  const setDirectCopies = (productId: string, variantId: string | undefined, val: number) => {
    const key = getItemKey(productId, variantId);
    setSelectedCopies((prev) => {
      const next = { ...prev };
      if (val <= 0) {
        delete next[key];
      } else {
        next[key] = Math.min(999, Math.floor(val));
      }
      return next;
    });
  };

  // Select all visible items with 1 copy
  const handleSelectAllVisible = () => {
    const next: Record<string, number> = { ...selectedCopies };
    filteredProducts.forEach((p) => {
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach((v) => {
          const key = getItemKey(p.id, v.id);
          if (!next[key]) next[key] = 1;
        });
      } else {
        const key = getItemKey(p.id);
        if (!next[key]) next[key] = 1;
      }
    });
    setSelectedCopies(next);
  };

  // Sync copies to current stock quantity for selected items
  const handleSetCopiesToCurrentStock = () => {
    const next: Record<string, number> = { ...selectedCopies };
    filteredProducts.forEach((p) => {
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach((v) => {
          const key = getItemKey(p.id, v.id);
          // Set to actual stock if > 0, otherwise at least 1 if selected
          if (v.quantity > 0) {
            next[key] = v.quantity;
          }
        });
      } else {
        const key = getItemKey(p.id);
        if (p.quantity > 0) {
          next[key] = p.quantity;
        }
      }
    });
    setSelectedCopies(next);
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedCopies({});
  };

  // Build list of active printable items
  const printableItems: PrintableTagItem[] = useMemo(() => {
    const list: PrintableTagItem[] = [];

    products.forEach((p) => {
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach((v, idx) => {
          const key = getItemKey(p.id, v.id);
          const copies = selectedCopies[key];
          if (copies && copies > 0) {
            const uniqueCode = v.code || v.sku || `${p.sku}-V${String(idx + 1).padStart(2, '0')}`;
            list.push({
              id: key,
              productId: p.id,
              variantId: v.id,
              name: p.name,
              variantName: v.name,
              sku: v.sku || uniqueCode,
              code: uniqueCode,
              barcode: v.barcode || uniqueCode,
              price: p.price,
              category: p.category,
              stock: v.quantity,
              copies,
            });
          }
        });
      } else {
        const key = getItemKey(p.id);
        const copies = selectedCopies[key];
        if (copies && copies > 0) {
          list.push({
            id: key,
            productId: p.id,
            name: p.name,
            sku: p.sku,
            code: p.sku,
            barcode: p.sku,
            price: p.price,
            category: p.category,
            stock: p.quantity,
            copies,
          });
        }
      }
    });

    return list;
  }, [products, selectedCopies]);

  // Total labels count
  const totalLabelsCount = useMemo(() => {
    return printableItems.reduce((acc, item) => acc + item.copies, 0);
  }, [printableItems]);

  // Expanded flat list of single tags for printing
  const flatTagsList = useMemo(() => {
    const result: PrintableTagItem[] = [];
    printableItems.forEach((item) => {
      for (let i = 0; i < item.copies; i++) {
        result.push(item);
      }
    });
    return result;
  }, [printableItems]);

  const handlePrint = () => {
    if (flatTagsList.length === 0) {
      alert('Selecione ao menos 1 produto ou variação para imprimir etiquetas.');
      return;
    }
    window.print();
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Label size styling class generator
  const getLabelDimensionStyles = () => {
    switch (labelSize) {
      case '30x15':
        return {
          width: '130px',
          height: '75px',
          padding: '4px',
          titleSize: 'text-[9px]',
          priceSize: 'text-[10px]',
          barcodeHeight: 24,
        };
      case '40x25':
        return {
          width: '160px',
          height: '105px',
          padding: '6px',
          titleSize: 'text-[10px]',
          priceSize: 'text-xs',
          barcodeHeight: 30,
        };
      case '60x40':
        return {
          width: '240px',
          height: '160px',
          padding: '10px',
          titleSize: 'text-xs',
          priceSize: 'text-sm',
          barcodeHeight: 45,
        };
      case 'a4_30':
      case 'a4_14':
      case '50x30':
      default:
        return {
          width: '200px',
          height: '125px',
          padding: '8px',
          titleSize: 'text-[11px]',
          priceSize: 'text-xs sm:text-sm',
          barcodeHeight: 36,
        };
    }
  };

  const dims = getLabelDimensionStyles();

  return (
    <div className="space-y-6 pb-20" id="tags-admin-container">
      {/* 1. Header with Stats & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-secondary/60 border border-brand-primary/20 rounded-2xl p-5 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              <TagIcon className="w-5 h-5" />
            </span>
            <h1 className="font-serif font-bold text-xl sm:text-2xl text-brand-neutral tracking-tight">
              Central de Etiquetas & Código de Barras
            </h1>
          </div>
          <p className="text-xs text-gray-400 font-sans">
            Selecione produtos e variações do acervo para gerar e imprimir etiquetas térmicas ou em folha A4.
          </p>
        </div>

        {/* Print Summary & Action */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Total na Fila
            </span>
            <span className="font-serif text-lg sm:text-xl font-bold text-brand-primary" id="tags-total-counter">
              {totalLabelsCount} {totalLabelsCount === 1 ? 'Etiqueta' : 'Etiquetas'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsScannerTesterOpen((prev) => !prev)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
              isScannerTesterOpen
                ? 'bg-amber-400 text-black border-amber-400 font-black shadow-md'
                : 'bg-brand-bg hover:bg-brand-tertiary text-amber-300 border-amber-400/40'
            }`}
            id="tags-btn-open-tester"
            title="Testar leitura ótica com leitor físico de código de barras USB/Bluetooth"
          >
            <Barcode className="w-4 h-4" />
            <span>{isScannerTesterOpen ? 'Fechar Teste' : 'Testar Leitor (BIP)'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={totalLabelsCount === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#D4A017] via-[#ffd56d] to-[#C59B27] text-black font-black text-xs transition cursor-pointer shadow-lg hover:brightness-105 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
            id="tags-btn-print-main"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Imprimir ({totalLabelsCount})</span>
          </button>
        </div>
      </div>

      {/* 1.1 Barcode Scanner Optical Diagnostic / Test Bench */}
      {isScannerTesterOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-gradient-to-r from-amber-500/10 via-[#161618] to-amber-500/5 border-2 border-amber-400/60 rounded-2xl p-5 shadow-2xl space-y-4"
          id="tags-scanner-tester-panel"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-400/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40">
                <Barcode className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-amber-300">
                  Bancada de Teste Ótico / Leitor de Código de Barras
                </h3>
                <p className="text-xs text-gray-400">
                  Aponte seu leitor USB/Bluetooth para a etiqueta impressa ou digite o código para validar a leitura.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Sensor Ativo & Pronto
            </span>
          </div>

          {/* Test Input */}
          <div className="relative">
            <input
              ref={testInputRef}
              type="text"
              placeholder="Escaneie o código de barras com o leitor USB/Bluetooth ou digite o código/SKU..."
              value={testScanInput}
              onChange={(e) => setTestScanInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleRunTestScan(testScanInput);
                }
              }}
              className="w-full bg-black/90 border-2 border-amber-400/60 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono font-bold text-amber-300 placeholder-gray-500 focus:outline-none focus:border-amber-300 shadow-inner"
              id="tags-test-scan-input"
            />
            <button
              type="button"
              onClick={() => handleRunTestScan(testScanInput)}
              className="absolute right-2 top-2 bottom-2 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-black text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Testar Código</span>
            </button>
          </div>

          {/* Scan result display */}
          {testScanResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              id="tags-test-success-card"
            >
              <div className="flex items-center gap-3">
                <img
                  src={testScanResult.variant?.imageUrl || testScanResult.product.imageUrl}
                  alt={testScanResult.product.name}
                  className="w-14 h-14 rounded-xl object-cover border border-emerald-500/40"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Leitura Ótica 100% Legível
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-300">
                      Código Lido: {testScanResult.code}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white mt-1">
                    {testScanResult.product.name}
                    {testScanResult.variant && (
                      <span className="ml-2 text-amber-300 font-semibold text-xs">
                        ({testScanResult.variant.name})
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center gap-3 text-xs mt-0.5">
                    <span className="font-serif font-bold text-amber-300">
                      {formatBRL(testScanResult.product.price)}
                    </span>
                    <span className="text-gray-400 font-mono">
                      Estoque: <strong className="text-white">{testScanResult.variant ? testScanResult.variant.quantity : testScanResult.product.quantity} un</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-2 rounded-lg shrink-0 flex flex-col items-center">
                <BarcodeDisplay
                  text={testScanResult.code}
                  type="code128"
                  height={30}
                  showText={false}
                />
                <span className="text-[9px] font-mono text-black font-bold">
                  {testScanResult.code}
                </span>
              </div>
            </motion.div>
          )}

          {testScanError && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{testScanError}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* 2. Top Controls & Bulk Actions Bar */}
      <div className="bg-brand-secondary/40 border border-brand-tertiary/70 rounded-2xl p-4 space-y-3">
        {/* Search & Categories */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, SKU, código de variação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#18181b] border border-brand-tertiary/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary"
              id="tags-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Pills (Functional Buttons) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none" id="tags-category-filter">
            <button
              type="button"
              onClick={() => setSelectedCategory('Todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === 'Todos'
                  ? 'bg-brand-primary text-black font-bold shadow'
                  : 'bg-brand-bg text-gray-400 hover:text-white border border-brand-tertiary/60'
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={`cat-pill-${cat}`}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-brand-primary text-black font-bold shadow'
                    : 'bg-brand-bg text-gray-400 hover:text-white border border-brand-tertiary/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Batch Actions & Filter Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-brand-tertiary/40 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllVisible}
              className="px-3 py-1.5 rounded-lg bg-brand-bg hover:bg-brand-tertiary text-gray-300 hover:text-white border border-brand-tertiary/60 transition cursor-pointer flex items-center gap-1.5 font-medium"
              id="tags-btn-select-all"
            >
              <CheckSquare className="w-3.5 h-3.5 text-brand-primary" />
              <span>Marcar Visíveis</span>
            </button>

            <button
              type="button"
              onClick={handleSetCopiesToCurrentStock}
              className="px-3 py-1.5 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/30 transition cursor-pointer flex items-center gap-1.5 font-bold"
              title="Ajusta o número de etiquetas de cada item exatamente para a sua quantidade estocada"
              id="tags-btn-sync-stock"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1 Etiqueta por Estoque Atual</span>
            </button>

            {totalLabelsCount > 0 && (
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-3 py-1.5 rounded-lg bg-brand-bg hover:bg-rose-950/40 text-gray-400 hover:text-rose-400 border border-brand-tertiary/60 transition cursor-pointer flex items-center gap-1.5"
                id="tags-btn-clear-selection"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar Fila</span>
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
              className="accent-brand-primary rounded"
            />
            <span>Somente com estoque disponível</span>
          </label>
        </div>
      </div>

      {/* 3. Main Content: Split Grid (Left: Catalog Selection, Right: Layout Config & Live Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Product & Variation Selector (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-3" id="tags-catalog-column">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-serif font-bold text-sm text-brand-neutral flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-primary" />
              Catálogo de Produtos & Variações ({filteredProducts.length})
            </h3>
            <span className="text-[11px] text-gray-400 font-sans">
              Selecione os itens e informe a quantidade de cópias
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-brand-secondary/30 rounded-2xl border border-dashed border-brand-tertiary text-gray-400 space-y-2">
              <TagIcon className="w-8 h-8 text-brand-primary/50 mx-auto" />
              <p className="text-xs font-semibold text-gray-300">Nenhum produto encontrado.</p>
              <p className="text-[10px] text-gray-500">Tente ajustar a busca ou filtro de categoria.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-brand-tertiary" id="tags-products-list">
              {filteredProducts.map((p) => {
                const hasVariants = Boolean(p.variants && p.variants.length > 0);
                const isExpanded = expandedProductIds[p.id] ?? true; // default expanded to see variants easily
                const baseKey = getItemKey(p.id);
                const baseCopies = selectedCopies[baseKey] || 0;
                const isBaseSelected = baseCopies > 0;

                // Total stock for product
                const totalStock = hasVariants
                  ? p.variants!.reduce((sum, v) => sum + (v.quantity || 0), 0)
                  : p.quantity;

                return (
                  <div
                    key={`tag-prod-${p.id}`}
                    className={`rounded-2xl border transition overflow-hidden ${
                      isBaseSelected || (hasVariants && p.variants!.some((v) => (selectedCopies[getItemKey(p.id, v.id)] || 0) > 0))
                        ? 'bg-brand-secondary/80 border-brand-primary/50'
                        : 'bg-brand-secondary/40 border-brand-tertiary/60 hover:border-brand-tertiary'
                    }`}
                  >
                    {/* Main Product Row */}
                    <div className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Checkbox for simple product */}
                        {!hasVariants ? (
                          <button
                            type="button"
                            onClick={() => toggleItemSelection(p.id, undefined, p.quantity)}
                            className="p-1 text-brand-primary hover:scale-105 transition cursor-pointer"
                          >
                            {isBaseSelected ? (
                              <CheckSquare className="w-5 h-5 text-brand-primary fill-brand-primary/20" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-500" />
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleExpand(p.id)}
                            className="p-1 text-gray-400 hover:text-white transition cursor-pointer"
                            title="Expandir/recolher variações"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-brand-primary" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        )}

                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-xl bg-black/60 overflow-hidden shrink-0 border border-white/5">
                          <img
                            src={p.imageUrl || 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80'}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-brand-primary font-bold">
                              {p.sku}
                            </span>
                            <span className="text-[10px] text-gray-500">&bull;</span>
                            <span className="text-[10px] text-gray-400 truncate">
                              {p.category}
                            </span>
                          </div>

                          <h4 className="font-bold text-xs text-white truncate font-sans">
                            {p.name}
                          </h4>

                          <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                            <span className="font-serif font-bold text-amber-300">
                              {formatBRL(p.price)}
                            </span>
                            <span className="text-gray-500">&bull;</span>
                            <span className={`text-[10px] font-mono ${totalStock <= p.minStock ? 'text-rose-400 font-bold' : 'text-gray-400'}`}>
                              Estoque: {totalStock} un
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quantity Stepper (if product has NO variants) OR Variants Badge */}
                      <div className="shrink-0">
                        {!hasVariants ? (
                          <div className="flex items-center gap-1 bg-[#141416] border border-brand-tertiary/80 rounded-xl p-1">
                            <button
                              type="button"
                              onClick={() => updateCopies(p.id, undefined, -1)}
                              disabled={baseCopies <= 0}
                              className="p-1 rounded-lg text-rose-400 hover:bg-rose-950/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Diminuir cópias"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max="999"
                              value={baseCopies}
                              onChange={(e) => setDirectCopies(p.id, undefined, Number(e.target.value))}
                              className="w-12 text-center bg-transparent font-mono font-bold text-xs text-white focus:outline-none"
                              title="Número de etiquetas para imprimir"
                            />
                            <button
                              type="button"
                              onClick={() => updateCopies(p.id, undefined, 1)}
                              className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-950/40 cursor-pointer"
                              title="Aumentar cópias"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleExpand(p.id)}
                            className="px-3 py-1.5 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 text-brand-primary text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>{p.variants!.length} Variações</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Sub-list of Variations */}
                    {hasVariants && isExpanded && (
                      <div className="bg-[#121214] border-t border-brand-tertiary/40 px-4 py-3 space-y-2" id={`tags-variants-sublist-${p.id}`}>
                        <div className="flex items-center justify-between text-[11px] text-gray-400 pb-1 border-b border-white/5 font-sans">
                          <span>Variações / Cores Disponíveis:</span>
                          <button
                            type="button"
                            onClick={() => {
                              // Select all variants of this product with 1 copy
                              const next = { ...selectedCopies };
                              p.variants!.forEach((v) => {
                                const k = getItemKey(p.id, v.id);
                                next[k] = next[k] ? next[k] : 1;
                              });
                              setSelectedCopies(next);
                            }}
                            className="text-brand-primary hover:underline font-bold text-[10px]"
                          >
                            Marcar Todas desta Peça
                          </button>
                        </div>

                        {p.variants!.map((v, vIdx) => {
                          const vKey = getItemKey(p.id, v.id);
                          const vCopies = selectedCopies[vKey] || 0;
                          const isVSelected = vCopies > 0;
                          const uniqueCode = v.code || v.sku || `${p.sku}-V${String(vIdx + 1).padStart(2, '0')}`;

                          return (
                            <div
                              key={`tag-variant-row-${v.id}`}
                              className={`flex items-center justify-between gap-3 p-2 rounded-xl transition ${
                                isVSelected
                                  ? 'bg-brand-primary/15 border border-brand-primary/40 text-white'
                                  : 'bg-[#18181b]/70 border border-white/5 hover:border-brand-tertiary text-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() => toggleItemSelection(p.id, v.id, v.quantity)}
                                  className="p-1 text-brand-primary cursor-pointer"
                                >
                                  {isVSelected ? (
                                    <CheckSquare className="w-4 h-4 text-brand-primary fill-brand-primary/20" />
                                  ) : (
                                    <Square className="w-4 h-4 text-gray-500" />
                                  )}
                                </button>

                                <div className="w-8 h-8 rounded-lg bg-black overflow-hidden shrink-0 border border-white/5">
                                  <img
                                    src={v.imageUrl || p.imageUrl}
                                    alt={v.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs truncate">
                                      {v.name}
                                    </span>
                                    {/* UNIQUE VARIATION IDENTIFIER CODE */}
                                    <span
                                      onClick={() => handleCopyCode(uniqueCode, vKey)}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-400/10 border border-amber-400/30 text-[9px] font-mono font-bold text-amber-300 cursor-pointer hover:bg-amber-400/20"
                                      title="Código único da variação (Clique para copiar)"
                                    >
                                      {copiedId === vKey ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                      {uniqueCode}
                                    </span>
                                  </div>

                                  <span className="text-[10px] font-mono text-gray-400 block">
                                    Estoque: <strong className="text-brand-neutral">{v.quantity} un</strong>
                                  </span>
                                </div>
                              </div>

                              {/* Stepper for variant */}
                              <div className="flex items-center gap-1 bg-[#141416] border border-brand-tertiary/60 rounded-xl p-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => updateCopies(p.id, v.id, -1)}
                                  disabled={vCopies <= 0}
                                  className="p-1 rounded-lg text-rose-400 hover:bg-rose-950/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  title="Diminuir cópias"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  max="999"
                                  value={vCopies}
                                  onChange={(e) => setDirectCopies(p.id, v.id, Number(e.target.value))}
                                  className="w-10 text-center bg-transparent font-mono font-bold text-xs text-white focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateCopies(p.id, v.id, 1)}
                                  className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-950/40 cursor-pointer"
                                  title="Aumentar cópias"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Configuration, Thermal Presets & Live Visual Preview (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4" id="tags-config-preview-column">
          
          {/* Layout Controls Box */}
          <div className="bg-brand-secondary/70 border border-brand-tertiary/80 rounded-2xl p-4 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-brand-tertiary/40">
              <h3 className="font-serif font-bold text-sm text-brand-neutral flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-primary" />
                Configuração da Impressora
              </h3>
              <span className="text-[10px] text-brand-primary font-mono font-bold uppercase">
                {labelSize}
              </span>
            </div>

            {/* Label Format Presets */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Padrão de Etiqueta / Bobina:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLabelSize('50x30')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    labelSize === '50x30'
                      ? 'bg-brand-primary/20 border-brand-primary text-white'
                      : 'bg-brand-bg/50 border-brand-tertiary/60 text-gray-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-xs text-brand-neutral">50 × 30 mm</p>
                  <span className="text-[9px] text-gray-500 block">Térmica Varejo / Gôndola</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLabelSize('40x25')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    labelSize === '40x25'
                      ? 'bg-brand-primary/20 border-brand-primary text-white'
                      : 'bg-brand-bg/50 border-brand-tertiary/60 text-gray-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-xs text-brand-neutral">40 × 25 mm</p>
                  <span className="text-[9px] text-gray-500 block">Joalheria & Óculos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLabelSize('30x15')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    labelSize === '30x15'
                      ? 'bg-brand-primary/20 border-brand-primary text-white'
                      : 'bg-brand-bg/50 border-brand-tertiary/60 text-gray-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-xs text-brand-neutral">30 × 15 mm</p>
                  <span className="text-[9px] text-gray-500 block">Mini Joias / Brincos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLabelSize('a4_30')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    labelSize === 'a4_30'
                      ? 'bg-brand-primary/20 border-brand-primary text-white'
                      : 'bg-brand-bg/50 border-brand-tertiary/60 text-gray-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-xs text-brand-neutral">Folha A4 (Pimaco)</p>
                  <span className="text-[9px] text-gray-500 block">30 etiquetas / folha</span>
                </button>
              </div>
            </div>

            {/* Barcode Type selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Tipo do Código:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBarcodeType('code128')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                    barcodeType === 'code128'
                      ? 'bg-brand-primary text-black border-brand-primary'
                      : 'bg-brand-bg/50 border-brand-tertiary/60 text-gray-300'
                  }`}
                >
                  Barras (Code 128)
                </button>

                <button
                  type="button"
                  onClick={() => setBarcodeType('qrcode')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                    barcodeType === 'qrcode'
                      ? 'bg-brand-primary text-black border-brand-primary'
                      : 'bg-brand-bg/50 border-brand-tertiary/60 text-gray-300'
                  }`}
                >
                  QR Code Digital
                </button>
              </div>
            </div>

            {/* Elements Toggles */}
            <div className="space-y-2 pt-2 border-t border-brand-tertiary/40">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Campos Exibidos na Etiqueta:
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showStoreName}
                    onChange={(e) => setShowStoreName(e.target.checked)}
                    className="accent-brand-primary rounded"
                  />
                  <span>MARRENTO STORE</span>
                </label>

                <label className="flex items-center gap-2 text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="accent-brand-primary rounded"
                  />
                  <span>Preço de Venda</span>
                </label>

                <label className="flex items-center gap-2 text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showSku}
                    onChange={(e) => setShowSku(e.target.checked)}
                    className="accent-brand-primary rounded"
                  />
                  <span>Código / SKU</span>
                </label>

                <label className="flex items-center gap-2 text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showCategory}
                    onChange={(e) => setShowCategory(e.target.checked)}
                    className="accent-brand-primary rounded"
                  />
                  <span>Categoria</span>
                </label>
              </div>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="bg-brand-secondary/70 border border-brand-tertiary/80 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-brand-tertiary/40">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-primary" />
                <h3 className="font-serif font-bold text-sm text-brand-neutral">
                  Pré-visualização da Etiqueta
                </h3>
              </div>
              <span className="text-[10px] text-gray-400 font-sans">
                {totalLabelsCount} na fila
              </span>
            </div>

            {flatTagsList.length === 0 ? (
              <div className="text-center py-10 bg-black/40 rounded-xl border border-dashed border-white/10 text-gray-500 text-xs space-y-2">
                <Printer className="w-8 h-8 text-brand-tertiary mx-auto" />
                <p>Nenhuma etiqueta selecionada para pré-visualização.</p>
                <p className="text-[10px] text-gray-600">Marque os itens ao lado para visualizar o modelo de impressão.</p>
              </div>
            ) : (
              <div className="bg-[#09090b] p-4 rounded-xl border border-brand-tertiary/60 flex flex-col items-center justify-center min-h-[220px] overflow-hidden">
                {/* Single sample label rendered in high contrast white paper style */}
                <div
                  className="bg-white text-black rounded shadow-2xl flex flex-col justify-between items-center text-center transition-all overflow-hidden border border-gray-300"
                  style={{
                    width: dims.width,
                    minHeight: dims.height,
                    padding: dims.padding,
                  }}
                  id="tag-live-sample"
                >
                  {/* Store Name Header */}
                  {showStoreName && (
                    <div className="w-full border-b border-black/30 pb-0.5 mb-1">
                      <span className="text-[8px] font-black uppercase tracking-wider text-black block leading-none">
                        MARRENTO STORE
                      </span>
                    </div>
                  )}

                  {/* Product & Variant Name */}
                  <div className="w-full px-0.5">
                    <p className={`font-black text-black leading-tight truncate ${dims.titleSize}`}>
                      {flatTagsList[0].name}
                    </p>
                    {flatTagsList[0].variantName && (
                      <span className="inline-block text-[9px] font-bold text-black uppercase tracking-tight">
                        {flatTagsList[0].variantName}
                      </span>
                    )}
                  </div>

                  {/* Visual Barcode Display */}
                  <div className="my-1 w-full flex flex-col items-center justify-center">
                    <BarcodeDisplay
                      text={flatTagsList[0].code}
                      type={barcodeType}
                      height={dims.barcodeHeight}
                      showText={false}
                    />
                  </div>

                  {/* Footer: SKU and Price */}
                  <div className="w-full flex items-center justify-between border-t border-black/30 pt-0.5 mt-0.5 text-black">
                    {showSku && (
                      <span className="font-mono text-[9px] font-black tracking-tighter">
                        {flatTagsList[0].code}
                      </span>
                    )}
                    {showPrice && (
                      <span className={`font-black tracking-tight ${dims.priceSize}`}>
                        {formatBRL(flatTagsList[0].price)}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-gray-500 font-sans mt-3 text-center">
                  Modelo para {labelSize === 'a4_30' ? 'Folha A4 Pimaco' : `Bobina Térmica ${labelSize}`} &bull; Impressão 100% nítida
                </p>
              </div>
            )}

            {/* Quick Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={totalLabelsCount === 0}
              className="w-full py-3 px-4 rounded-xl bg-brand-primary text-black font-black text-xs flex items-center justify-center gap-2 hover:bg-brand-primary/90 transition shadow-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>Imprimir {totalLabelsCount} Etiquetas Agora</span>
            </button>
          </div>
        </div>

      </div>

      {/* =========================================================================
          PRINT ONLY CONTAINER: Hidden on screen, perfectly visible when window.print() is called
          ========================================================================= */}
      <div id="thermal-print-area" className="hidden print:block">
        <style dangerouslySetInnerHTML={{ __html: `
          @media screen {
            #thermal-print-area { display: none !important; }
          }
          @media print {
            body * {
              visibility: hidden !important;
            }
            #thermal-print-area, #thermal-print-area * {
              visibility: visible !important;
            }
            #thermal-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: black !important;
            }
            .print-tag-card {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              background: white !important;
              color: black !important;
              border: 1px solid #ccc !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              align-items: center !important;
              text-align: center !important;
              box-sizing: border-box !important;
            }
            .print-roll-layout {
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              gap: 2mm !important;
            }
            .print-a4-layout {
              display: grid !important;
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 2.5mm !important;
              width: 100% !important;
              max-width: 210mm !important;
              margin: 0 auto !important;
              padding: 5mm !important;
            }
          }
        `}} />

        <div className={labelSize === 'a4_30' ? 'print-a4-layout' : 'print-roll-layout'}>
          {flatTagsList.map((tag, idx) => (
            <div
              key={`printable-tag-${tag.id}-${idx}`}
              className="print-tag-card"
              style={{
                width: dims.width,
                height: dims.height,
                padding: dims.padding,
                margin: '1.5mm',
              }}
            >
              {/* Store Name Header */}
              {showStoreName && (
                <div style={{ width: '100%', borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    MARRENTO STORE
                  </span>
                </div>
              )}

              {/* Product and Variant Title */}
              <div style={{ width: '100%', overflow: 'hidden' }}>
                <div style={{ fontSize: '10px', fontWeight: 900, lineHeight: 1.1 }}>
                  {tag.name}
                </div>
                {tag.variantName && (
                  <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase' }}>
                    {tag.variantName}
                  </div>
                )}
              </div>

              {/* High precision SVG Barcode */}
              <div style={{ margin: '3px 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <BarcodeDisplay
                  text={tag.code}
                  type={barcodeType}
                  height={dims.barcodeHeight}
                  showText={false}
                />
              </div>

              {/* SKU & Price */}
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid black', paddingTop: '2px' }}>
                {showSku && (
                  <span style={{ fontFamily: 'monospace', fontSize: '9px', fontWeight: 900 }}>
                    {tag.code}
                  </span>
                )}
                {showPrice && (
                  <span style={{ fontSize: '11px', fontWeight: 900 }}>
                    {formatBRL(tag.price)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
