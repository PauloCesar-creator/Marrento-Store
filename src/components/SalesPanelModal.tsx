import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  CheckCircle2,
  Trash2,
  ShoppingCart,
  Info
} from 'lucide-react';
import { Product, ProductVariant, Transaction } from '../types';
import { playScanBeep } from '../utils/barcodeUtils';
import { generateUUID } from '../utils/uuid';
import { useModalHistory } from '../utils/useModalHistory';

export interface CartItem {
  id: string; // unique item id: `${productId}-${variantId || 'base'}`
  productId: string;
  variantId?: string;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  unitPrice: number;
  availableStock: number;
}

interface SalesPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialProductId?: string;
  initialVariantId?: string;
  initialCartItems?: CartItem[];
  onUpdateCart?: (items: CartItem[]) => void;
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
}

export default function SalesPanelModal({
  isOpen,
  onClose,
  products,
  initialProductId,
  initialVariantId,
  initialCartItems,
  onUpdateCart,
  onConfirmSale,
  onOpenPrintReceipt,
  onOpenNfce,
}: SalesPanelModalProps) {
  // Native back button integration
  useModalHistory(isOpen, onClose, 'sales_panel');

  // Cart state: Multi-items
  const [cart, setCart] = useState<CartItem[]>(() => initialCartItems || []);

  // Checkout states
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [customerName, setCustomerName] = useState<string>('');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Search & Barcode Bip states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isBipActive, setIsBipActive] = useState<boolean>(true); // Active by default for lightning-fast scanning
  const [bipInput, setBipInput] = useState<string>('');
  const [bipFeedback, setBipFeedback] = useState<string | null>(null);
  const bipInputRef = useRef<HTMLInputElement>(null);

  // Variant picker inline modal when user clicks a product with multiple variants
  const [pickingProductVariants, setPickingProductVariants] = useState<Product | null>(null);

  // Brief product info preview modal when clicking cart item
  const [previewCartItem, setPreviewCartItem] = useState<CartItem | null>(null);

  // Success completed sale state
  const [completedSale, setCompletedSale] = useState<{
    items: CartItem[];
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
    customerName?: string;
    transactions: Transaction[];
    primaryTransaction?: Transaction;
  } | null>(null);

  // Auto-focus bip input when Bip mode is active
  useEffect(() => {
    if (isBipActive && isOpen && !completedSale) {
      setTimeout(() => {
        bipInputRef.current?.focus();
      }, 80);
    }
  }, [isBipActive, isOpen, completedSale]);

  // Format currency helper
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  // Helper to add or increment item in cart
  const addItemToCart = (prod: Product, variant?: ProductVariant, qtyToAdd = 1) => {
    const cartItemId = `${prod.id}-${variant ? variant.id : 'base'}`;
    const maxStock = variant ? variant.quantity : prod.quantity;

    if (maxStock <= 0) {
      setBipFeedback(`Aviso: "${prod.name}${variant ? ` - ${variant.name}` : ''}" está sem estoque.`);
      setTimeout(() => setBipFeedback(null), 3500);
      return false;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === cartItemId);
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const newQty = existing.quantity + qtyToAdd;
        if (newQty > maxStock) {
          setBipFeedback(`Limite de estoque atingido (${maxStock} un) para "${prod.name}"`);
          setTimeout(() => setBipFeedback(null), 3500);
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          availableStock: maxStock,
        };
        return updated;
      } else {
        const initialQty = Math.min(qtyToAdd, maxStock);
        return [
          ...prev,
          {
            id: cartItemId,
            productId: prod.id,
            variantId: variant?.id,
            product: prod,
            variant: variant,
            quantity: initialQty,
            unitPrice: prod.price || 0,
            availableStock: maxStock,
          },
        ];
      }
    });

    playScanBeep(variant ? 1500 : 1200, 0.15);
    setBipFeedback(`✓ Adicionado: ${prod.name}${variant ? ` (${variant.name})` : ''}`);
    setTimeout(() => setBipFeedback(null), 3000);
    setError('');
    return true;
  };

  // Update item quantity in cart
  const handleUpdateQty = (itemId: string, newQty: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const clamped = Math.min(item.availableStock, Math.max(1, newQty));
            return { ...item, quantity: clamped };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  // Update item unit price in cart
  const handleUpdateUnitPrice = (itemId: string, newPrice: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return { ...item, unitPrice: Math.max(0, newPrice) };
        }
        return item;
      })
    );
  };

  // Remove item from cart
  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Clear entire cart
  const handleClearCart = () => {
    setCart([]);
  };

  // Keep onUpdateCart in ref to prevent infinite loop or re-render cascade
  const onUpdateCartRef = useRef(onUpdateCart);
  useEffect(() => {
    onUpdateCartRef.current = onUpdateCart;
  });

  // Sync cart changes to external onUpdateCart handler without recreating effect
  useEffect(() => {
    onUpdateCartRef.current?.(cart);
  }, [cart]);

  const prevIsOpenRef = useRef(false);

  // Initialize or reset ONLY when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setCompletedSale(null);
      setError('');
      setGlobalDiscount(0);
      setCustomerName('');
      setSearchTerm('');
      setIsSearching(false);
      setBipInput('');
      setPickingProductVariants(null);
      setPreviewCartItem(null);

      // If opened with an initial product
      if (initialProductId) {
        const prod = products.find((p) => p.id === initialProductId);
        if (prod) {
          const variant = initialVariantId
            ? prod.variants?.find((v) => v.id === initialVariantId)
            : undefined;
          setCart([
            {
              id: `${prod.id}-${variant ? variant.id : 'base'}`,
              productId: prod.id,
              variantId: variant?.id,
              product: prod,
              variant: variant,
              quantity: 1,
              unitPrice: prod.price || 0,
              availableStock: variant ? variant.quantity : prod.quantity,
            },
          ]);
        }
      } else if (initialCartItems && initialCartItems.length > 0) {
        setCart(initialCartItems);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialProductId, initialVariantId, products]);

  // Fast barcode / SKU / unique code scan lookup
  const handleProcessBipScan = (codeToSearch: string) => {
    const cleanCode = codeToSearch.trim();
    if (!cleanCode) return;

    let foundProduct: Product | null = null;
    let foundVariant: ProductVariant | null = null;

    // 1. Direct match on variation barcode, unique code, sku or id
    for (const prod of products) {
      if (prod.variants && prod.variants.length > 0) {
        const vMatch = prod.variants.find(
          (v) =>
            v.barcode?.trim().toLowerCase() === cleanCode.toLowerCase() ||
            v.code?.trim().toLowerCase() === cleanCode.toLowerCase() ||
            v.sku?.trim().toLowerCase() === cleanCode.toLowerCase() ||
            v.id.trim().toLowerCase() === cleanCode.toLowerCase()
        );
        if (vMatch) {
          foundProduct = prod;
          foundVariant = vMatch;
          break;
        }
      }
    }

    // 2. Direct match on parent product sku / id / name
    if (!foundProduct) {
      for (const prod of products) {
        if (
          prod.sku.toLowerCase() === cleanCode.toLowerCase() ||
          prod.id.toLowerCase() === cleanCode.toLowerCase() ||
          prod.name.toLowerCase() === cleanCode.toLowerCase()
        ) {
          foundProduct = prod;
          break;
        }
      }
    }

    // 3. Fallback partial search
    if (!foundProduct) {
      for (const prod of products) {
        if (prod.variants) {
          const vMatch = prod.variants.find((v) =>
            v.name.toLowerCase().includes(cleanCode.toLowerCase())
          );
          if (vMatch) {
            foundProduct = prod;
            foundVariant = vMatch;
            break;
          }
        }
        if (prod.name.toLowerCase().includes(cleanCode.toLowerCase())) {
          foundProduct = prod;
          break;
        }
      }
    }

    if (foundProduct) {
      // If parent product found and has multiple variants but no variant was targeted
      if (!foundVariant && foundProduct.variants && foundProduct.variants.length > 0) {
        setPickingProductVariants(foundProduct);
        setBipFeedback(`Escolha a variação para "${foundProduct.name}"`);
        setTimeout(() => setBipFeedback(null), 3000);
      } else {
        addItemToCart(foundProduct, foundVariant || undefined, 1);
      }
      setBipInput('');
      setSearchTerm('');
      setIsSearching(false);
    } else {
      setBipFeedback(`Nenhum item encontrado com o código "${cleanCode}"`);
      setTimeout(() => setBipFeedback(null), 3500);
    }
  };

  // Live matches for BIP input dropdown
  const bipMatches = useMemo(() => {
    const q = bipInput.trim().toLowerCase();
    if (!q) return [];
    const results: { product: Product; variant?: ProductVariant; matchLabel: string }[] = [];

    for (const prod of products) {
      if (prod.variants) {
        for (const v of prod.variants) {
          if (
            v.code?.toLowerCase().includes(q) ||
            v.sku?.toLowerCase().includes(q) ||
            v.barcode?.toLowerCase().includes(q) ||
            v.name.toLowerCase().includes(q)
          ) {
            results.push({
              product: prod,
              variant: v,
              matchLabel: v.code || v.barcode || v.sku || v.name,
            });
          }
        }
      }
    }

    for (const prod of products) {
      if (
        prod.sku.toLowerCase().includes(q) ||
        prod.name.toLowerCase().includes(q) ||
        prod.category.toLowerCase().includes(q)
      ) {
        results.push({ product: prod, matchLabel: prod.sku });
      }
    }
    return results.slice(0, 6);
  }, [bipInput, products]);

  // Filtered products list for main search
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.variants?.some((v) => v.name.toLowerCase().includes(q) || v.code?.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [searchTerm, products]);

  // Cart calculations
  const totalCartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cart]);

  const finalTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - globalDiscount);
  }, [cartSubtotal, globalDiscount]);

  // Finalize Sale (Checkout all items in cart)
  const handleFinalizeSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      setError('Adicione pelo menos 1 item ao carrinho para finalizar a venda.');
      return;
    }

    // Validate quantities and stock
    for (const item of cart) {
      if (item.quantity <= 0) {
        setError(`A quantidade do item "${item.product.name}" deve ser de no mínimo 1.`);
        return;
      }
      if (item.quantity > item.availableStock) {
        setError(`Estoque insuficiente para "${item.product.name}" (${item.availableStock} un disponível).`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError('');

      const generatedTransactions: Transaction[] = [];

      // Calculate proportional discount per item so financial records match exactly
      const discountRatio = cartSubtotal > 0 ? (cartSubtotal - globalDiscount) / cartSubtotal : 1;

      // Group cart items by productId to compute complete updatedProductOverride
      // in case multiple variants of the same product were added
      const productItemMap = new Map<string, CartItem[]>();
      for (const item of cart) {
        const existing = productItemMap.get(item.productId) || [];
        existing.push(item);
        productItemMap.set(item.productId, existing);
      }

      for (const [prodId, itemsForProd] of productItemMap.entries()) {
        const baseProd = itemsForProd[0].product;
        let currentProdState = { ...baseProd };

        for (const item of itemsForProd) {
          const itemNetPrice = Math.max(0, item.unitPrice * discountRatio);

          let updatedProductOverride: Product;
          if (item.variant) {
            const updatedVariants = (currentProdState.variants || []).map((v) => {
              if (v.id === item.variant?.id) {
                return { ...v, quantity: Math.max(0, v.quantity - item.quantity) };
              }
              return v;
            });
            const newTotal = updatedVariants.reduce((sum, v) => sum + (v.quantity || 0), 0);
            updatedProductOverride = {
              ...currentProdState,
              variants: updatedVariants,
              quantity: newTotal,
              salesCount: (currentProdState.salesCount || 0) + item.quantity,
            };
          } else {
            updatedProductOverride = {
              ...currentProdState,
              quantity: Math.max(0, currentProdState.quantity - item.quantity),
              salesCount: (currentProdState.salesCount || 0) + item.quantity,
            };
          }

          currentProdState = updatedProductOverride;

          const res = await onConfirmSale(item.productId, item.quantity, itemNetPrice, {
            variantId: item.variant?.id,
            variantName: item.variant?.name,
            paymentMethod,
            customerName: customerName.trim() || undefined,
            customProductOverride: updatedProductOverride,
          });

          if (res?.transaction) {
            generatedTransactions.push(res.transaction);
          }
        }
      }

      setCompletedSale({
        items: [...cart],
        subtotal: cartSubtotal,
        discount: globalDiscount,
        total: finalTotal,
        paymentMethod,
        customerName: customerName.trim() || undefined,
        transactions: generatedTransactions,
        primaryTransaction: generatedTransactions[0],
      });

      // Clear cart
      setCart([]);
      setGlobalDiscount(0);
      setCustomerName('');
    } catch (err: any) {
      console.error('Error confirming multi-item sale:', err);
      setError('Erro ao processar a venda. Verifique os dados e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartNewSale = () => {
    setCompletedSale(null);
    setCart([]);
    setGlobalDiscount(0);
    setCustomerName('');
    setError('');
    setIsBipActive(true);
    setSearchTerm('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
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
          className="relative z-10 w-full max-w-2xl bg-[#121214] border border-[#ffd56d]/30 rounded-3xl shadow-[0_10px_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col my-auto max-h-[94vh]"
          id="sales-panel-window"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#ffd56d]/15 bg-gradient-to-r from-[#18181b] via-[#141416] to-[#18181b] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#D4A017] via-[#F3E5AB] to-[#C59B27] flex items-center justify-center text-black shadow-lg shadow-[#D4A017]/20 border border-[#ffd56d]/40">
                <DollarSign className="w-6 h-6 stroke-[2.8]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif font-black text-xl text-white tracking-tight leading-tight">
                    Painel de Venda (PDV)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold bg-[#D4A017]/20 text-[#ffd56d] border border-[#D4A017]/40 flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3" />
                    Multi-Itens
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA] font-sans mt-0.5">
                  Bipe ou pesquise para adicionar múltiplas peças ao carrinho
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
            <div className="p-6 space-y-5 flex-1 overflow-y-auto text-center" id="sales-completed-screen">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="font-serif font-bold text-2xl text-white">
                  Venda Concluída com Sucesso!
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Estoque atualizado e transações financeiras registradas no histórico.
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="bg-[#18181b] border border-[#ffd56d]/20 rounded-2xl p-4 text-left space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold text-gray-400">Itens Vendidos ({completedSale.items.length})</span>
                  <span className="text-xs font-mono font-bold text-[#ffd56d]">
                    {completedSale.items.reduce((s, i) => s + i.quantity, 0)} unidades no total
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {completedSale.items.map((item, idx) => (
                    <div
                      key={`sold-${item.id}-${idx}`}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <img
                          src={item.variant?.imageUrl || item.product.imageUrl}
                          alt={item.product.name}
                          className="w-8 h-8 rounded-lg object-cover shrink-0 border border-white/10"
                        />
                        <div className="truncate">
                          <p className="font-bold text-white truncate">{item.product.name}</p>
                          <p className="text-[10px] text-gray-400 flex items-center gap-1">
                            {item.variant && (
                              <span className="text-[#ffd56d] font-semibold">{item.variant.name} &bull;</span>
                            )}
                            <span className="font-mono text-gray-500">{item.quantity}x {formatBRL(item.unitPrice)}</span>
                          </p>
                        </div>
                      </div>
                      <span className="font-serif font-bold text-[#ffd56d] shrink-0 text-xs">
                        {formatBRL(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/10 space-y-1 text-xs">
                  {completedSale.discount > 0 && (
                    <div className="flex items-center justify-between text-rose-300">
                      <span>Desconto Aplicado:</span>
                      <span className="font-mono font-bold">-{formatBRL(completedSale.discount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-gray-300">
                    <span>Forma de Pagamento:</span>
                    <span className="font-bold text-brand-primary">{completedSale.paymentMethod}</span>
                  </div>
                  {completedSale.customerName && (
                    <div className="flex items-center justify-between text-gray-300">
                      <span>Cliente:</span>
                      <span className="font-bold text-white">{completedSale.customerName}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-sm font-bold text-white">Total Pago:</span>
                    <span className="font-serif text-xl font-black text-[#ffd56d]">
                      {formatBRL(completedSale.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {onOpenPrintReceipt && completedSale.primaryTransaction && (
                  <button
                    type="button"
                    onClick={() => {
                      if (completedSale.primaryTransaction) {
                        onOpenPrintReceipt(completedSale.primaryTransaction);
                      }
                    }}
                    className="py-3 px-4 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-white font-sans text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border border-white/10"
                    id="sales-btn-print-receipt"
                  >
                    <Receipt className="w-4 h-4 text-[#ffd56d]" />
                    <span>Imprimir Cupom da Venda</span>
                  </button>
                )}

                {onOpenNfce && (
                  <button
                    type="button"
                    onClick={() => {
                      const firstItem = completedSale.items[0];
                      if (firstItem) {
                        onOpenNfce(firstItem.product, firstItem.variant);
                      }
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
            /* ACTIVE SALES CART & SCANNER FORM */
            <form onSubmit={handleFinalizeSale} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 flex flex-col justify-between">
              
              <div className="space-y-4">
                {/* 1. FAST SCANNER & SEARCH CONTROLS */}
                <div className="space-y-2">
                  {/* Integrated Bip Bar */}
                  <div className="p-3 rounded-2xl bg-[#161618] border border-[#D4A017]/40 space-y-2 shadow-xl">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-[#ffd56d] font-bold">
                        <Barcode className="w-4 h-4 text-[#D4A017]" />
                        <span>Leitor de Código de Barras / Bipar</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        Bipe para adicionar direto ao carrinho
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        ref={bipInputRef}
                        type="text"
                        placeholder="Aponte o leitor de código de barras ou digite o código/SKU e tecle Enter..."
                        value={bipInput}
                        onChange={(e) => setBipInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleProcessBipScan(bipInput);
                          }
                        }}
                        className="w-full bg-black/90 border-2 border-[#D4A017]/70 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#ffd56d] placeholder-gray-500 focus:outline-none focus:border-[#ffd56d] focus:ring-1 focus:ring-[#ffd56d]/50 shadow-inner"
                        id="sales-bip-direct-input"
                        autoFocus
                      />
                      {bipInput && (
                        <button
                          type="button"
                          onClick={() => setBipInput('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Instant Live Matches within BIP Panel */}
                    {bipMatches.length > 0 && (
                      <div className="bg-black/80 border border-white/10 rounded-xl p-1.5 space-y-1 max-h-40 overflow-y-auto">
                        <p className="text-[10px] text-gray-400 px-2 pt-0.5 font-sans">
                          Resultados instantâneos (clique para adicionar ao carrinho):
                        </p>
                        {bipMatches.map((m, idx) => (
                          <button
                            key={`bip-match-${m.product.id}-${m.variant?.id || 'base'}-${idx}`}
                            type="button"
                            onClick={() => {
                              addItemToCart(m.product, m.variant, 1);
                              setBipInput('');
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-lg bg-[#1a1a1c] hover:bg-[#27272a] text-left text-xs transition cursor-pointer border border-white/5 hover:border-[#ffd56d]/40 group"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <img
                                src={m.variant?.imageUrl || m.product.imageUrl}
                                alt={m.product.name}
                                className="w-7 h-7 rounded-lg object-cover shrink-0 border border-white/10"
                              />
                              <div className="truncate">
                                <p className="font-bold text-white group-hover:text-[#ffd56d] transition truncate">
                                  {m.product.name}
                                </p>
                                <span className="text-[10px] text-[#ffd56d] font-bold">
                                  {m.variant?.name || 'Padrão'}
                                </span>
                              </div>
                            </div>
                            <span className="font-serif font-bold text-[#ffd56d] text-xs shrink-0">
                              {formatBRL(m.product.price)} +
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Feedback Toast */}
                  {bipFeedback && (
                    <div
                      className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn ${
                        bipFeedback.startsWith('✓')
                          ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-950/70 border border-amber-500/40 text-amber-300'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{bipFeedback}</span>
                    </div>
                  )}

                  {/* Manual Search Input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ou busque pelo nome do produto para adicionar..."
                      value={searchTerm}
                      onFocus={() => setIsSearching(true)}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsSearching(true);
                      }}
                      className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ffd56d]"
                      id="sales-search-input"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          setIsSearching(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}

                    {/* Search Results Dropdown */}
                    {isSearching && searchTerm.trim() && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#18181b] border border-[#ffd56d]/30 rounded-2xl p-2 max-h-48 overflow-y-auto space-y-1 shadow-2xl z-30">
                        {filteredProducts.length === 0 ? (
                          <p className="text-xs text-gray-500 py-3 text-center font-sans">
                            Nenhuma peça encontrada com "{searchTerm}".
                          </p>
                        ) : (
                          filteredProducts.map((p, pIdx) => (
                            <div
                              key={`sales-filtered-prod-${p.id || pIdx}-${pIdx}`}
                              className="w-full flex items-center justify-between p-2 rounded-xl bg-[#141416] hover:bg-[#27272a] text-xs transition cursor-pointer"
                              onClick={() => {
                                if (p.variants && p.variants.length > 0) {
                                  setPickingProductVariants(p);
                                } else {
                                  addItemToCart(p, undefined, 1);
                                  setSearchTerm('');
                                  setIsSearching(false);
                                }
                              }}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-8 h-8 rounded-lg object-cover shrink-0 border border-white/5"
                                />
                                <div className="truncate">
                                  <p className="font-bold text-white truncate">{p.name}</p>
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {p.sku} &bull; {p.category} &bull; Estoque: {p.quantity} un
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-serif font-bold text-[#ffd56d]">
                                  {formatBRL(p.price)}
                                </span>
                                <span className="px-2 py-1 rounded-lg bg-[#D4A017]/20 text-[#ffd56d] font-bold text-[10px] border border-[#D4A017]/40">
                                  + Adicionar
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Variant picker popup if user clicked a parent product with variants */}
                {pickingProductVariants && (
                  <div className="p-3.5 rounded-2xl bg-[#1c1c1f] border border-[#ffd56d]/40 space-y-2 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                        <Sparkles className="w-4 h-4 text-[#ffd56d]" />
                        <span>Selecione a Variação de "{pickingProductVariants.name}":</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPickingProductVariants(null)}
                        className="text-gray-400 hover:text-white text-xs cursor-pointer"
                      >
                        ✕ Cancelar
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto">
                      {(pickingProductVariants.variants || []).map((v, vIdx) => (
                        <button
                          key={`sales-picking-var-${v.id || vIdx}-${vIdx}`}
                          type="button"
                          disabled={v.quantity <= 0}
                          onClick={() => {
                            addItemToCart(pickingProductVariants, v, 1);
                            setPickingProductVariants(null);
                            setSearchTerm('');
                            setIsSearching(false);
                          }}
                          className="px-3 py-2 rounded-xl bg-black/60 hover:bg-[#D4A017]/20 border border-white/10 hover:border-[#ffd56d] text-left transition cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <img
                            src={v.imageUrl || pickingProductVariants.imageUrl}
                            alt={v.name}
                            className="w-7 h-7 rounded-lg object-cover border border-white/10"
                          />
                          <div>
                            <span className="block font-bold text-white text-xs">{v.name}</span>
                            <span className="text-[10px] font-mono text-gray-400">
                              {v.quantity > 0 ? `${v.quantity} un em estoque` : 'Esgotado'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. CART ITEMS LIST */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-[#ffd56d]" />
                      <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                        Itens no Carrinho ({totalCartCount})
                      </span>
                    </div>

                    {cart.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearCart}
                        className="text-[11px] text-gray-400 hover:text-rose-400 transition cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Limpar Carrinho</span>
                      </button>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-[#161618] border border-dashed border-white/10 text-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-gray-500">
                        <ShoppingCart className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-gray-300">Carrinho vazio</p>
                      <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                        Aponte o leitor de código de barras ou use a busca acima para adicionar peças à venda.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {cart.map((item, itemIdx) => (
                        <div
                          key={`cart-item-${item.id || itemIdx}-${itemIdx}`}
                          className="p-3 rounded-2xl bg-[#161618] border border-white/10 flex items-center justify-between gap-3 group hover:border-[#ffd56d]/30 transition"
                        >
                          {/* Item Thumbnail & Info (Clickable for brief product details modal) */}
                          <div
                            onClick={() => setPreviewCartItem(item)}
                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group/item hover:opacity-90 transition"
                            title="Clique para ver breves informações da peça"
                          >
                            <img
                              src={item.variant?.imageUrl || item.product.imageUrl}
                              alt={item.product.name}
                              className="w-11 h-11 rounded-xl object-cover shrink-0 border border-white/10 group-hover/item:border-[#ffd56d]/60 bg-black transition"
                            />
                            <div className="truncate">
                              <h4 className="font-serif font-bold text-xs sm:text-sm text-white group-hover/item:text-[#ffd56d] transition truncate">
                                {item.product.name}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                                {item.variant && (
                                  <span className="px-1.5 py-0.5 rounded bg-[#D4A017]/20 text-[#ffd56d] font-bold font-sans">
                                    {item.variant.name}
                                  </span>
                                )}
                                <span className="font-mono text-gray-500">
                                  {item.variant?.code || item.product.sku}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                                Máx estoque: {item.availableStock} un &bull; <span className="text-[#ffd56d] underline underline-offset-2">Ver detalhes</span>
                              </span>
                            </div>
                          </div>

                          {/* Unit Price & Qty Controls */}
                          <div className="flex items-center gap-3 shrink-0">
                            {/* Quantity Buttons */}
                            <div className="flex items-center bg-[#202024] border border-white/10 rounded-xl p-0.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                                className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-white cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center font-mono font-bold text-xs text-white">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                                disabled={item.quantity >= item.availableStock}
                                className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-white disabled:opacity-30 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Subtotal value */}
                            <div className="text-right w-20">
                              <span className="font-serif font-black text-xs sm:text-sm text-[#ffd56d] block">
                                {formatBRL(item.unitPrice * item.quantity)}
                              </span>
                              <span className="text-[9px] text-gray-500 font-mono">
                                {formatBRL(item.unitPrice)} un
                              </span>
                            </div>

                            {/* Delete Item */}
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(item.id)}
                              className="w-8 h-8 rounded-xl bg-transparent hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 flex items-center justify-center transition cursor-pointer"
                              title="Remover do carrinho"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. PAYMENT METHOD & ORDER DETAILS */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  {/* Payment Method Selector */}
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
                      ].map((pm, pmIdx) => {
                        const Icon = pm.icon;
                        const isSelected = paymentMethod === pm.id;
                        return (
                          <button
                            key={`sales-pm-${pm.id}-${pmIdx}`}
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

                  {/* Customer Name & Global Discount */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-1">Nome do Cliente (Opcional):</span>
                      <input
                        type="text"
                        placeholder="Ex: João da Silva"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ffd56d]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-1">Desconto Geral na Venda (R$):</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                        value={globalDiscount || ''}
                        onChange={(e) => setGlobalDiscount(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-rose-300 placeholder-gray-500 focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* 4. TOTAL & SUBMIT BUTTON */}
              <div className="pt-3 border-t border-[#ffd56d]/15 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold text-gray-400 block">
                      Total da Venda ({totalCartCount} {totalCartCount === 1 ? 'item' : 'itens'})
                    </span>
                    {globalDiscount > 0 && (
                      <span className="text-[10px] text-rose-400 font-mono">
                        Desconto: -{formatBRL(globalDiscount)}
                      </span>
                    )}
                  </div>
                  <span className="font-serif text-2xl sm:text-3xl font-black text-[#ffd56d]">
                    {formatBRL(finalTotal)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={cart.length === 0 || isSubmitting}
                  className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-[#D4A017] via-[#ffd56d] to-[#C59B27] text-black font-sans text-sm font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_4px_20px_rgba(212,160,23,0.4)] hover:brightness-105 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
                  id="sales-btn-confirm"
                >
                  <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                  <span>
                    {isSubmitting
                      ? 'Processando Venda...'
                      : `Finalizar Venda • ${formatBRL(finalTotal)}`}
                  </span>
                </button>
              </div>

            </form>
          )}
        </motion.div>

        {/* Modal Breves Informações do Produto do Carrinho (Requirement 4) */}
        <AnimatePresence>
          {previewCartItem && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
              onClick={() => setPreviewCartItem(null)}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-sm bg-[#161618] border border-[#ffd56d]/40 rounded-2xl sm:rounded-3xl p-5 shadow-2xl flex flex-col space-y-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[#ffd56d]/15 text-[#ffd56d]">
                      <Info className="w-4 h-4" />
                    </span>
                    <h3 className="font-serif font-bold text-base text-white">
                      Informações da Peça
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewCartItem(null)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition cursor-pointer"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Image */}
                <div className="relative h-44 w-full rounded-xl overflow-hidden bg-black/80 border border-white/10">
                  <img
                    src={previewCartItem.variant?.imageUrl || previewCartItem.product.imageUrl}
                    alt={previewCartItem.product.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#ffd56d] text-black shadow">
                    {previewCartItem.availableStock} un em estoque
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#D4A017] uppercase tracking-wider font-bold">
                      {previewCartItem.product.category || 'Geral'}
                    </span>
                    <h4 className="font-serif font-bold text-sm text-white">
                      {previewCartItem.product.name}
                    </h4>
                    {previewCartItem.variant && (
                      <span className="inline-block px-2 py-0.5 mt-1 rounded bg-[#D4A017]/20 text-[#ffd56d] font-bold text-[11px] border border-[#D4A017]/40">
                        Variação: {previewCartItem.variant.name}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px]">
                    <div>
                      <span className="text-gray-500 block">SKU / Código:</span>
                      <span className="font-mono text-gray-200 font-bold truncate block">
                        {previewCartItem.variant?.code || previewCartItem.variant?.sku || previewCartItem.product.sku}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Preço Unitário:</span>
                      <span className="font-serif text-[#ffd56d] font-bold block">
                        {formatBRL(previewCartItem.unitPrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Fornecedor:</span>
                      <span className="text-gray-300 font-medium truncate block">
                        {previewCartItem.product.supplier || 'Marento Store'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">No Carrinho:</span>
                      <span className="text-emerald-400 font-bold block">
                        {previewCartItem.quantity} un
                      </span>
                    </div>
                  </div>

                  {previewCartItem.product.description && (
                    <p className="text-[11px] text-gray-400 line-clamp-2 pt-1">
                      {previewCartItem.product.description}
                    </p>
                  )}
                </div>

                {/* Big Close Button */}
                <button
                  type="button"
                  onClick={() => setPreviewCartItem(null)}
                  className="w-full py-2.5 rounded-xl bg-[#ffd56d] hover:bg-[#ffe18d] text-black font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
                >
                  Fechar
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
