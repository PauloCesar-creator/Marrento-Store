import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit, Printer, Tag, DollarSign, Layers, Package, AlertCircle, Building2, Calendar, Barcode as BarcodeIcon, ShieldCheck } from 'lucide-react';
import { Product } from '../types';
import BarcodeDisplay from './BarcodeDisplay';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenEdit?: (product: Product) => void;
  onOpenPrintTag?: (product: Product) => void;
}

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onOpenEdit,
  onOpenPrintTag,
}: ProductDetailModalProps) {
  if (!isOpen || !product) return null;

  const cost = product.costPrice || 0;
  const price = product.price || 0;
  const marginBrl = price - cost;
  const marginPercent = cost > 0 ? ((marginBrl / cost) * 100).toFixed(1) : '100';
  const totalStockValue = price * product.quantity;
  const hasVariants = Boolean(product.variants && product.variants.length > 0);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        id="product-detail-overlay"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          id="product-detail-backdrop"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 w-full max-w-2xl bg-brand-secondary border border-brand-tertiary/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
          id="product-detail-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-brand-tertiary/60 px-5 py-4 bg-brand-bg/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center text-brand-primary">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif font-bold text-lg text-brand-neutral tracking-tight">
                  Informações do Produto
                </h2>
                <p className="text-xs text-gray-400 font-mono">
                  {product.sku} &bull; {product.category}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-brand-tertiary/40 hover:bg-brand-tertiary text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {/* Top Overview: Photo & Headline */}
            <div className="flex flex-col sm:flex-row gap-4 items-start bg-brand-bg/60 p-4 rounded-2xl border border-brand-tertiary/40">
              <div className="w-full sm:w-44 h-44 rounded-xl overflow-hidden bg-black/60 border border-brand-tertiary/60 shrink-0">
                <img
                  src={product.imageUrl || 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-brand-tertiary text-gray-300">
                    {product.category}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      product.quantity <= product.minStock
                        ? 'bg-brand-red/20 text-brand-red border border-brand-red/40'
                        : 'bg-brand-green/20 text-brand-green border border-brand-green/40'
                    }`}
                  >
                    {product.quantity <= product.minStock
                      ? `Estoque Baixo (${product.quantity} un)`
                      : `${product.quantity} em estoque`}
                  </span>
                </div>

                <h3 className="font-serif font-bold text-lg text-brand-neutral leading-snug">
                  {product.name}
                </h3>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Building2 className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Fornecedor:</span>
                  <strong className="text-gray-200">{product.supplier || 'Direto com Fabricante'}</strong>
                </div>

                {/* Price & Margins Highlights */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-brand-tertiary/40">
                  <div className="bg-brand-secondary/80 p-2 rounded-lg border border-brand-tertiary/40">
                    <span className="text-[10px] text-gray-400 uppercase font-sans">Preço de Venda</span>
                    <p className="font-serif font-bold text-base text-brand-primary">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
                    </p>
                  </div>
                  <div className="bg-brand-secondary/80 p-2 rounded-lg border border-brand-tertiary/40">
                    <span className="text-[10px] text-gray-400 uppercase font-sans">Preço de Custo</span>
                    <p className="font-serif font-bold text-sm text-gray-300">
                      {cost > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cost) : 'N/D'}
                    </p>
                  </div>
                </div>

                {cost > 0 && (
                  <div className="text-[11px] text-brand-green flex items-center justify-between px-1">
                    <span>Margem Bruta Unitária:</span>
                    <strong className="font-mono">
                      +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(marginBrl)} ({marginPercent}%)
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {/* Stock & Stats Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-brand-bg/40 p-3 rounded-xl border border-brand-tertiary/50 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400">Estoque Atual</span>
                <p className="text-xl font-mono font-bold text-brand-neutral mt-0.5">{product.quantity} un</p>
              </div>
              <div className="bg-brand-bg/40 p-3 rounded-xl border border-brand-tertiary/50 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400">Estoque Mínimo</span>
                <p className="text-xl font-mono font-bold text-amber-400 mt-0.5">{product.minStock} un</p>
              </div>
              <div className="bg-brand-bg/40 p-3 rounded-xl border border-brand-tertiary/50 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400">Total em Estoque</span>
                <p className="text-xs font-serif font-bold text-brand-primary mt-1 truncate">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalStockValue)}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5 bg-brand-bg/30 p-3.5 rounded-xl border border-brand-tertiary/40">
              <span className="text-[10px] uppercase font-bold text-brand-primary tracking-wider">
                Descrição do Item
              </span>
              <p className="text-xs text-gray-300 leading-relaxed">
                {product.description || 'Nenhuma descrição detalhada cadastrada para este produto.'}
              </p>
            </div>

            {/* Variations List (if exists) */}
            {hasVariants && (
              <div className="space-y-2 bg-brand-bg/30 p-3.5 rounded-xl border border-brand-tertiary/40">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-brand-primary tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Variações Disponíveis ({product.variants?.length})
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Total somado: {product.quantity} un
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {product.variants?.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-3 p-2 bg-brand-secondary rounded-lg border border-brand-tertiary/50"
                    >
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-black shrink-0 border border-brand-tertiary">
                        <img
                          src={v.imageUrl || product.imageUrl}
                          alt={v.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-brand-neutral truncate">{v.name}</p>
                        <p className="text-[10px] font-mono text-gray-400 truncate">{v.sku || product.sku}</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded border border-brand-primary/20">
                        {v.quantity} un
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Barcode Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-300 shadow-sm">
              <div className="flex-1">
                <BarcodeDisplay text={product.sku} height={36} showText={true} />
              </div>
              {onOpenPrintTag && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPrintTag(product);
                  }}
                  className="px-3 py-2 bg-black text-white hover:bg-neutral-800 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Etiqueta
                </button>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-brand-tertiary/60 px-5 py-3.5 bg-brand-bg/50 flex justify-between items-center">
            {onOpenEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEdit(product);
                }}
                className="px-4 py-2 rounded-xl bg-brand-tertiary hover:bg-brand-primary hover:text-black text-brand-neutral font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                Editar Produto
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="ml-auto px-6 py-2 rounded-xl bg-brand-primary text-black font-sans font-bold text-xs hover:bg-brand-primary/95 transition cursor-pointer shadow-md"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
