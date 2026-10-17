import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  DollarSign,
  Search,
  Barcode,
  Layers,
  Sparkles,
  CreditCard,
  QrCode,
  Banknote,
  FileText,
  Printer,
  Receipt,
  AlertCircle,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { Product, ProductVariant, Transaction } from '../types';

interface SalesPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialProductId?: string;
  onConfirmSale: (
    productId: string,
    quantity: number,
    price: number,
    details: {
      variantId?: string;
      variantName?: string;
      paymentMethod: string;
      customerName?: string;
      customProductOverride?: Product;
    }
  ) => Promise<{ success: boolean; transaction?: Transaction }>;
  onOpenPrintReceipt?: (tx: Transaction) => void;
  onOpenNfce?: (product: Product, variant?: ProductVariant) => void;
  onOpenBarcodeScanner?: () => void;
}

export default function SalesPanelModal({
  isOpen,
  onClose,
  products,
  initialProductId,
  onConfirmSale,
  onOpenPrintReceipt,
  onOpenNfce,
  onOpenBarcodeScanner,
}: SalesPanelModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [customerName, setCustomerName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [completedSale, setCompletedSale] = useState<{
    product: Product;
    variant?: ProductVariant;
    quantity: number;
    total: number;
    transaction?: Transaction;
  } | null>(null);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCompletedSale(null);
      setError('');
      setDiscount(0);
      setQuantity(1);
      setSearchTerm('');
      setIsSearching(false);

      if (initialProductId) {
        setSelectedProductId(initialProductId);
      } else if (products.length > 0 && !selectedProductId) {
        setSelectedProductId(products[0].id);
      }
    }
  }, [isOpen, initialProductId]);

  // Update selected product and default price/variant
  useEffect(() => {
    const prod = products.find((p) => p.id === selectedProductId);
    if (prod) {
      setUnitPrice(prod.price || 0);
      if (prod.variants && prod.variants.length > 0) {
        setSelectedVariantId(prod.variants[0].id);
      } else {
        setSelectedVariantId('');
      }
    }
    setError('');
  }, [selectedProductId, products]);

  if (!isOpen) return null;

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];
  const variants = selectedProduct?.variants || [];
  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  // Determine available stock
  const currentStock = selectedVariant ? selectedVariant.quantity : (selectedProduct?.quantity || 0);

  // Filtered products list for search
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const finalUnitPrice = Math.max(0, unitPrice - discount);
  const totalSale = Math.max(0, finalUnitPrice * quantity);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const handleSelectProduct = (prod: Product) => {
    setSelectedProductId(prod.id);
    setIsSearching(false);
    setSearchTerm('');
    setQuantity(1);
    setDiscount(0);
    setUnitPrice(prod.price || 0);
    if (prod.variants && prod.variants.length > 0) {
      setSelectedVariantId(prod.variants[0].id);
    } else {
      setSelectedVariantId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      setError('Selecione um produto para realizar a venda.');
      return;
    }

    if (quantity <= 0) {
      setError('A quantidade vendida deve ser de no mínimo 1 unidade.');
      return;
    }

    if (currentStock < quantity) {
      setError(`Estoque insuficiente! Há apenas ${currentStock} un disponível.`);
      return;
    }

    let updatedProductOverride: Product;

    if (selectedVariant) {
      const updatedVariants = variants.map((v) => {
        if (v.id === selectedVariant.id) {
          return { ...v, quantity: Math.max(0, v.quantity - quantity) };
        }
        return v;
      });
      const newTotal = updatedVariants.reduce((sum, v) => sum + (v.quantity || 0), 0);
      updatedProductOverride = {
        ...selectedProduct,
        variants: updatedVariants,
        quantity: newTotal,
        salesCount: (selectedProduct.salesCount || 0) + quantity,
      };
    } else {
      updatedProductOverride = {
        ...selectedProduct,
        quantity: Math.max(0, selectedProduct.quantity - quantity),
        salesCount: (selectedProduct.salesCount || 0) + quantity,
      };
    }

    const result = await onConfirmSale(selectedProduct.id, quantity, finalUnitPrice, {
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      paymentMethod,
      customerName: customerName.trim() || undefined,
      customProductOverride: updatedProductOverride,
    });

    setCompletedSale({
      product: selectedProduct,
      variant: selectedVariant,
      quantity,
      total: totalSale,
      transaction: result.transaction,
    });
  };

  const handleStartNewSale = () => {
    setCompletedSale(null);
    setQuantity(1);
    setDiscount(0);
    setCustomerName('');
    setError('');
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        id="sales-panel-overlay"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
          id="sales-panel-backdrop"
        />

        {/* Modal Window with Luxury Dark Gold Theme */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 360 }}
          className="relative z-10 w-full max-w-lg bg-[#121214] border border-[#ffd56d]/30 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col my-auto max-h-[94vh]"
          id="sales-panel-window"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#ffd56d]/15 bg-gradient-to-r from-[#18181b] via-[#141416] to-[#18181b]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#D4A017] via-[#F3E5AB] to-[#C59B27] flex items-center justify-center text-black shadow-lg shadow-[#D4A017]/20 border border-[#ffd56d]/40">
                <DollarSign className="w-6 h-6 stroke-[2.8]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif font-black text-xl text-white tracking-tight leading-tight">
                    Painel de Venda
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold bg-[#D4A017]/20 text-[#ffd56d] border border-[#D4A017]/40">
                    PDV Express
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA] font-sans mt-0.5">
                  Lançamento e registro de venda de luxo
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#1C1C1E] border border-white/5 flex items-center justify-center text-[#8E8E93] hover:text-white hover:bg-[#2A2A2C] transition cursor-pointer shrink-0 ml-3"
              id="sales-panel-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* SUCCESS SCREEN */}
          {completedSale ? (
            <div className="p-6 space-y-6 flex-1 overflow-y-auto text-center" id="sales-completed-screen">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="font-serif font-bold text-2xl text-white">
                  Venda Concluída!
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Estoque atualizado e faturamento registrado no sistema.
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="bg-[#18181b] border border-[#ffd56d]/20 rounded-2xl p-4 text-left space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-xs text-gray-400">Item Vendido:</span>
                  <span className="text-xs font-bold text-white truncate max-w-[200px]">
                    {completedSale.product.name}
                  </span>
                </div>
                {completedSale.variant && (
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-xs text-gray-400">Variação:</span>
                    <span className="text-xs font-bold text-[#ffd56d]">
                      {completedSale.variant.name}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-xs text-gray-400">Quantidade:</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {completedSale.quantity} un
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-xs text-gray-400">Pagamento:</span>
                  <span className="text-xs font-bold text-brand-primary">
                    {paymentMethod}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-bold text-gray-300">Total Pago:</span>
                  <span className="font-serif text-lg font-black text-[#ffd56d]">
                    {formatBRL(completedSale.total)}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {onOpenPrintReceipt && completedSale.transaction && (
                  <button
                    type="button"
                    onClick={() => {
                      if (completedSale.transaction) {
                        onOpenPrintReceipt(completedSale.transaction);
                      }
                    }}
                    className="py-3 px-4 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-white font-sans text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border border-white/10"
                    id="sales-btn-print-receipt"
                  >
                    <Receipt className="w-4 h-4 text-[#ffd56d]" />
                    <span>Imprimir Cupom</span>
                  </button>
                )}

                {onOpenNfce && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenNfce(completedSale.product, completedSale.variant);
                    }}
                    className="py-3 px-4 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-white font-sans text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border border-white/10"
                    id="sales-btn-emit-nfce"
                  >
                    <FileText className="w-4 h-4 text-brand-primary" />
                    <span>Emitir NFC-e</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleStartNewSale}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#D4A017] via-[#ffd56d] to-[#C59B27] text-black font-sans text-sm font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg hover:brightness-105 active:scale-98"
                id="sales-btn-new-sale"
              >
                <Plus className="w-5 h-5 stroke-[3]" />
                <span>Iniciar Nova Venda</span>
              </button>
            </div>
          ) : (
            /* SALE FORM */
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {/* Search & Barcode Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar peça por nome, SKU..."
                      value={searchTerm}
                      onFocus={() => setIsSearching(true)}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsSearching(true);
                      }}
                      className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ffd56d]"
                      id="sales-search-input"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          setIsSearching(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {onOpenBarcodeScanner && (
                    <button
                      type="button"
                      onClick={() => onOpenBarcodeScanner()}
                      className="shrink-0 px-3 py-2.5 rounded-xl bg-[#1f1f23] hover:bg-[#27272a] text-[#ffd56d] border border-[#ffd56d]/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      title="Escanear Código de Barras"
                      id="sales-btn-barcode-scan"
                    >
                      <Barcode className="w-4 h-4" />
                      <span>Bipar</span>
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {isSearching && (
                  <div className="bg-[#18181b] border border-[#ffd56d]/30 rounded-2xl p-2 max-h-48 overflow-y-auto space-y-1 shadow-2xl z-20">
                    {filteredProducts.length === 0 ? (
                      <p className="text-xs text-gray-500 py-3 text-center font-sans">
                        Nenhuma peça encontrada com "{searchTerm}".
                      </p>
                    ) : (
                      filteredProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectProduct(p)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition cursor-pointer ${
                            selectedProductId === p.id
                              ? 'bg-[#D4A017]/20 border border-[#ffd56d] text-white'
                              : 'bg-[#141416] hover:bg-[#27272a] text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <img
                              src={p.imageUrl || 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80'}
                              alt={p.name}
                              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-white/5"
                            />
                            <div className="truncate">
                              <p className="font-bold text-white truncate">{p.name}</p>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {p.sku} &bull; {p.category}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 pl-2">
                            <span className="font-serif font-bold text-[#ffd56d]">
                              {formatBRL(p.price)}
                            </span>
                            <span className={`block text-[9px] font-mono ${p.quantity <= p.minStock ? 'text-rose-400' : 'text-gray-400'}`}>
                              Estoque: {p.quantity} un
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* SELECTED ITEM DISPLAY CARD */}
              {selectedProduct && (
                <div className="bg-[#161618] border border-[#ffd56d]/25 rounded-2xl p-3.5 space-y-3" id="sales-selected-product-card">
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10 relative">
                      <img
                        src={selectedProduct.imageUrl || 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80'}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-gray-400">
                          {selectedProduct.sku}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                          currentStock <= selectedProduct.minStock
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {currentStock} un em estoque
                        </span>
                      </div>

                      <h3 className="font-serif font-bold text-sm text-white truncate mt-0.5">
                        {selectedProduct.name}
                      </h3>
                      <p className="text-[10px] text-gray-400">
                        {selectedProduct.category} &bull; Fornecedor: {selectedProduct.supplier}
                      </p>

                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-serif text-base font-black text-[#ffd56d]">
                          {formatBRL(selectedProduct.price)}
                        </span>
                        <span className="text-[10px] text-gray-400">preço unitário</span>
                      </div>
                    </div>
                  </div>

                  {/* VARIATIONS SELECTOR (If product has variants) */}
                  {variants.length > 0 && (
                    <div className="pt-2 border-t border-white/5 space-y-1.5" id="sales-variants-container">
                      <label className="text-[11px] font-bold text-[#ffd56d] uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Selecione a Variação / Cor:
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {variants.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVariantId(v.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-sans font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              selectedVariantId === v.id
                                ? 'bg-gradient-to-r from-[#D4A017] to-[#ffd56d] text-black shadow-md font-extrabold'
                                : 'bg-[#1C1C1E] border border-white/10 text-gray-300 hover:text-white'
                            }`}
                          >
                            <span>{v.name}</span>
                            <span className="text-[10px] opacity-75 font-mono">({v.quantity} un)</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* QUANTITY & PRICING GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Quantity Controls */}
                <div className="bg-[#18181b] border border-white/10 rounded-2xl p-3 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Quantidade
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      disabled={quantity <= 1}
                      className="w-10 h-10 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <input
                      type="number"
                      min="1"
                      max={currentStock || 999}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                      className="w-16 bg-transparent text-center font-mono text-xl font-bold text-white focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.min(currentStock || 999, prev + 1))}
                      disabled={quantity >= currentStock}
                      className="w-10 h-10 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    {[1, 2, 5].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQuantity(preset)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                          quantity === preset
                            ? 'bg-[#ffd56d] text-black font-extrabold'
                            : 'bg-[#27272a] text-gray-400 hover:text-white'
                        }`}
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Unit Price & Discount */}
                <div className="bg-[#18181b] border border-white/10 rounded-2xl p-3 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Valor Unitário / Desconto
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <span className="text-[9px] text-gray-500 block">Preço</span>
                      <input
                        type="number"
                        step="0.01"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full bg-[#121214] border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#ffd56d]"
                      />
                    </div>
                    <div className="w-24">
                      <span className="text-[9px] text-gray-500 block">Desconto (R$)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={discount}
                        onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full bg-[#121214] border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono text-rose-300 focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 text-right pt-0.5">
                    Unitário Líquido: <strong className="text-white font-mono">{formatBRL(finalUnitPrice)}</strong>
                  </p>
                </div>
              </div>

              {/* PAYMENT METHOD SELECTOR */}
              <div className="space-y-1.5" id="sales-payment-methods">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffd56d]">
                  Forma de Pagamento
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'PIX', label: 'PIX', icon: QrCode },
                    { id: 'Cartão de Crédito', label: 'Crédito', icon: CreditCard },
                    { id: 'Cartão de Débito', label: 'Débito', icon: CreditCard },
                    { id: 'Dinheiro', label: 'Dinheiro', icon: Banknote },
                  ].map((pm) => {
                    const Icon = pm.icon;
                    const isSelected = paymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#D4A017]/20 border-[#ffd56d] text-[#ffd56d] shadow-sm'
                            : 'bg-[#18181b] border-white/5 text-gray-400 hover:text-white hover:bg-[#202024]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customer Name (Optional) */}
              <div>
                <input
                  type="text"
                  placeholder="Nome do cliente (opcional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ffd56d]"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* TOTAL & SUBMIT BUTTON */}
              <div className="pt-2 border-t border-[#ffd56d]/15 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs uppercase font-bold text-gray-400">
                    Total da Venda ({quantity} {quantity === 1 ? 'item' : 'itens'})
                  </span>
                  <span className="font-serif text-2xl sm:text-3xl font-black text-[#ffd56d]">
                    {formatBRL(totalSale)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={currentStock <= 0}
                  className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-[#D4A017] via-[#ffd56d] to-[#C59B27] text-black font-sans text-sm font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_4px_20px_rgba(212,160,23,0.4)] hover:brightness-105 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
                  id="sales-btn-confirm"
                >
                  <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                  <span>Finalizar Venda &bull; {formatBRL(totalSale)}</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
