import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  AlertCircle,
  RotateCcw,
  Trash2,
  BookmarkCheck,
  CalendarCheck,
  X,
  Printer,
  Eye,
  AlertOctagon,
  Info,
  Sliders,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { Product, Transaction, MonthlyClosing } from '../types';

interface ReportsViewProps {
  products: Product[];
  transactions: Transaction[];
  closingDay?: number;
  onUpdateClosingDay?: (day: number) => void;
  monthlyClosings?: MonthlyClosing[];
  onSaveMonthlyClosing?: (closing: MonthlyClosing) => void;
  onDeleteMonthlyClosing?: (id: string) => void;
  onResetPeriodData?: (saveClosingBeforeReset: boolean) => void;
}

export default function ReportsView({
  products,
  transactions,
  closingDay = 30,
  onUpdateClosingDay,
  monthlyClosings = [],
  onSaveMonthlyClosing,
  onDeleteMonthlyClosing,
  onResetPeriodData,
}: ReportsViewProps) {
  const [activeRange, setActiveRange] = useState<'Hoje' | 'Semana' | 'Mês'>('Mês');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [saveClosingBeforeReset, setSaveClosingBeforeReset] = useState(true);
  const [selectedClosingDetail, setSelectedClosingDetail] = useState<MonthlyClosing | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
  const [showClosingConfig, setShowClosingConfig] = useState(false);
  const [deletingClosingId, setDeletingClosingId] = useState<string | null>(null);

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

  // 1. TODAY'S SALES VALUE
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
    return txTime >= thirtyDaysAgo;
  });

  // Period Metrics Calculations
  const periodSalesTxs = filteredTransactions.filter((t) => t.type === 'saida');
  const periodEntriesTxs = filteredTransactions.filter((t) => t.type === 'entrada');

  const faturamentoPeriodo = periodSalesTxs.reduce((acc, t) => acc + t.price * t.quantity, 0);
  const qtdSaidasPeriodo = periodSalesTxs.reduce((acc, t) => acc + t.quantity, 0);
  const qtdEntradasPeriodo = periodEntriesTxs.reduce((acc, t) => acc + t.quantity, 0);

  // Total Invested Value in Store Inventory
  const valorTotalInvestido = products.reduce((acc, p) => {
    const unitCost = p.costPrice && p.costPrice > 0 ? p.costPrice : p.price;
    return acc + unitCost * p.quantity;
  }, 0);

  // Estimated Gross Profit
  const lucroEstimadoPeriodo = periodSalesTxs.reduce((acc, t) => {
    const product = products.find((p) => p.id === t.productId || p.sku === t.sku);
    const cost = product?.costPrice && product.costPrice > 0 ? product.costPrice : t.price * 0.65;
    const profitPerUnit = Math.max(0, t.price - cost);
    return acc + profitPerUnit * t.quantity;
  }, 0);

  // Stock Balance
  const balançoUnidades = qtdEntradasPeriodo - qtdSaidasPeriodo;

  // Low Stock Items
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

  // Current month key for closing checks
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonthClosed = monthlyClosings.some((c) => c.monthKey === currentMonthKey);

  // Manual Trigger for Monthly Closing
  const handleTriggerManualClosing = () => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const periodRef = `${monthNames[now.getMonth()]} / ${now.getFullYear()}`;

    const salesTxs = transactions.filter((t) => t.type === 'saida');
    const entriesTxs = transactions.filter((t) => t.type === 'entrada');

    const totalRevenue = salesTxs.reduce((acc, t) => acc + t.price * t.quantity, 0);
    const totalQuantitySold = salesTxs.reduce((acc, t) => acc + t.quantity, 0);

    const productSalesMap = new Map<string, {
      productId: string;
      productName: string;
      sku: string;
      category: string;
      quantitySold: number;
      totalRevenue: number;
    }>();

    salesTxs.forEach((tx) => {
      const key = tx.productId || tx.sku || tx.productName;
      const existing = productSalesMap.get(key) || {
        productId: tx.productId || '',
        productName: tx.productName,
        sku: tx.sku || '',
        category: tx.category || 'Outros',
        quantitySold: 0,
        totalRevenue: 0,
      };
      existing.quantitySold += tx.quantity;
      existing.totalRevenue += tx.price * tx.quantity;
      productSalesMap.set(key, existing);
    });

    const topProductsList = Array.from(productSalesMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const categorySalesMap = new Map<string, {
      categoryName: string;
      quantitySold: number;
      totalRevenue: number;
    }>();

    salesTxs.forEach((tx) => {
      const cat = tx.category || 'Sem Categoria';
      const existing = categorySalesMap.get(cat) || {
        categoryName: cat,
        quantitySold: 0,
        totalRevenue: 0,
      };
      existing.quantitySold += tx.quantity;
      existing.totalRevenue += tx.price * tx.quantity;
      categorySalesMap.set(cat, existing);
    });

    const categoryBreakdownList = Array.from(categorySalesMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const closedAtFormatted = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const snapshot: MonthlyClosing = {
      id: `closing-${Date.now()}`,
      monthKey: currentMonthKey,
      periodRef,
      closingDay,
      closedAt: now.toISOString(),
      closedAtFormatted,
      totalRevenue,
      totalQuantitySold,
      totalSalesCount: salesTxs.length,
      totalEntriesCount: entriesTxs.length,
      topProducts: topProductsList,
      categoryBreakdown: categoryBreakdownList,
      isManual: true,
    };

    if (onSaveMonthlyClosing) {
      onSaveMonthlyClosing(snapshot);
    }

    setFeedbackMsg({
      type: 'success',
      text: `Fechamento Mensal de ${periodRef} realizado e salvo com sucesso!`,
    });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // Confirm Reset Execution
  const handleConfirmReset = () => {
    if (onResetPeriodData) {
      onResetPeriodData(saveClosingBeforeReset);
    }
    setIsResetModalOpen(false);
    setFeedbackMsg({
      type: 'info',
      text: 'Os valores do mês, movimentações recentes e contadores foram zerados. Os produtos e estoque permanecem salvos!',
    });
    setTimeout(() => setFeedbackMsg(null), 6000);
  };

  // Export functions
  const handleExportPDF = () => {
    const reportContent = `
========================================
MARENTO STORE - RELATÓRIO DE DESEMPENHO
Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}
Filtro de Período: ${activeRange}
Dia de Fechamento do Mês Configurado: Dia ${closingDay}
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

FECHAMENTOS MENSAIS ARQUIVADOS (${monthlyClosings.length}):
${monthlyClosings.map((c) => `- ${c.periodRef} | Faturamento: ${formatCurrency(c.totalRevenue)} | Vendas: ${c.totalQuantitySold} un | Encerrado em: ${c.closedAtFormatted}`).join('\n') || 'Nenhum fechamento arquivado.'}

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
      
      {/* Top Header & Reset Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-tertiary/60 pb-4" id="reports-header">
        <div className="space-y-1">
          <h2 className="font-serif font-semibold text-2xl text-brand-neutral tracking-tight flex items-center gap-2">
            Relatórios & Fechamento
          </h2>
          <p className="text-xs text-gray-400 font-sans">
            Métricas de faturamento, dia de fechamento mensal e reset de ciclo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Closing Day Configuration Toggle Button */}
          <button
            onClick={() => setShowClosingConfig(!showClosingConfig)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-brand-secondary border border-brand-primary/40 text-brand-primary font-bold text-xs hover:bg-brand-primary/10 transition cursor-pointer shadow-sm"
            id="reports-btn-closing-day"
          >
            <CalendarCheck className="w-4 h-4 text-brand-primary" />
            <span>Dia do Fechamento: <strong className="text-white">Dia {closingDay}</strong></span>
            {showClosingConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Exclusive Zerar Valores Button */}
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-950/80 to-rose-950/80 hover:from-amber-900 hover:to-rose-900 border border-amber-500/50 text-amber-200 font-bold text-xs transition cursor-pointer shadow-lg hover:scale-102"
            id="reports-btn-reset-period"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Zerar Relatório do Mês</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-bold ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
          }`}
          id="reports-feedback-banner"
        >
          <div className="flex items-center gap-2.5">
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <Info className="w-5 h-5 shrink-0" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Closing Day Selector & Auto-Closing Settings Panel */}
      <AnimatePresence>
        {showClosingConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            id="reports-closing-config-panel"
          >
            <div className="p-5 rounded-2xl bg-brand-secondary border border-brand-primary/40 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-brand-tertiary/40 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-brand-primary/10 border border-brand-primary/30 text-brand-primary">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-brand-neutral">Sistema de Fechamento Mensal</h3>
                    <p className="text-[11px] text-gray-400">Escolha o dia em que o sistema salva as vendas do mês e resumos de produtos.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowClosingConfig(false)}
                  className="p-1.5 rounded-lg bg-brand-bg text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                {/* Day selector dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
                    Dia do Mês de Fechamento
                  </label>
                  <select
                    value={closingDay}
                    onChange={(e) => {
                      const dayVal = Number(e.target.value);
                      if (onUpdateClosingDay) onUpdateClosingDay(dayVal);
                      setFeedbackMsg({
                        type: 'info',
                        text: `Dia de fechamento atualizado para todo dia ${dayVal} de cada mês.`,
                      });
                      setTimeout(() => setFeedbackMsg(null), 4000);
                    }}
                    className="w-full bg-brand-bg border border-brand-tertiary rounded-xl px-3.5 py-2.5 text-xs text-brand-neutral font-bold focus:outline-none focus:border-brand-primary cursor-pointer"
                    id="reports-select-closing-day"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={`closing-day-opt-${day}`} value={day}>
                        Dia {day} {day === 31 ? '(ou último dia do mês)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Info status badge */}
                <div className="p-3 bg-brand-bg/60 rounded-xl border border-brand-tertiary/40 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Status do Mês Atual ({currentMonthKey})</span>
                  {isCurrentMonthClosed ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Fechamento de {currentMonthKey} já arquivado!
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <Clock className="w-3.5 h-3.5" /> Agendado para dia {closingDay}
                    </span>
                  )}
                </div>

                {/* Manual closing trigger button */}
                <button
                  onClick={handleTriggerManualClosing}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-primary text-black font-bold text-xs hover:bg-brand-primary/90 transition shadow-md cursor-pointer"
                  id="reports-btn-manual-close"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>Realizar Fechamento Agora</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        
        {/* Balanço de Estoque Card */}
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

      {/* Financial Overview Cards Row */}
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

      {/* Archived Monthly Closings Section */}
      <div className="rounded-2xl bg-brand-secondary p-5 border border-brand-tertiary space-y-4" id="reports-monthly-closings-card">
        <div className="flex items-center justify-between border-b border-brand-tertiary/40 pb-3">
          <div className="space-y-1">
            <h3 className="font-serif font-semibold text-lg text-brand-neutral tracking-tight flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-brand-primary" />
              Histórico de Fechamentos Mensais Arquivados
            </h3>
            <p className="text-xs text-gray-400">
              Registros congelados contendo vendas, faturamento e top produtos dos meses salvos.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-brand-primary">
            {monthlyClosings.length} {monthlyClosings.length === 1 ? 'mês salvo' : 'meses salvos'}
          </span>
        </div>

        {monthlyClosings.length === 0 ? (
          <div className="p-6 text-center bg-brand-bg/40 rounded-xl border border-brand-tertiary/30 space-y-2">
            <CalendarCheck className="w-8 h-8 text-gray-500 mx-auto" />
            <p className="text-xs text-gray-400">
              Nenhum fechamento mensal arquivado ainda. O sistema irá salvar automaticamente no dia <strong className="text-brand-primary">{closingDay}</strong> do mês ou quando acionado manualmente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {monthlyClosings.map((closing) => (
              <div
                key={`closing-card-${closing.id}`}
                className="p-4 rounded-xl bg-brand-bg/80 border border-brand-tertiary hover:border-brand-primary/50 transition space-y-3 relative group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider block">
                      Período Ref.
                    </span>
                    <h4 className="font-serif font-bold text-base text-brand-neutral">{closing.periodRef}</h4>
                    <span className="text-[10px] text-gray-500 block">
                      Encerrado em: {closing.closedAtFormatted} {closing.isManual ? '(Manual)' : `(Dia ${closing.closingDay})`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedClosingDetail(closing)}
                      className="p-2 rounded-lg bg-brand-secondary hover:bg-brand-primary/20 text-brand-primary border border-brand-tertiary transition cursor-pointer"
                      title="Ver Detalhes do Fechamento"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {onDeleteMonthlyClosing && (
                      <button
                        onClick={() => onDeleteMonthlyClosing(closing.id)}
                        className="p-2 rounded-lg bg-brand-secondary hover:bg-rose-950/60 text-rose-400 border border-brand-tertiary transition cursor-pointer"
                        title="Excluir Registro de Fechamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-brand-tertiary/30">
                  <div className="p-2 bg-brand-secondary/60 rounded-lg">
                    <span className="block text-[9px] text-gray-400 uppercase font-bold">Faturamento Total</span>
                    <span className="font-serif font-bold text-xs text-brand-primary">{formatCurrency(closing.totalRevenue)}</span>
                  </div>

                  <div className="p-2 bg-brand-secondary/60 rounded-lg">
                    <span className="block text-[9px] text-gray-400 uppercase font-bold">Peças Vendidas</span>
                    <span className="font-serif font-bold text-xs text-brand-neutral">{closing.totalQuantitySold} un</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2" id="reports-export-row">
        <button
          onClick={handleExportPDF}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-secondary hover:bg-brand-tertiary border border-brand-tertiary text-brand-neutral hover:text-brand-primary font-sans font-bold text-xs transition cursor-pointer"
          id="reports-btn-pdf"
        >
          <FileText className="w-4 h-4 text-brand-primary" />
          Exportar Relatório TXT
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

      {/* MODAL 1: Confirmação para Zerar Valores do Relatório */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" id="reset-modal-backdrop">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-brand-secondary border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-5"
              id="reset-modal-window"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-amber-950/80 border border-amber-500/50 text-amber-400 shrink-0">
                  <AlertOctagon className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-lg text-brand-neutral">
                    Zerar Relatório & Atividades do Mês?
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Esta ação irá limpar os registros do ciclo de vendas para iniciar um novo período limpo.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-brand-bg/80 border border-brand-tertiary/60 space-y-2 text-xs text-gray-300">
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> O que será zerado / removido:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-400 pl-1">
                  <li>Histórico de movimentações recentes (entradas e saídas)</li>
                  <li>Contador de vendas individuais por produto (salesCount = 0)</li>
                  <li>Log de notificações temporárias do sistema</li>
                </ul>
                <div className="pt-2 border-t border-brand-tertiary/40 text-[11px] text-emerald-400 font-bold">
                  ✓ Seu cadastro de produtos, categorias, fornecedores e o SALDO ATUAL DO ESTOQUE permanecerão 100% seguros!
                </div>
              </div>

              {/* Checkbox to save a closing snapshot before reset */}
              <label className="flex items-center gap-3 p-3 bg-brand-bg/50 border border-brand-tertiary rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveClosingBeforeReset}
                  onChange={(e) => setSaveClosingBeforeReset(e.target.checked)}
                  className="w-4 h-4 accent-brand-primary rounded cursor-pointer"
                />
                <span className="text-xs text-brand-neutral font-medium">
                  Salvar um <strong>Fechamento Mensal</strong> automático com o faturamento atual antes de zerar.
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-brand-bg hover:bg-brand-tertiary text-gray-300 font-bold text-xs border border-brand-tertiary cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-black font-bold text-xs shadow-lg cursor-pointer transition"
                >
                  Sim, Zerar Dados do Mês
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Detalhes do Fechamento Mensal Arquivado */}
      <AnimatePresence>
        {selectedClosingDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" id="closing-detail-backdrop">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-brand-secondary border border-brand-primary/40 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
              id="closing-detail-window"
            >
              <div className="flex items-center justify-between border-b border-brand-tertiary/50 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest block">
                    Registro de Fechamento Mensal
                  </span>
                  <h3 className="font-serif font-bold text-xl text-brand-neutral">
                    {selectedClosingDetail.periodRef}
                  </h3>
                  <span className="text-xs text-gray-400 block">
                    Arquivado em: {selectedClosingDetail.closedAtFormatted}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedClosingDetail(null)}
                  className="p-2 rounded-xl bg-brand-bg text-gray-400 hover:text-white border border-brand-tertiary cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* KPI Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-brand-bg rounded-xl border border-brand-tertiary/40">
                  <span className="text-[9px] uppercase font-bold text-gray-400 block">Faturamento</span>
                  <span className="font-serif font-bold text-sm text-brand-primary">{formatCurrency(selectedClosingDetail.totalRevenue)}</span>
                </div>
                <div className="p-3 bg-brand-bg rounded-xl border border-brand-tertiary/40">
                  <span className="text-[9px] uppercase font-bold text-gray-400 block">Peças Vendidas</span>
                  <span className="font-serif font-bold text-sm text-brand-neutral">{selectedClosingDetail.totalQuantitySold} un</span>
                </div>
                <div className="p-3 bg-brand-bg rounded-xl border border-brand-tertiary/40">
                  <span className="text-[9px] uppercase font-bold text-gray-400 block">Op. Vendas</span>
                  <span className="font-serif font-bold text-sm text-brand-neutral">{selectedClosingDetail.totalSalesCount}</span>
                </div>
                <div className="p-3 bg-brand-bg rounded-xl border border-brand-tertiary/40">
                  <span className="text-[9px] uppercase font-bold text-gray-400 block">Op. Entradas</span>
                  <span className="font-serif font-bold text-sm text-brand-neutral">{selectedClosingDetail.totalEntriesCount}</span>
                </div>
              </div>

              {/* Top Products Table */}
              <div className="space-y-2">
                <h4 className="font-serif font-bold text-xs text-gray-300 uppercase tracking-wider">
                  Resumo de Vendas por Produto
                </h4>
                <div className="bg-brand-bg rounded-xl border border-brand-tertiary overflow-hidden">
                  {selectedClosingDetail.topProducts.length === 0 ? (
                    <p className="text-xs text-gray-500 p-4 text-center">Nenhum produto registrado para este fechamento.</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto divide-y divide-brand-tertiary/40 text-xs">
                      {selectedClosingDetail.topProducts.map((p, pIdx) => (
                        <div key={`closing-prod-${p.productId || pIdx}-${pIdx}`} className="p-3 flex items-center justify-between hover:bg-brand-secondary/40">
                          <div>
                            <span className="font-bold text-brand-neutral block">{p.productName}</span>
                            <span className="text-[10px] text-gray-500">SKU: {p.sku || '-'} | Cat: {p.category}</span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="font-bold text-brand-primary block">{p.quantitySold} un</span>
                            <span className="text-[10px] text-gray-400">{formatCurrency(p.totalRevenue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Category Breakdown */}
              {selectedClosingDetail.categoryBreakdown.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-serif font-bold text-xs text-gray-300 uppercase tracking-wider">
                    Vendas por Categoria
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedClosingDetail.categoryBreakdown.map((c, cIdx) => (
                      <div key={`closing-cat-${c.categoryName || cIdx}-${cIdx}`} className="p-2.5 bg-brand-bg rounded-xl border border-brand-tertiary/40 text-xs">
                        <span className="font-bold text-brand-neutral block truncate">{c.categoryName}</span>
                        <span className="text-[10px] text-brand-primary font-mono block">{c.quantitySold} un | {formatCurrency(c.totalRevenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end pt-3 border-t border-brand-tertiary/40">
                <button
                  type="button"
                  onClick={() => setSelectedClosingDetail(null)}
                  className="px-5 py-2 rounded-xl bg-brand-primary text-black font-bold text-xs hover:bg-brand-primary/90 transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
