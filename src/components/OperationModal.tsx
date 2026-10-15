import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Repeat,
  AlertCircle,
  Package,
  Layers
} from 'lucide-react';
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
  const [isChangingItem, setIsChangingItem] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
    } else if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
    setType(initialType);
    setIsChangingItem(false);
  }, [initialProductId, initialType, products, isOpen]);

  // Sync default price when selected product changes
  useEffect(() => {
    const selectedProd = products.find((p) => p.id === selectedProductId);
    if (selectedProd) {
      setPrice(selectedProd.price || 0);
    }
    setError('');
  }, [selectedProductId, products]);

  if (!isOpen) return null;

  const selectedProd = products.find((p) => p.id === selectedProductId) || products[0];

  const currentStock = selectedProd ? selectedProd.quantity : 0;
  const projectedStock =
    type === 'entrada'
      ? currentStock + quantity
      : Math.max(0, currentStock - quantity);

  const subtotal = (quantity || 0) * (price || 0);

  const handleResetPrice = () => {
    if (selectedProd) {
      setPrice(selectedProd.price || 0);
    }
  };

  const handleQtyChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProd) {
      setError('Selecione uma peça do acervo.');
      return;
    }

    if (quantity <= 0) {
      setError('A quantidade deve ser de no mínimo 1 unidade.');
      return;
    }

    if (type === 'saida' && currentStock < quantity) {
      setError(`Estoque insuficiente! O acervo possui apenas ${currentStock} un desta peça.`);
      return;
    }

    onConfirm(selectedProd.id, type, quantity, price);
    onClose();
    setQuantity(1);
    setError('');
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        id="op-modal-overlay"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
          id="op-modal-backdrop"
        />

        {/* Modal Window following 'operação-rapida-de-estoque.png' */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 360 }}
          className="relative z-10 w-full max-w-md bg-[#131315] border border-[#ffd56d]/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]"
          id="op-modal-window"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-4">
            <div>
              <h2 className="font-serif font-bold text-xl text-white tracking-tight leading-tight">
                Operação Rápida de Estoque
              </h2>
              <p className="text-xs text-[#8E8E93] font-sans mt-0.5">
                Lançamento imediato de movimento
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#1C1C1E] border border-white/5 flex items-center justify-center text-[#8E8E93] hover:text-white hover:bg-[#2A2A2C] transition cursor-pointer shrink-0 ml-3"
              id="op-modal-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4 overflow-y-auto flex-1">
            {/* 1. Toggle Segmented Controls (Entrada vs Saída) */}
            <div className="grid grid-cols-2 gap-2.5 p-1 bg-[#0E0E10] rounded-2xl border border-white/5">
              <button
                type="button"
                onClick={() => setType('entrada')}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-sans text-xs font-bold transition duration-200 cursor-pointer ${
                  type === 'entrada'
                    ? 'bg-[#1C1C1E] border-1.5 border-[#E5B842] text-[#ffd56d] shadow-md ring-1 ring-[#E5B842]/30'
                    : 'bg-transparent border border-transparent text-[#8E8E93] hover:text-white'
                }`}
                id="btn-op-entrada"
              >
                <ArrowUpRight className={`w-4 h-4 ${type === 'entrada' ? 'text-[#ffd56d]' : 'text-[#8E8E93]'}`} />
                <span>Entrada (Reposição)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('saida')}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-sans text-xs font-bold transition duration-200 cursor-pointer ${
                  type === 'saida'
                    ? 'bg-[#1C1C1E] border-1.5 border-[#E5B842] text-[#ffd56d] shadow-md ring-1 ring-[#E5B842]/30'
                    : 'bg-transparent border border-transparent text-[#8E8E93] hover:text-white'
                }`}
                id="btn-op-saida"
              >
                <ArrowDownRight className={`w-4 h-4 ${type === 'saida' ? 'text-[#ffd56d]' : 'text-[#8E8E93]'}`} />
                <span>Saída (Venda)</span>
              </button>
            </div>

            {/* 2. ITEM SELECIONADO Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4A017] font-sans">
                  ITEM SELECIONADO
                </span>
                <button
                  type="button"
                  onClick={() => setIsChangingItem(!isChangingItem)}
                  className="text-[11px] font-bold text-[#D4A017] hover:text-[#ffd56d] transition flex items-center gap-1 cursor-pointer"
                  id="btn-trocar-peca"
                >
                  <Repeat className="w-3 h-3" />
                  Trocar Peça
                </button>
              </div>

              {/* Item Card or Dropdown selector */}
              {isChangingItem ? (
                <div className="bg-[#141416] border border-[#E5B842]/30 rounded-2xl p-3 space-y-2 animate-fade-in">
                  <input
                    type="text"
                    placeholder="Buscar peça por nome, SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E5B842]"
                    autoFocus
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProductId(p.id);
                          setIsChangingItem(false);
                          setSearchTerm('');
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition cursor-pointer ${
                          selectedProductId === p.id
                            ? 'bg-[#E5B842]/20 border border-[#E5B842] text-white'
                            : 'bg-[#1C1C1E] hover:bg-[#2A2A2C] text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <img
                            src={p.imageUrl || 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80'}
                            alt={p.name}
                            className="w-8 h-8 rounded-lg object-cover shrink-0"
                          />
                          <div className="truncate">
                            <p className="font-bold text-white truncate">{p.name}</p>
                            <span className="text-[10px] text-gray-400 font-mono">{p.sku}</span>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-[#ffd56d] shrink-0 ml-2">
                          {p.quantity} un
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : selectedProd ? (
                <div className="bg-[#141416] border border-white/5 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-13 h-13 rounded-xl overflow-hidden bg-black shrink-0 border border-[#E5B842]/30">
                      <img
                        src={selectedProd.imageUrl || 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80'}
                        alt={selectedProd.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h3 className="font-bold text-sm text-white truncate">
                        {selectedProd.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#2A2312] border border-[#E5B842]/40 text-[#ffd56d] text-[10px] font-mono font-bold">
                          {selectedProd.sku}
                        </span>
                        <span className="text-xs text-[#8E8E93] truncate">
                          {selectedProd.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: ATUAL 6 un pill */}
                  <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl px-3 py-2 text-center shrink-0 min-w-[58px]">
                    <span className="block text-[9px] uppercase font-bold text-[#8E8E93] tracking-wider">
                      ATUAL
                    </span>
                    <span className="font-mono font-black text-sm text-white">
                      {currentStock} un
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#141416] rounded-2xl text-center text-xs text-gray-500">
                  Nenhum produto cadastrado no cofre.
                </div>
              )}
            </div>

            {/* 3. QUANTIDADE Section */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#D4A017] font-sans">
                QUANTIDADE
              </label>
              <div className="bg-[#141416] border border-white/5 rounded-2xl p-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleQtyChange(-1)}
                  disabled={quantity <= 1}
                  className="w-13 h-13 rounded-xl bg-[#1C1C1E] hover:bg-[#2A2A2C] text-white flex items-center justify-center transition cursor-pointer text-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  −
                </button>

                <div className="text-center">
                  <span className="block font-mono font-bold text-2xl text-white">
                    {quantity}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-[#8E8E93] tracking-wider">
                    unidades
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleQtyChange(1)}
                  className="w-13 h-13 rounded-xl bg-[#1C1C1E] hover:bg-[#2A2A2C] text-white flex items-center justify-center transition cursor-pointer text-xl font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* 4. VALOR UNITÁRIO Section */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#D4A017] font-sans">
                  VALOR UNITÁRIO
                </label>
                <span className="text-[11px] text-[#8E8E93]">Base Tabela</span>
              </div>
              <div className="bg-[#141416] border border-white/5 rounded-2xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif font-bold text-base text-[#ffd56d]">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="bg-transparent font-serif font-bold text-xl text-[#ffd56d] focus:outline-none w-36 tracking-tight"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleResetPrice}
                  title="Restaurar preço original da tabela"
                  className="p-1.5 rounded-lg text-[#8E8E93] hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 5. Subtotal Previsto e Projeção de Estoque */}
            <div className="bg-[#141416] border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8E8E93]">Subtotal Previsto</span>
                <span className="font-serif font-bold text-xl text-[#ffd56d]">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}
                </span>
              </div>

              <div className="h-px bg-white/5" />

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8E8E93] flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-[#D4A017]" />
                  Projeção de Estoque:
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-400">{currentStock} un →</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#2A2312] border border-[#E5B842]/40 text-[#ffd56d] font-mono font-bold">
                    {projectedStock} un
                  </span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-500/40 text-rose-300 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 6. Primary Action Button (Solid Gold) */}
            <button
              type="submit"
              className="w-full py-4 px-6 rounded-2xl bg-[#E5B842] hover:bg-[#ffd56d] text-[#121214] font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition cursor-pointer active:scale-98"
              id="btn-confirmar-operacao"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              {type === 'entrada' ? 'CONFIRMAR ENTRADA' : 'CONFIRMAR SAÍDA'}
            </button>

            {/* Secondary Action: CANCELAR OPERAÇÃO */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={onClose}
                className="text-xs uppercase font-bold tracking-widest text-[#8E8E93] hover:text-white transition cursor-pointer py-1"
                id="btn-cancelar-operacao"
              >
                CANCELAR OPERAÇÃO
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
