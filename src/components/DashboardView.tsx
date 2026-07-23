import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Compass,
  Sparkles,
  Gem,
  Wind,
  Plus,
  Package,
  Award,
  Layers,
  Box
} from 'lucide-react';
import { Product, Transaction, CategoryName } from '../types';

interface DashboardViewProps {
  products: Product[];
  transactions: Transaction[];
  categories: string[];
  onSelectCategory: (category: CategoryName | 'Todos') => void;
  onNavigateToTab: (tab: string) => void;
  onOpenQuickOp: (productId?: string, type?: 'entrada' | 'saida') => void;
  onAddCategory: (name: string) => void;
}

export default function DashboardView({
  products,
  transactions,
  categories,
  onSelectCategory,
  onNavigateToTab,
  onOpenQuickOp,
  onAddCategory,
}: DashboardViewProps) {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Calculate total units sold (sum of quantity for all 'saida' transactions)
  const totalUnitsSold = transactions
    .filter((t) => t.type === 'saida')
    .reduce((acc, t) => acc + t.quantity, 0);

  // Calculate total units entered (sum of quantity for all 'entrada' transactions)
  const totalUnitsEntered = transactions
    .filter((t) => t.type === 'entrada')
    .reduce((acc, t) => acc + t.quantity, 0);

  // Calculate total current stock items count
  const totalItemsInStock = products.reduce((acc, p) => acc + p.quantity, 0);

  // Count items below minimum stock
  const lowStockCount = products.filter((p) => p.quantity <= p.minStock).length;

  // Dynamic category styling helper
  const getCategoryMeta = (catName: string) => {
    const nameLower = catName.toLowerCase();
    if (nameLower.includes('relóg') || nameLower.includes('relog')) {
      return {
        icon: <Compass className="w-5 h-5 text-brand-primary" />,
        desc: 'Alta Horologia',
      };
    }
    if (nameLower.includes('pulseira') || nameLower.includes('bracelete')) {
      return {
        icon: <Award className="w-5 h-5 text-brand-primary" />,
        desc: 'Design Nobre',
      };
    }
    if (nameLower.includes('joia') || nameLower.includes('jóia') || nameLower.includes('anel') || nameLower.includes('brinco')) {
      return {
        icon: <Gem className="w-5 h-5 text-brand-primary" />,
        desc: 'Gemas Raras',
      };
    }
    if (nameLower.includes('perfum') || nameLower.includes('colôn') || nameLower.includes('fragr')) {
      return {
        icon: <Wind className="w-5 h-5 text-brand-primary" />,
        desc: 'Fragrâncias Luxo',
      };
    }
    return {
      icon: <Sparkles className="w-5 h-5 text-brand-primary" />,
      desc: 'Acervo Exclusivo',
    };
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    onAddCategory(newCategoryName.trim());
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  // Helper to find product image for a transaction
  const getProductForTx = (tx: Transaction): Product | undefined => {
    if (tx.productId) {
      const found = products.find((p) => p.id === tx.productId);
      if (found) return found;
    }
    if (tx.sku) {
      const foundBySku = products.find((p) => p.sku.toLowerCase() === tx.sku.toLowerCase());
      if (foundBySku) return foundBySku;
    }
    return products.find((p) => p.name.toLowerCase() === tx.productName.toLowerCase());
  };

  return (
    <div className="space-y-6 pb-24" id="dashboard-view-root">
      
      {/* 1. Header Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" id="dash-welcome">
        <div className="space-y-1" id="dash-welcome-text">
          <h2 className="font-serif font-semibold text-2xl text-brand-neutral tracking-tight" id="dash-welcome-title">
            Painel Geral de Estoque
          </h2>
          <p className="text-xs text-gray-500 font-sans" id="dash-welcome-subtitle">
            Acompanhamento de volume de vendas e movimentação em tempo real.
          </p>
        </div>
      </div>

      {/* 2. Primary "Número de Vendas" Card (High Contrast) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl bg-brand-secondary p-6 border border-brand-primary/40 shadow-xl"
        id="dash-sales-number-card"
      >
        <div className="absolute -right-16 -top-16 w-36 h-36 rounded-full bg-brand-primary/10 blur-3xl" />

        <div className="flex items-center justify-between" id="dash-sales-card-header">
          <div className="space-y-2" id="dash-sales-card-labels">
            <span className="block text-[10px] tracking-widest font-bold uppercase text-brand-primary font-sans" id="dash-sales-card-lbl">
              NÚMERO DE VENDAS (SAÍDAS DE ESTOQUE)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-serif font-semibold text-4xl sm:text-5xl text-brand-neutral tracking-tight" id="dash-sales-card-val">
                {totalUnitsSold}
              </span>
              <span className="text-sm font-sans font-medium text-gray-400">
                {totalUnitsSold === 1 ? 'peça vendida' : 'peças vendidas'}
              </span>
            </div>
            <p className="text-xs text-gray-400 pt-1">
              Total de produtos que saíram do estoque em vendas e expedições.
            </p>
          </div>

          <div className="rounded-2xl bg-brand-primary/10 p-4 border border-brand-primary/20 shadow-lg shrink-0" id="dash-sales-card-icon-box">
            <ShoppingBag className="w-8 h-8 text-brand-primary" id="dash-sales-card-icon" />
          </div>
        </div>
      </motion.div>

      {/* 3. Stats Row (Total em Estoque & Baixo Estoque) */}
      <div className="grid grid-cols-2 gap-3.5" id="dash-stats-grid">
        {/* Total em Estoque Card */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          onClick={() => onNavigateToTab('Estoque')}
          className="group rounded-2xl bg-brand-secondary p-4 border border-brand-tertiary/50 hover:border-brand-primary/30 cursor-pointer transition-all duration-200"
          id="dash-stock-total-card"
        >
          <div className="flex items-center gap-2 mb-2" id="dash-stock-total-header">
            <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary border border-brand-primary/10 group-hover:scale-105 transition" id="dash-stock-total-icon-box">
              <Box className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider" id="dash-stock-total-lbl">
              ESTOQUE ATUAL
            </span>
          </div>
          <span className="block font-serif text-xl sm:text-2xl text-brand-neutral font-medium" id="dash-stock-total-val">
            {totalItemsInStock} {totalItemsInStock === 1 ? 'Peça' : 'Peças'}
          </span>
          <span className="text-[10px] text-brand-primary font-medium mt-1 inline-flex items-center gap-0.5" id="dash-stock-total-hint">
            Ver catálogo completo <ChevronRight className="w-3 h-3" />
          </span>
        </motion.div>

        {/* Low Stock Card */}
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          onClick={() => onNavigateToTab('Estoque')}
          className="group rounded-2xl bg-brand-secondary p-4 border border-brand-tertiary/50 hover:border-brand-red/30 cursor-pointer transition-all duration-200"
          id="dash-lowstock-card"
        >
          <div className="flex items-center gap-2 mb-2" id="dash-lowstock-header">
            <div className="p-2 rounded-lg bg-brand-red/10 text-brand-red border border-brand-red/10 group-hover:scale-105 transition" id="dash-lowstock-icon-box">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider" id="dash-lowstock-lbl">
              BAIXO ESTOQUE
            </span>
          </div>
          <span className="block font-serif text-xl sm:text-2xl text-brand-neutral font-medium" id="dash-lowstock-val">
            {lowStockCount} {lowStockCount === 1 ? 'Item' : 'Itens'}
          </span>
          <span className="text-[10px] text-brand-red font-medium mt-1 inline-flex items-center gap-1" id="dash-lowstock-alert-msg">
            {lowStockCount > 0 ? 'Reposição imediata' : 'Nenhuma pendência'}
          </span>
        </motion.div>
      </div>

      {/* 4. Categorias em Destaque */}
      <div className="space-y-3" id="dash-categories-container">
        <div className="flex items-center justify-between" id="dash-categories-header">
          <h3 className="font-serif font-semibold text-lg text-brand-neutral tracking-tight" id="dash-categories-title">
            Categorias em Destaque
          </h3>
          <button
            onClick={() => {
              onSelectCategory('Todos');
              onNavigateToTab('Estoque');
            }}
            className="text-xs text-brand-primary font-medium hover:underline flex items-center gap-1 cursor-pointer"
            id="dash-categories-all-btn"
          >
            Ver Todas <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" id="dash-categories-list">
          {categories.map((catName, idx) => {
            const meta = getCategoryMeta(catName);
            return (
              <motion.div
                key={`dash-cat-${catName}-${idx}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => {
                  onSelectCategory(catName);
                  onNavigateToTab('Estoque');
                }}
                className="flex flex-col items-center p-3.5 rounded-2xl bg-brand-secondary/40 border border-brand-tertiary/30 hover:border-brand-primary/30 cursor-pointer transition text-center group"
                id={`dash-cat-${catName}`}
              >
                <div className="w-12 h-12 rounded-full bg-brand-secondary border border-brand-tertiary flex items-center justify-center mb-2 shadow-md group-hover:border-brand-primary group-hover:bg-brand-tertiary/40 transition duration-200" id={`dash-cat-circle-${catName}`}>
                  {meta.icon}
                </div>
                <span className="text-xs font-bold text-brand-neutral truncate w-full" id={`dash-cat-name-${catName}`}>
                  {catName}
                </span>
                <span className="text-[9px] text-gray-500 scale-95 origin-center hidden sm:inline" id={`dash-cat-desc-${catName}`}>
                  {meta.desc}
                </span>
              </motion.div>
            );
          })}

          {/* Inline Category Creator */}
          {isAddingCategory ? (
            <motion.form
              onSubmit={handleAddCategorySubmit}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center p-3 rounded-2xl bg-brand-secondary border border-brand-primary/40 text-center"
              id="dash-cat-add-form"
            >
              <input
                type="text"
                autoFocus
                placeholder="Nome..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full bg-brand-bg text-brand-neutral text-center text-xs px-1 py-1 rounded border border-brand-tertiary focus:outline-none focus:border-brand-primary mb-2"
                id="dash-cat-add-input"
              />
              <div className="flex gap-1 w-full justify-center">
                <button
                  type="submit"
                  className="px-2 py-1 bg-brand-primary text-black text-[9px] font-bold rounded cursor-pointer"
                  id="dash-cat-add-submit"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(false)}
                  className="px-2 py-1 bg-brand-tertiary text-gray-400 text-[9px] font-semibold rounded hover:text-white cursor-pointer"
                  id="dash-cat-add-cancel"
                >
                  Sair
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              onClick={() => setIsAddingCategory(true)}
              whileHover={{ scale: 1.02 }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border border-dashed border-brand-tertiary hover:border-brand-primary/40 bg-brand-bg/20 cursor-pointer transition text-center text-gray-500 hover:text-brand-primary group min-h-[92px]"
              id="dash-cat-add-trigger"
            >
              <Plus className="w-5 h-5 text-gray-500 group-hover:text-brand-primary mb-1 stroke-[2.5]" />
              <span className="text-[11px] font-bold tracking-wider uppercase">Nova Categoria</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* 5. Atividade Recente (Visual Cards with Product Images) */}
      <div className="space-y-3" id="dash-activity-container">
        <div className="flex items-center justify-between" id="dash-activity-header">
          <h3 className="font-serif font-semibold text-lg text-brand-neutral tracking-tight" id="dash-activity-title">
            Atividade Recente (Entradas e Saídas)
          </h3>
          <button
            onClick={() => onNavigateToTab('Entradas')}
            className="text-xs text-brand-primary font-medium hover:underline flex items-center gap-1 cursor-pointer"
            id="dash-activity-all-btn"
          >
            Histórico completo <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Visual Product Activity Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="dash-activity-list">
          {transactions.slice(0, 6).map((tx, idx) => {
            const product = getProductForTx(tx);
            const isEntrada = tx.type === 'entrada';

            return (
              <div
                key={`dash-tx-${tx.id}-${idx}`}
                className="flex items-center gap-3 p-3.5 bg-brand-secondary rounded-2xl border border-brand-tertiary/40 shadow-sm hover:border-brand-primary/20 transition"
                id={`dash-activity-item-${tx.id}`}
              >
                {/* Product Thumbnail Box */}
                <div className="relative w-14 h-14 rounded-xl bg-brand-bg border border-brand-tertiary/60 overflow-hidden shrink-0 flex items-center justify-center" id={`dash-activity-img-box-${tx.id}`}>
                  {product?.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={tx.productName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-brand-tertiary" />
                  )}

                  {/* Badge Overlay */}
                  <div
                    className={`absolute bottom-0 inset-x-0 text-[8px] font-bold uppercase text-center py-0.5 ${
                      isEntrada ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}
                  >
                    {isEntrada ? 'Entrada' : 'Venda'}
                  </div>
                </div>

                {/* Info Text */}
                <div className="min-w-0 flex-1 space-y-0.5" id={`dash-activity-text-${tx.id}`}>
                  <h4 className="text-xs font-bold text-brand-neutral truncate leading-tight" id={`dash-activity-pname-${tx.id}`}>
                    {tx.productName}
                  </h4>
                  <p className="text-[10px] text-gray-400 font-mono" id={`dash-activity-sku-${tx.id}`}>
                    SKU: {tx.sku}
                  </p>
                  <div className="flex items-center gap-2 pt-0.5 text-[10px] text-gray-500">
                    <span>{tx.category}</span>
                    <span>•</span>
                    <span>{tx.time}</span>
                  </div>
                </div>

                {/* Quantity Badge */}
                <div className="text-right shrink-0 font-mono" id={`dash-activity-qty-box-${tx.id}`}>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      isEntrada
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-950/40 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {isEntrada ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                    {isEntrada ? '+' : '-'}{tx.quantity} un
                  </span>
                </div>
              </div>
            );
          })}

          {transactions.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500 bg-brand-secondary/30 rounded-xl border border-dashed border-brand-tertiary/50" id="dash-activity-empty">
              <Package className="w-8 h-8 text-brand-tertiary mx-auto mb-2" id="dash-activity-empty-icon" />
              <p className="text-xs font-medium" id="dash-activity-empty-text">Nenhuma movimentação registrada ainda.</p>
              <p className="text-[10px] text-gray-500 mt-0.5" id="dash-activity-empty-hint">Use o botão + para realizar entradas e saídas de estoque.</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-20 right-4 z-30" id="dash-fab-wrapper">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onOpenQuickOp()}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-brand-primary text-black shadow-2xl hover:bg-brand-primary/90 transition cursor-pointer"
          title="Nova Operação Rápida"
          id="dash-fab"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </motion.button>
      </div>

    </div>
  );
}
