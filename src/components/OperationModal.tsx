import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react';
import { Product } from '../types';

interface OperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialProductId?: string;
  initialType?: 'entrada' | 'saida';
  onConfirm: (
    productId: string,
    type: 'entrada' | 'saida',
    quantity: number,
    price: number
  ) => void;
}

export default function OperationModal({
  isOpen,
  onClose,
  products,
  initialProductId,
  initialType = 'entrada',
  onConfirm,
}: OperationModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [type, setType] = useState<'entrada' | 'saida'>('entrada');
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
    } else if (products.length > 0) {
      setSelectedProductId(products[0].id);
    }
    setType(initialType);
  }, [initialProductId, initialType, products, isOpen]);

  // Update prefilled price based on selected product
  useEffect(() => {
    const selectedProd = products.find((p) => p.id === selectedProductId);
    if (selectedProd) {
      setPrice(selectedProd.price);
    }
    setError('');
  }, [selectedProductId, products]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId) {
      setError('Selecione um produto.');
      return;
    }

    if (quantity <= 0) {
      setError('A quantidade deve ser maior que zero.');
      return;
    }

    const selectedProd = products.find((p) => p.id === selectedProductId);
    if (!selectedProd) {
      setError('Produto inválido.');
      return;
    }

    if (type === 'saida' && selectedProd.quantity < quantity) {
      setError(`Estoque insuficiente! O produto possui apenas ${selectedProd.quantity} unidades disponíveis.`);
      return;
    }

    onConfirm(selectedProductId, type, quantity, price);
    onClose();
    // Reset state
    setQuantity(1);
    setError('');
  };

  const selectedProd = products.find((p) => p.id === selectedProductId);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            id="op-modal-backdrop"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pointer-events-none" id="op-modal-wrapper">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full max-w-md rounded-2xl border border-brand-tertiary bg-brand-secondary p-6 shadow-2xl pointer-events-auto overflow-hidden"
              id="op-modal-content"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-brand-tertiary pb-4 mb-4" id="op-modal-header">
                <h3 className="font-serif font-semibold text-lg text-brand-neutral" id="op-modal-title">
                  Operação Rápida de Estoque
                </h3>
                <button
                  onClick={onClose}
                  className="rounded-full p-1 text-gray-400 hover:bg-brand-tertiary hover:text-white transition"
                  id="op-modal-close-btn"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selector for Type */}
              <div className="grid grid-cols-2 gap-2 mb-5" id="op-type-toggle">
                <button
                  type="button"
                  onClick={() => setType('entrada')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold text-xs transition ${
                    type === 'entrada'
                      ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                      : 'bg-brand-bg/40 border-brand-tertiary text-gray-400 hover:bg-brand-tertiary/50'
                  }`}
                  id="op-type-entrada-btn"
                >
                  <ArrowUpRight className="w-4 h-4 text-brand-green" />
                  Entrada (Reposição)
                </button>
                <button
                  type="button"
                  onClick={() => setType('saida')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold text-xs transition ${
                    type === 'saida'
                      ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                      : 'bg-brand-bg/40 border-brand-tertiary text-gray-400 hover:bg-brand-tertiary/50'
                  }`}
                  id="op-type-saida-btn"
                >
                  <ArrowDownLeft className="w-4 h-4 text-brand-red" />
                  Saída (Venda)
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" id="op-modal-form">
                {/* Product Select */}
                <div id="op-product-select-group">
                  <label className="block text-[11px] uppercase font-bold tracking-wider text-brand-primary mb-1.5" id="op-lbl-product">
                    Selecione o Produto
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-tertiary rounded-xl px-3 py-2.5 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary"
                    id="op-select-product"
                  >
                    <option value="" disabled id="op-opt-placeholder">Selecione um produto...</option>
                    {products.map((prod, idx) => (
                      <option key={`op-prod-${prod.id}-${idx}`} value={prod.id} id={`op-opt-prod-${prod.id}`}>
                        {prod.name} ({prod.category}) • Stock: {prod.quantity}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SKU and Stock info */}
                {selectedProd && (
                  <div className="p-3 bg-brand-bg/50 border border-brand-tertiary/50 rounded-xl flex justify-between items-center text-xs" id="op-product-meta">
                    <span className="text-gray-400" id="op-meta-sku">
                      SKU: <span className="font-mono text-brand-neutral">{selectedProd.sku}</span>
                    </span>
                    <span className="text-gray-400" id="op-meta-stock">
                      Estoque Atual: <span className={`font-semibold ${selectedProd.quantity <= selectedProd.minStock ? 'text-brand-red font-bold' : 'text-brand-neutral'}`}>{selectedProd.quantity} un</span>
                    </span>
                  </div>
                )}

                {/* Row: Quantity & Value */}
                <div className="grid grid-cols-2 gap-3" id="op-quant-price-row">
                  <div id="op-quant-group">
                    <label className="block text-[11px] uppercase font-bold tracking-wider text-brand-primary mb-1.5" id="op-lbl-qty">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                      className="w-full bg-brand-bg border border-brand-tertiary rounded-xl px-3 py-2 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary text-center"
                      id="op-input-qty"
                    />
                  </div>

                  <div id="op-price-group">
                    <label className="block text-[11px] uppercase font-bold tracking-wider text-brand-primary mb-1.5" id="op-lbl-price">
                      Valor Unitário (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-brand-bg border border-brand-tertiary rounded-xl px-3 py-2 text-xs text-brand-neutral focus:outline-none focus:border-brand-primary text-center"
                      id="op-input-price"
                    />
                  </div>
                </div>

                {/* Real-time Subtotal */}
                {quantity > 0 && price > 0 && (
                  <div className="flex justify-between items-center p-3 rounded-xl bg-brand-primary/5 border border-brand-primary/10 text-xs text-brand-primary" id="op-subtotal-panel">
                    <span className="font-medium" id="op-subtotal-lbl">Subtotal</span>
                    <span className="font-serif font-bold text-sm" id="op-subtotal-val">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quantity * price)}
                    </span>
                  </div>
                )}

                {/* Errors display */}
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-brand-red/10 border border-brand-red/20 text-brand-red rounded-xl text-xs" id="op-error-panel">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" id="op-error-icon" />
                    <span id="op-error-text">{error}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-black font-sans font-bold text-xs py-3 rounded-xl transition duration-200 cursor-pointer"
                  id="op-submit-btn"
                >
                  <Check className="w-4 h-4" />
                  Confirmar {type === 'entrada' ? 'Entrada' : 'Saída'}
                </button>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
