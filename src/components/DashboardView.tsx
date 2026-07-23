import React from 'react';
import { motion } from 'motion/react';
import {
  Wallet,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Compass,
  Sparkles,
  Gem,
  Wind,
  Plus,
  Package,
  Award
} from 'lucide-react';
import { Product, Transaction, CategoryName } from '../types';
import { useState } from 'react';

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
  
  // Calculate real-time total stock value
  const totalStockValue = products.reduce((acc, p) => acc + (p.price * p.quantity), 0);

  // Count items below minimum stock
  const lowStockCount = products.filter((p) => p.quantity <= p.minStock).length;

  // Calculate total exits / sales
  const salesToday = transactions
    .filter((t) => t.type === 'saida')
    .reduce((acc, t) => acc + (t.price * t.quantity), 0);

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(val);
  };

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

  return (
    <div className="space-y-6 pb-24" id="dashboard-view-root">
      
      {/* 1. Header Hero with quick summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" id="dash-welcome">
        <div className="space-y-1" id="dash-welcome-text">
          <h2 className="font-serif font-semibold text-2xl text-brand-neutral tracking-tight" id="dash-welcome-title">
            Painel Geral
          </h2>
          <p className="text-xs text-gray-500 font-sans" id="dash-welcome-subtitle">
            Balanço financeiro e fluxo de movimentação em tempo real.
          </p>
        </div>
      </div>

      {/* 2. Primary Stock Value Card (High Contrast) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl bg-brand-secondary p-6 border border-brand-tertiary/60 shadow-xl"
        id="dash-total-card"
      >
        {/* Subtle decorative glowing circle in background */}
        <div className="absolute -right-16 -top-16 w-36 h-36 rounded-full bg-brand-primary/5 blur-3xl" />

        <div className="flex items-center justify-between" id="dash-total-header">
          <div className="space-y-2" id="dash-total-labels">
            <span className="block text-[10px] tracking-widest font-bold uppercase text-gray-400 font-sans" id="dash-total-lbl">
              VALOR TOTAL EM ESTOQUE
            </span>
            <span className="block font-serif font-semibold text-3xl sm:text-4xl text-brand-primary tracking-tight" id="dash-total-val">
              {formatCurrency(totalStockValue)}
            </span>
          </div>

          <div className="rounded-xl bg-brand-tertiary/80 p-3 border border-brand-primary/10 shadow-lg" id="dash-total-icon-box">
            <Wallet className="w-5 h-5 text-brand-primary" id="dash-total-icon" />
          </div>
        </div>
      </motion.div>

      {/* 3. Small Stats row */}
      <div className="grid grid-cols-2 gap-3.5" id="dash-stats-grid">
        {/* Low Stock Card */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
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

        {/* Sales Card */}
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          onClick={() => onNavigateToTab('Relatórios')}
          className="group rounded-2xl bg-brand-secondary p-4 border border-brand-tertiary/50 hover:border-brand-primary/30 cursor-pointer transition-all duration-200"
          id="dash-sales-card"
        >
          <div className="flex items-center gap-2 mb-2" id="dash-sales-header">
            <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary border border-brand-primary/10 group-hover:scale-105 transition" id="dash-sales-icon-box">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider" id="dash-sales-lbl">
              VENDAS HOJE
            </span>
          </div>
          <span className="block font-serif text-xl sm:text-2xl text-brand-neutral font-medium" id="dash-sales-val">
            {formatCurrency(salesToday).replace(',00', '')}
          </span>
          <span className="text-[10px] text-brand-green font-medium mt-1 inline-flex items-center gap-0.5" id="dash-sales-growth">
            Acompanhar metas <ChevronRight className="w-3 h-3" />
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
            className="text-xs text-brand-primary font-medium hover:underline flex items-center gap-1"
            id="dash-categories-all-btn"
          >
            Ver Todas <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Circular categories list with quick routing */}
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
                className="flex flex-col items-center p-3 rounded-2xl bg-brand-secondary/40 border border-brand-tertiary/30 hover:border-brand-primary/25 cursor-pointer transition text-center group"
                id={`dash-cat-${catName}`}
              >
                <div className="w-12 h-12 rounded-full bg-brand-secondary border border-brand-tertiary flex items-center justify-center mb-1.5 shadow-md group-hover:border-brand-primary group-hover:bg-brand-tertiary/40 transition duration-200" id={`dash-cat-circle-${catName}`}>
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

          {/* Inline category creator card directly in the list! */}
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
                  className="px-2 py-1 bg-brand-primary text-black text-[9px] font-bold rounded"
                  id="dash-cat-add-submit"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(false)}
                  className="px-2 py-1 bg-brand-tertiary text-gray-400 text-[9px] font-semibold rounded hover:text-white"
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

        {categories.length === 0 && !isAddingCategory && (
          <div className="text-center py-5 text-gray-500 bg-brand-secondary/10 rounded-xl border border-dashed border-brand-tertiary/60" id="dash-cat-empty-hint">
            <p className="text-xs">Nenhuma categoria cadastrada ainda.</p>
            <p className="text-[10px] text-gray-500 mt-1">Crie sua primeira categoria no botão acima para organizar o estoque.</p>
          </div>
        )}
      </div>

      {/* 5. Atividade Recente (Flow of Entries/Exits) */}
      <div className="space-y-3" id="dash-activity-container">
        <div className="flex items-center justify-between" id="dash-activity-header">
          <h3 className="font-serif font-semibold text-lg text-brand-neutral tracking-tight" id="dash-activity-title">
            Atividade Recente
          </h3>
          <button
            onClick={() => onNavigateToTab('Entradas')}
            className="text-xs text-brand-primary font-medium hover:underline flex items-center gap-1"
            id="dash-activity-all-btn"
          >
            Histórico completo <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Flow list */}
        <div className="space-y-2.5" id="dash-activity-list">
          {transactions.slice(0, 5).map((tx, idx) => (
            <div
              key={`dash-tx-${tx.id}-${idx}`}
              className="flex items-center justify-between p-3.5 bg-brand-secondary rounded-xl border border-brand-tertiary/40 shadow-sm"
              id={`dash-activity-item-${tx.id}`}
            >
              <div className="flex items-center gap-3 min-w-0" id={`dash-activity-left-${tx.id}`}>
                <div
                  className={`p-2 rounded-lg ${
                    tx.type === 'entrada'
                      ? 'bg-brand-green/10 text-brand-green'
                      : 'bg-brand-red/10 text-brand-red'
                  } border border-transparent`}
                  id={`dash-activity-badge-${tx.id}`}
                >
                  {tx.type === 'entrada' ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownLeft className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0" id={`dash-activity-text-${tx.id}`}>
                  <h4 className="text-xs font-semibold text-brand-neutral truncate leading-tight" id={`dash-activity-pname-${tx.id}`}>
                    {tx.type === 'entrada' ? 'Entrada:' : 'Venda:'} {tx.productName}
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-0.5" id={`dash-activity-meta-${tx.id}`}>
                    SKU: {tx.sku} • {tx.category} • {tx.time}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 font-mono text-xs font-bold" id={`dash-activity-right-${tx.id}`}>
                <span
                  className={tx.type === 'entrada' ? 'text-brand-green' : 'text-brand-red'}
                  id={`dash-activity-qty-${tx.id}`}
                >
                  {tx.type === 'entrada' ? '+' : '-'}{tx.quantity} un
                </span>
                <span className="block text-[9px] text-gray-500 font-normal mt-0.5" id={`dash-activity-price-${tx.id}`}>
                  {formatCurrency(tx.price).replace(',00', '')} / un
                </span>
              </div>
            </div>
          ))}

          {transactions.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-brand-secondary/30 rounded-xl border border-dashed border-brand-tertiary/50" id="dash-activity-empty">
              <Package className="w-8 h-8 text-brand-tertiary mx-auto mb-2" id="dash-activity-empty-icon" />
              <p className="text-xs font-medium" id="dash-activity-empty-text">Nenhuma movimentação registrada.</p>
              <p className="text-[10px] text-gray-500 mt-0.5" id="dash-activity-empty-hint">Use o botão + para realizar entradas e saídas.</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button (FAB) exactly as in mockup */}
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
