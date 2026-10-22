import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, Eye, Edit, Check, Package, Sparkles, Layers, Tag, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Product, ProductVariant } from '../types';

interface QuickStockModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProduct: (updatedProduct: Product) => void;
  onRecordTransaction?: (
    productId: string,
    type: 'entrada' | 'saida',
    quantity: number,
    price: number,
    updatedProductOverride?: Product,
    isSale?: boolean
  ) => void;
  onOpenEdit?: (product: Product) => void;
  onOpenDetails?: (product: Product) => void;
}

export default function QuickStockModal({
  product,
  isOpen,
  onClose,
  onUpdateProduct,
  onRecordTransaction,
  onOpenEdit,
  onOpenDetails,
}: QuickStockModalProps) {
  // Step quantity selector (e.g., 1, 5, 10 units per click)
  const [stepQty, setStepQty] = useState<number>(1);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'green' | 'red' } | null>(null);

  if (!isOpen || !product) return null;

  const hasVariants = Boolean(product.variants && product.variants.length > 0);
  const variants = product.variants || [];

  const showFeedback = (text: string, type: 'green' | 'red') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 2000);
  };

  // 1. Stock alteration for product WITHOUT variations
  const handleSimpleStockChange = (type: 'entrada' | 'saida') => {
    const delta = type === 'entrada' ? stepQty : -stepQty;
    const newQty = Math.max(0, product.quantity + delta);
    const actualDelta = Math.abs(newQty - product.quantity);

    if (actualDelta === 0 && type === 'saida') {
      showFeedback('Estoque já está zerado!', 'red');
      return;
    }

    const updatedProduct: Product = {
      ...product,
      quantity: newQty,
    };

    if (onRecordTransaction && actualDelta > 0) {
      // type === 'saida' is an inventory withdrawal/adjustment, NOT a commercial sale (isSale: false)
      onRecordTransaction(
        product.id,
        type,
        actualDelta,
        product.price,
        updatedProduct,
        type === 'saida' ? false : true
      );
    } else {
      onUpdateProduct(updatedProduct);
    }

    showFeedback(
      type === 'entrada'
        ? `+${actualDelta} unidade(s) adicionada(s) ao estoque!`
        : `-${actualDelta} unidade(s) retirada(s) do estoque!`,
      type === 'entrada' ? 'green' : 'red'
    );
  };

  // 2. Stock alteration for specific variation in product WITH variations
  const handleVariantStockChange = (variantId: string, type: 'entrada' | 'saida') => {
    const delta = type === 'entrada' ? stepQty : -stepQty;

    let targetVariantName = '';
    const updatedVariants = variants.map((v) => {
      if (v.id === variantId) {
        targetVariantName = v.name;
        const nextQty = Math.max(0, v.quantity + delta);
        return { ...v, quantity: nextQty };
      }
      return v;
    });

    const newTotalQuantity = updatedVariants.reduce((sum, v) => sum + (v.quantity || 0), 0);

    const updatedProduct: Product = {
      ...product,
      variants: updatedVariants,
      quantity: newTotalQuantity,
    };

    if (onRecordTransaction) {
      // type === 'saida' is an inventory withdrawal/adjustment, NOT a commercial sale (isSale: false)
      onRecordTransaction(
        product.id,
        type,
        stepQty,
        product.price,
        updatedProduct,
        type === 'saida' ? false : true
      );
    } else {
      onUpdateProduct(updatedProduct);
    }

    showFeedback(
      type === 'entrada'
        ? `+${stepQty} un adicionada(s) em "${targetVariantName}"!`
        : `-${stepQty} un retirada(s) de "${targetVariantName}"!`,
      type === 'entrada' ? 'green' : 'red'
    );
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        id="quick-stock-modal-overlay"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          id="quick-stock-backdrop"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 w-full max-w-lg bg-brand-secondary border border-brand-tertiary/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
          id="quick-stock-modal-window"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-brand-tertiary/60 px-5 py-4 bg-brand-bg/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-black shrink-0 border border-brand-tertiary/60">
                <img
                  src={product.imageUrl || 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="font-serif font-bold text-base text-brand-neutral tracking-tight line-clamp-1">
                  {product.name}
                </h2>
                <p className="text-xs text-gray-400 font-mono">
                  {product.sku} &bull; <span className="text-brand-primary font-semibold">{product.category}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-brand-tertiary/40 hover:bg-brand-tertiary text-gray-400 hover:text-white transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toast Feedback */}
          {feedbackMsg && (
            <div
              className={`py-2 px-4 text-center text-xs font-bold transition duration-200 ${
                feedbackMsg.type === 'green'
                  ? 'bg-emerald-950/80 text-emerald-300 border-b border-emerald-500/30'
                  : 'bg-rose-950/80 text-rose-300 border-b border-rose-500/30'
              }`}
            >
              {feedbackMsg.text}
            </div>
          )}

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {/* Step Quantity Selector */}
            <div className="flex items-center justify-between bg-brand-bg/60 px-3.5 py-2.5 rounded-xl border border-brand-tertiary/40">
              <span className="text-xs text-gray-400 font-sans">
                Quantidade por clique:
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 5, 10, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setStepQty(num)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      stepQty === num
                        ? 'bg-brand-primary text-black shadow-sm'
                        : 'bg-brand-secondary text-gray-400 hover:text-white hover:bg-brand-tertiary'
                    }`}
                  >
                    +{num}
                  </button>
                ))}
              </div>
            </div>

            {/* CASE 1: PRODUCT WITHOUT VARIATIONS */}
            {!hasVariants && (
              <div className="space-y-5" id="simple-product-controls">
                {/* Central Current Stock Counter */}
                <div className="text-center py-4 bg-brand-bg/40 rounded-2xl border border-brand-tertiary/50">
                  <span className="text-xs font-sans uppercase font-bold text-gray-400 tracking-wider">
                    Estoque Atual
                  </span>
                  <div className="flex items-baseline justify-center gap-2 mt-1">
                    <span className="font-mono text-5xl font-black text-brand-neutral tracking-tight">
                      {product.quantity}
                    </span>
                    <span className="text-sm font-bold text-brand-primary uppercase">
                      UNIDADES
                    </span>
                  </div>
                  {product.quantity <= product.minStock && (
                    <span className="inline-block mt-2 text-[11px] text-brand-red font-bold bg-brand-red/10 border border-brand-red/30 px-2.5 py-0.5 rounded-full">
                      Abaixo do estoque mínimo ({product.minStock} un)
                    </span>
                  )}
                </div>

                {/* TWO BIG BUTTONS: MINUS (-) AND PLUS (+) */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4" id="two-big-buttons-grid">
                  {/* Big Minus Button */}
                  <button
                    type="button"
                    onClick={() => handleSimpleStockChange('saida')}
                    disabled={product.quantity <= 0}
                    className="flex flex-col items-center justify-center p-5 sm:p-6 rounded-2xl border-2 transition duration-200 cursor-pointer shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed bg-rose-950/20 border-rose-500/40 text-rose-300 hover:bg-rose-950/40 hover:border-rose-400"
                    id="btn-big-minus"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mb-2.5 border border-rose-500/30">
                      <Minus className="w-8 h-8 sm:w-9 sm:h-9 text-rose-400 stroke-[3]" />
                    </div>
                    <span className="font-serif font-black text-base sm:text-lg text-rose-200">
                      -{stepQty} UN
                    </span>
                    <span className="text-[11px] text-rose-300/80 font-sans mt-0.5">
                      Retirar do Estoque
                    </span>
                  </button>

                  {/* Big Plus Button */}
                  <button
                    type="button"
                    onClick={() => handleSimpleStockChange('entrada')}
                    className="flex flex-col items-center justify-center p-5 sm:p-6 rounded-2xl border-2 transition duration-200 cursor-pointer shadow-lg active:scale-95 bg-emerald-950/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40 hover:border-emerald-400"
                    id="btn-big-plus"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-2.5 border border-emerald-500/30">
                      <Plus className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-400 stroke-[3]" />
                    </div>
                    <span className="font-serif font-black text-base sm:text-lg text-emerald-200">
                      +{stepQty} UN
                    </span>
                    <span className="text-[11px] text-emerald-300/80 font-sans mt-0.5">
                      Entrada / Repor
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* CASE 2: PRODUCT WITH VARIATIONS */}
            {hasVariants && (
              <div className="space-y-3" id="variant-product-controls">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-primary" />
                    <h4 className="font-serif font-bold text-sm text-brand-neutral">
                      Variações do Produto ({variants.length})
                    </h4>
                  </div>
                  <span className="bg-brand-primary/20 text-brand-primary text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-brand-primary/30">
                    Total Somado: {product.quantity} un
                  </span>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                  Ajuste o estoque de cada variação individualmente com os botões práticos:
                </p>

                {/* Scrollable list of variations */}
                <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
                  {variants.map((v, vIdx) => (
                    <div
                      key={`quick-stock-var-${v.id || vIdx}-${vIdx}`}
                      className="p-3 bg-brand-bg/50 rounded-xl border border-brand-tertiary/60 hover:border-brand-tertiary flex items-center justify-between gap-3 transition"
                    >
                      {/* Variation Photo & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-black shrink-0 border border-brand-tertiary">
                          <img
                            src={v.imageUrl || product.imageUrl}
                            alt={v.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-bold text-xs text-brand-neutral truncate">{v.name}</h5>
                          <span className="text-[10px] text-gray-500 font-mono block truncate">
                            {v.sku || product.sku}
                          </span>
                        </div>
                      </div>

                      {/* Stock Counter & Individual Stepper */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-mono font-black text-brand-primary block">
                            {v.quantity} un
                          </span>
                        </div>

                        {/* Practical +/- Stepper */}
                        <div className="flex items-center bg-brand-secondary rounded-xl border border-brand-tertiary p-1">
                          <button
                            type="button"
                            onClick={() => handleVariantStockChange(v.id, 'saida')}
                            disabled={v.quantity <= 0}
                            className="w-8 h-8 rounded-lg bg-brand-bg hover:bg-rose-950/60 text-rose-400 flex items-center justify-center transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={`Diminuir ${stepQty} un`}
                          >
                            <Minus className="w-4 h-4 stroke-[2.5]" />
                          </button>
                          <span className="w-8 text-center font-mono font-bold text-xs text-brand-neutral">
                            {v.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleVariantStockChange(v.id, 'entrada')}
                            className="w-8 h-8 rounded-lg bg-brand-bg hover:bg-emerald-950/60 text-emerald-400 flex items-center justify-center transition cursor-pointer"
                            title={`Aumentar ${stepQty} un`}
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation Bar: View, Edit, and Complete */}
          <div className="border-t border-brand-tertiary/60 px-5 py-3.5 bg-brand-bg/60 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Option: Visualizar Produto */}
              {onOpenDetails && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDetails(product);
                  }}
                  className="px-3 py-2 rounded-xl bg-brand-tertiary hover:bg-brand-primary hover:text-black text-brand-neutral font-sans font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Ver detalhes completos do produto"
                  id="btn-quick-view-product"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Visualizar
                </button>
              )}

              {/* Option: Editar Produto */}
              {onOpenEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEdit(product);
                  }}
                  className="px-3 py-2 rounded-xl bg-brand-tertiary hover:bg-brand-primary hover:text-black text-brand-neutral font-sans font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Abrir formulário de edição"
                  id="btn-quick-edit-product"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Editar
                </button>
              )}
            </div>

            {/* Concluído button */}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-brand-primary text-black font-sans font-bold text-xs hover:bg-brand-primary/95 transition cursor-pointer flex items-center gap-1.5 shadow-md ml-auto"
              id="btn-quick-done"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              Concluído
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
