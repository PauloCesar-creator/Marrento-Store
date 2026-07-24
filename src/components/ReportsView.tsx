import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Percent,
  FileText,
  Download,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  Tag,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Package,
  Layers,
  ShoppingBag,
  BarChart3,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Product, Transaction } from '../types';

interface ReportsViewProps {
  products: Product[];
  transactions: Transaction[];
}

export default function ReportsView({ products, transactions }: ReportsViewProps) {
  const [activeRange, setActiveRange] = useState<'Hoje' | 'Semana' | 'Mês'>('Mês');

  // Format Currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  // Helper date parsing for transactions
  const parseTxDate = (tx: Transaction): Date => {
    if (tx.timestamp) return new Date(tx.timestamp);
    if (tx.date) {
      // Handles YYYY-MM-DD or DD/MM/YYYY
      if (tx.date.includes('-')) {
        return new Date(tx.date);
      }
      if (tx.date.includes('/')) {
        const parts = tx.date.split('/');
        if (parts.length === 3) {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      }
    }
    return new Date();
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  // 1. TODAY'S SALES VALUE ("Valor Vendido Hoje")
  const todayTransactions = transactions.filter((t) => {
    const txTime = parseTxDate(t).getTime();
    return txTime >= startOfToday;
  });

  const valorVendidoHoje = todayTransactions
    .filter((t) => t.type === 'saida')
    .reduce((acc, t) => acc + t.price * t.quantity, 0);

  const qtdVendidaHoje = todayTransactions
    .filter((t) => t.type === 'saida')
    .reduce((acc, t) => acc + t.quantity, 0);

  // 2. FILTERED TRANSACTIONS BASED ON SELECTED RANGE
  const filteredTransactions = transactions.filter((t) => {
    const txTime = parseTxDate(t).getTime();
    if (activeRange === 'Hoje') {
      return txTime >= startOfToday;
    }
    if (activeRange === 'Semana') {
      return txTime >= sevenDaysAgo;
    }
    // 'Mês'
    return txTime >= thirtyDaysAgo;
  });

  // Period Metrics Calculations
  const periodSalesTxs = filteredTransactions.filter((t) => t.type === 'saida');
  const periodEntriesTxs = filteredTransactions.filter((t) => t.type === 'entrada');

  const faturamentoPeriodo = periodSalesTxs.reduce((acc, t) => acc + t.price * t.quantity, 0);
  const qtdSaidasPeriodo = periodSalesTxs.reduce((acc, t) => acc + t.quantity, 0);
  const qtdEntradasPeriodo = periodEntriesTxs.reduce((acc, t) => acc + t.quantity, 0);

  // Total Invested Value in Store Inventory (Sum of cost x quantity across all products)
  const valorTotalInvestido = products.reduce((acc, p) => {
    const unitCost = p.costPrice && p.costPrice > 0 ? p.costPrice : p.price;
    return acc + unitCost * p.quantity;
  }, 0);

  // Estimated Gross Profit (Uses real costPrice when available, falls back to estimated 35% margin)
  const lucroEstimadoPeriodo = periodSalesTxs.reduce((acc, t) => {
    const product = products.find((p) => p.id === t.productId || p.sku === t.sku);
    const cost = product?.costPrice && product.costPrice > 0 ? product.costPrice : t.price * 0.65;
    const profitPerUnit = Math.max(0, t.price - cost);
    return acc + profitPerUnit * t.quantity;
  }, 0);

  const ticketMedio = periodSalesTxs.length > 0 ? faturamentoPeriodo / periodSalesTxs.length : 0;

  // Stock Balance (Positivo / Negativo no Estoque)
  const balançoUnidades = qtdEntradasPeriodo - qtdSaidasPeriodo;

  // Low Stock Items (Estoque Baixo)
  const lowStockProducts = products.filter((p) => p.quantity <= p.minStock);

  // Stock Totals
  const grandTotalValue = products.reduce((acc, p) => acc + p.price * p.quantity, 0);
  const grandTotalQuantity = products.reduce((acc, p) => acc + p.quantity, 0);

  // Category summary for current stock
  const categoryInventory = products.reduce((acc: Record<string, { totalValue: number; totalQuantity: number }>, product) => {
    const cat = product.category || 'Sem Categoria';
    if (!acc[cat]) {
      acc[cat] = { totalValue: 0, totalQuantity: 0 };
    }
    acc[cat].totalValue += product.price * product.quantity;
    acc[cat].totalQuantity += product.quantity;
    return acc;
  }, {});

  const categorySummaryList = Object.entries(categoryInventory)
    .map(([name, stats]) => {
      const percentage = grandTotalValue > 0 ? (stats.totalValue / grandTotalValue) * 100 : 0;
      return {
        name,
        ...stats,
        percentage,
      };
    })
    .sort((a, b) => b.totalValue - a.totalValue);

  // Top products
  const topProducts = [...products]
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 3);

  // Chart Setup for Period
  const chartLabels =
    activeRange === 'Hoje'
      ? ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']
      : activeRange === 'Semana'
      ? ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']
      : ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];

  // Calculate proportional points for chart
  const baseValue = faturamentoPeriodo > 0 ? faturamentoPeriodo : 10000;
  const chartFactors =
    activeRange === 'Hoje'
      ? [0.1, 0.25, 0.4, 0.35, 0.6, 0.8, 1.0]
      : activeRange === 'Semana'
      ? [0.3, 0.5, 0.45, 0.7, 0.65, 0.85, 1.0]
      : [0.4, 0.6, 0.85, 1.0];

  const chartValues = chartFactors.map((f) => baseValue * f);
  const maxValue = Math.max(...chartValues, 1000);

  const svgWidth = 500;
  const svgHeight = 120;
  const padding = 15;

  const points = chartValues.map((val, idx) => {
    const x = padding + (idx * (svgWidth - padding * 2)) / (chartValues.length - 1);
    const y = svgHeight - padding - (val / maxValue) * (svgHeight - padding * 2);
    return { x, y, val };
  });

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const cpX1 = points[i - 1].x + (points[i].x - points[i - 1].x) / 2;
    const cpY1 = points[i - 1].y;
    const cpX2 = cpX1;
    const cpY2 = points[i].y;
    linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i].x} ${points[i].y}`;
  }

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`;

  // Export functions
  const handleExportPDF = () => {
    const reportContent = `
========================================
MARENTO STORE - RELATÓRIO DE DESEMPENHO
Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}
Filtro de Período: ${activeRange}
========================================

DESEMPENHO FINANCEIRO:
- Valor Vendido Hoje: ${formatCurrency(valorVendidoHoje)} (${qtdVendidaHoje} peças)
- Faturamento Total (${activeRange}): ${formatCurrency(faturamentoPeriodo)}
- Lucro Bruto Estimado (${activeRange}): ${formatCurrency(lucroEstimadoPeriodo)}
- Valor Total Investido no Estoque: ${formatCurrency(valorTotalInvestido)}

MOVIMENTAÇÃO DE ESTOQUE (${activeRange}):
- Entradas no Estoque: +${qtdEntradasPeriodo} unidades
- Saídas / Vendas: -${qtdSaidasPeriodo} unidades
- Balanço Líquido de Estoque: ${balançoUnidades >= 0 ? '+' : ''}${balançoUnidades} unidades

ALERTAS DE ESTOQUE CRÍTICO (${lowStockProducts.length} itens):
${lowStockProducts.map((p) => `- ${p.name} (SKU: ${p.sku}): ${p.quantity} un em estoque (Mínimo: ${p.minStock})`).join('\n') || 'Nenhum item com estoque crítico'}

RESUMO DO ESTOQUE ATUAL:
- Valor Total em Estoque: ${formatCurrency(grandTotalValue)}
- Quantidade Total de Peças: ${grandTotalQuantity} unidades

ESTOQUE POR CATEGORIA:
${categorySummaryList.map((c) => `- ${c.name}: ${formatCurrency(c.totalValue)} (${c.totalQuantity} un - ${c.percentage.toFixed(1)}%)`).join('\n')}

========================================
Fim do Relatório - Marento Store Luxury Control
========================================
    `;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `marento_relatorio_${activeRange.toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    let csvContent = 'ID;Nome;SKU;Categoria;Preço;QtdEstoque;QtdVendida;StatusEstoque\n';
    products.forEach((p) => {
      const isLow = p.quantity <= p.minStock ? 'BAIXO ESTOQUE' : 'OK';
      csvContent += `${p.id};${p.name};${p.sku};${p.category};${p.price};${p.quantity};${p.salesCount};${isLow}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `marento_relatorio_${activeRange.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-24" id="reports-view-root">
      
      {/* Page Title */}
      <div className="space-y-1" id="reports-header">
        <h2 className="font-serif font-semibold text-2xl text-brand-neutral tracking-tight">
          Relatórios & Performance
        </h2>
        <p className="text-xs text-gray-500 font-sans">
          Métricas de faturamento, vendas e movimentação do estoque.
        </p>
      </div>

      {/* Period Filter Selector (HOJE, SEMANA, MÊS) */}
      <div className="flex gap-2 overflow-x-auto pb-1" id="reports-range-selector">
        {(['Hoje', 'Semana', 'Mês'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setActiveRange(range)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              activeRange === range
                ? 'bg-brand-primary border-brand-primary text-black shadow-lg scale-105'
                : 'bg-brand-secondary border-brand-tertiary text-gray-400 hover:text-brand-neutral'
            }`}
            id={`reports-range-btn-${range}`}
          >
            {range.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Hero Highlight Card: "Valor Vendido Hoje" */}
      <div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-secondary via-brand-secondary to-brand-bg p-6 border border-brand-primary/40 shadow-xl"
        id="reports-card-vendido-hoje"
      >
        <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-brand-primary/10 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between" id="reports-vendido-hoje-header">
          <div className="space-y-1" id="reports-vendido-hoje-info">
            <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest font-bold uppercase text-brand-primary">
              <Sparkles className="w-3.5 h-3.5" /> VALOR VENDIDO HOJE
            </span>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="font-serif font-bold text-3xl sm:text-4xl text-brand-neutral tracking-tight" id="reports-val-hoje">
                {formatCurrency(valorVendidoHoje)}
              </span>
            </div>
            <p className="text-xs text-gray-400 pt-0.5">
              Total arrecadado com vendas no dia de hoje ({qtdVendidaHoje} {qtdVendidaHoje === 1 ? 'peça vendida' : 'peças vendidas'}).
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-brand-primary/10 border border-brand-primary/30 text-brand-primary shrink-0 shadow-md">
            <DollarSign className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row: Balanço do Estoque (+/-) & Estoque Baixo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5" id="reports-secondary-grid">
        
        {/* Balanço de Estoque Card (Positivo / Negativo) */}
        <div className="rounded-2xl bg-brand-secondary p-4 border border-brand-tertiary/60 space-y-2.5" id="reports-card-balanco">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-brand-primary" /> Balanço do Estoque ({activeRange})
            </span>
            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${
              balançoUnidades >= 0
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-950/40 text-rose-400 border-rose-500/30'
            }`}>
              {balançoUnidades >= 0 ? '+' : ''}{balançoUnidades} un
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
              <span className="block text-[9px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> Entradas (+)
              </span>
              <span className="font-serif font-bold text-lg text-emerald-300">+{qtdEntradasPeriodo} un</span>
            </div>

            <div className="p-2.5 bg-rose-950/20 border border-rose-500/30 rounded-xl">
              <span className="block text-[9px] text-rose-400 font-bold uppercase flex items-center gap-1">
                <ArrowDownLeft className="w-3 h-3" /> Saídas (-)
              </span>
              <span className="font-serif font-bold text-lg text-rose-300">-{qtdSaidasPeriodo} un</span>
            </div>
          </div>
        </div>

        {/* Estoque Baixo Card */}
        <div className="rounded-2xl bg-brand-secondary p-4 border border-brand-tertiary/60 space-y-2" id="reports-card-estoque-baixo">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-brand-red" /> Alerta de Estoque Baixo
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              lowStockProducts.length > 0
                ? 'bg-rose-950/50 text-rose-300 border border-rose-500/40'
                : 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/40'
            }`}>
              {lowStockProducts.length} {lowStockProducts.length === 1 ? 'crítico' : 'críticos'}
            </span>
          </div>

          <div className="pt-1">
            {lowStockProducts.length > 0 ? (
              <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                {lowStockProducts.map((p, idx) => (
                  <div key={`low-stock-${p.id || idx}-${idx}`} className="flex items-center justify-between text-xs p-1.5 bg-brand-bg/60 rounded-lg border border-brand-tertiary/40">
                    <span className="font-medium text-brand-neutral truncate max-w-[160px]">{p.name}</span>
                    <span className="font-mono text-rose-400 font-bold">{p.quantity} un <span className="text-[9px] text-gray-500">(mín: {p.minStock})</span></span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-center text-xs text-emerald-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Todo o estoque está em nível adequado!
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Financial Overview Cards Row: Faturamento + Lucro Estimado + Valor Total Investido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" id="reports-financial-cards">
        <div className="rounded-2xl bg-brand-secondary p-3.5 border border-brand-tertiary/60" id="reports-card-fat">
          <span className="block text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-1">
            Faturamento ({activeRange})
          </span>
          <span className="font-serif font-bold text-lg sm:text-xl text-brand-primary block">
            {formatCurrency(faturamentoPeriodo)}
          </span>
        </div>

        <div className="rounded-2xl bg-brand-secondary p-3.5 border border-brand-tertiary/60" id="reports-card-lucro">
          <span className="block text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-1">
            Lucro Est. ({activeRange})
          </span>
          <span className="font-serif font-bold text-lg sm:text-xl text-emerald-400 block">
            {formatCurrency(lucroEstimadoPeriodo)}
          </span>
        </div>

        <div className="rounded-2xl bg-brand-secondary p-3.5 border border-amber-500/30 bg-amber-950/10" id="reports-card-investido">
          <span className="block text-[9px] font-bold uppercase text-amber-400 tracking-wider mb-1 flex items-center justify-between">
            <span>Valor Total Investido</span>
            <span className="text-[8px] font-normal text-amber-500/70 lowercase">estoque</span>
          </span>
          <span className="font-serif font-bold text-lg sm:text-xl text-amber-300 block" id="reports-val-investido">
            {formatCurrency(valorTotalInvestido)}
          </span>
        </div>
      </div>

      {/* Performance Chart Card */}
      <div className="rounded-2xl bg-brand-secondary p-5 border border-brand-tertiary" id="reports-chart-card">
        <div className="flex items-center justify-between mb-4" id="reports-chart-header">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Desempenho de Vendas - {activeRange}
            </h3>
            <p className="text-[10px] text-gray-500 font-sans">
              Evolução das vendas brutas no período selecionado
            </p>
          </div>
          <span className="font-serif text-brand-primary font-bold text-xl">
            {formatCurrency(faturamentoPeriodo)}
          </span>
        </div>

        {/* Custom SVG Line Area Chart */}
        <div className="relative w-full h-36 bg-brand-bg/20 rounded-xl overflow-hidden border border-brand-tertiary/30" id="reports-chart-svg-container">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            <line x1="0" y1={svgHeight / 2} x2={svgWidth} y2={svgHeight / 2} stroke="#262626" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1="0" y1={svgHeight - padding} x2={svgWidth} y2={svgHeight - padding} stroke="#262626" strokeWidth="0.5" />

            <path d={areaPath} fill="url(#goldGradient)" />

            <path
              d={linePath}
              fill="none"
              stroke="#D4AF37"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {points.map((pt, idx) => (
              <circle
                key={`rpt-pt-${idx}`}
                cx={pt.x}
                cy={pt.y}
                r={idx === points.length - 1 ? "4" : "2.5"}
                fill={idx === points.length - 1 ? "#D4AF37" : "#0E0E0C"}
                stroke="#D4AF37"
                strokeWidth={idx === points.length - 1 ? "2.5" : "1.5"}
              />
            ))}
          </svg>
        </div>

        {/* Chart X Axis */}
        <div className="flex justify-between px-1.5 mt-2.5 text-[9px] font-mono font-medium text-gray-500" id="reports-chart-xaxis">
          {chartLabels.map((lbl, idx) => (
            <span key={`rpt-lbl-${lbl}-${idx}`}>{lbl}</span>
          ))}
        </div>
      </div>

      {/* Dynamic Inventory Values by Category */}
      <div className="rounded-2xl bg-brand-secondary p-5 border border-brand-tertiary space-y-4" id="reports-category-stock-card">
        <div className="flex items-center justify-between border-b border-brand-tertiary/40 pb-3" id="reports-cat-stock-header">
          <div className="space-y-1">
            <h3 className="font-serif font-semibold text-base text-brand-neutral tracking-tight flex items-center gap-2">
              <Tag className="w-4 h-4 text-brand-primary" />
              Valor do Estoque por Categoria
            </h3>
            <p className="text-[10px] text-gray-500 font-sans">
              Capital investido e volume total estocado no momento
            </p>
          </div>
          <div className="text-right">
            <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">
              Total Geral
            </span>
            <span className="font-serif text-brand-primary font-bold text-lg" id="reports-cat-stock-grand-total">
              {formatCurrency(grandTotalValue)}
            </span>
          </div>
        </div>

        <div className="space-y-3.5" id="reports-cat-stock-list">
          {categorySummaryList.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">Nenhum produto cadastrado no estoque.</p>
          ) : (
            categorySummaryList.map((cat, idx) => (
              <div key={`reports-cat-${cat.name || idx}-${idx}`} className="space-y-1.5" id={`reports-cat-stock-item-${idx}`}>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
                    <span className="font-medium text-brand-neutral">{cat.name}</span>
                    <span className="text-[10px] text-gray-500">({cat.totalQuantity} un)</span>
                  </div>
                  <div className="text-right font-mono font-semibold text-brand-neutral">
                    <span>{formatCurrency(cat.totalValue)}</span>
                    <span className="text-[9px] text-gray-500 ml-1.5 font-sans font-normal">
                      ({cat.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-brand-tertiary/40 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(cat.percentage, 2)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-brand-tertiary/40 text-center" id="reports-cat-stock-summary">
          <div className="p-2 bg-brand-bg/30 border border-brand-tertiary/40 rounded-xl">
            <span className="block text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Categorias</span>
            <span className="font-serif text-sm font-bold text-brand-neutral">{categorySummaryList.length}</span>
          </div>
          <div className="p-2 bg-brand-bg/30 border border-brand-tertiary/40 rounded-xl">
            <span className="block text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Total Itens</span>
            <span className="font-serif text-sm font-bold text-brand-neutral">{grandTotalQuantity} un</span>
          </div>
        </div>
      </div>

      {/* Produtos Mais Vendidos Section */}
      <div className="space-y-3" id="reports-tops-container">
        <h3 className="font-serif font-semibold text-lg text-brand-neutral tracking-tight" id="reports-tops-title">
          Produtos Mais Vendidos
        </h3>

        <div className="space-y-2.5" id="reports-tops-list">
          {topProducts.map((p, idx) => (
            <div
              key={`rpt-top-${p.id}-${idx}`}
              className="flex items-center justify-between p-3 bg-brand-secondary rounded-xl border border-brand-tertiary/40 shadow-sm"
              id={`reports-top-${p.id}`}
            >
              <div className="flex items-center gap-3 min-w-0" id={`reports-top-left-${p.id}`}>
                <div className="w-11 h-11 rounded-lg overflow-hidden border border-brand-tertiary/30 bg-brand-bg shrink-0" id={`reports-top-img-box-${p.id}`}>
                  <img src={p.imageUrl} alt={p.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" id={`reports-top-img-${p.id}`} />
                </div>
                <div className="min-w-0" id={`reports-top-desc-${p.id}`}>
                  <h4 className="text-xs font-bold text-brand-neutral truncate" id={`reports-top-name-${p.id}`}>{p.name}</h4>
                  <p className="text-[9px] text-gray-500 mt-0.5" id={`reports-top-sku-${p.id}`}>SKU: {p.sku}</p>
                </div>
              </div>

              <div className="text-right shrink-0 font-mono" id={`reports-top-right-${p.id}`}>
                <span className="block text-xs font-bold text-brand-primary" id={`reports-top-sales-${p.id}`}>
                  {p.salesCount} vendas
                </span>
                <span className="block text-[8px] text-gray-500 mt-0.5" id={`reports-top-rate-${p.id}`}>
                  {formatCurrency(p.price)}/un
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2" id="reports-export-row">
        <button
          onClick={handleExportPDF}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-secondary hover:bg-brand-tertiary border border-brand-tertiary text-brand-neutral hover:text-brand-primary font-sans font-bold text-xs transition cursor-pointer"
          id="reports-btn-pdf"
        >
          <FileText className="w-4 h-4 text-brand-primary" />
          Exportar Relatório PDF
        </button>

        <button
          onClick={handleExportExcel}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-secondary hover:bg-brand-tertiary border border-brand-tertiary text-brand-neutral hover:text-brand-primary font-sans font-bold text-xs transition cursor-pointer"
          id="reports-btn-excel"
        >
          <Download className="w-4 h-4 text-brand-primary" />
          Exportar Excel CSV
        </button>
      </div>

    </div>
  );
}
