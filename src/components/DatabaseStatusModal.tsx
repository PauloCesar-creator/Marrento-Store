import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, XCircle, AlertCircle, RefreshCw, Server, Table, Copy, Check, ExternalLink, ShieldCheck, Code, Layers } from 'lucide-react';
import { checkDatabaseConnection, ConnectionStatus, SUPABASE_URL } from '../lib/supabase';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FULL_SQL_SCHEMA = `-- ==============================================================================
-- MARENTO STORE - SCHEMA COMPLETO DE BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CATEGORIAS (categories)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);

-- 2. FORNECEDORES (suppliers)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    contact_email VARCHAR(150),
    contact_phone VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);

-- 3. PRODUTOS (products)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(120) NOT NULL,
    supplier VARCHAR(150) DEFAULT 'Direto com Fabricante',
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(12, 2) DEFAULT 0.00,
    quantity INT NOT NULL DEFAULT 0,
    min_stock INT NOT NULL DEFAULT 1,
    image_url TEXT,
    description TEXT,
    sales_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);

-- 4. VARIAÇÕES DE PRODUTO (product_variants)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku VARCHAR(120) UNIQUE,
    name VARCHAR(120) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    price NUMERIC(12, 2),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON public.product_variants(sku);

-- 5. MOVIMENTAÇÕES DE ESTOQUE (transactions)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('entrada', 'saida')),
    category VARCHAR(120) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * price) STORED,
    date VARCHAR(20) NOT NULL,
    time VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON public.transactions(product_id);

-- 6. NOTIFICAÇÕES (notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info' CHECK (type IN ('low_stock', 'system', 'info', 'warning')),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    date VARCHAR(20) NOT NULL,
    time VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- 7. FECHAMENTOS MENSAIS (monthly_closings)
CREATE TABLE IF NOT EXISTS public.monthly_closings (
    id VARCHAR(120) PRIMARY KEY,
    month VARCHAR(50) NOT NULL,
    period_ref VARCHAR(100) NOT NULL,
    total_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_profit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_quantity_sold INT NOT NULL DEFAULT 0,
    top_products JSONB,
    category_breakdown JSONB,
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. FLUXO FINANCEIRO (financial_entries)
CREATE TABLE IF NOT EXISTS public.financial_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('receita', 'despesa')),
    category VARCHAR(120) NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) DEFAULT 'PIX / Cartão',
    status VARCHAR(20) NOT NULL DEFAULT 'pago' CHECK (status IN ('pago', 'pendente', 'cancelado')),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. PERMISSÕES E ACESSO ANÔNIMO DIRETO
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_closings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.suppliers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.product_variants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.transactions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.notifications TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.monthly_closings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.financial_entries TO anon, authenticated, service_role;

-- 10. REALTIME PUBLICATION
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.categories; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.products; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variants; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN OTHERS THEN NULL; END $$;
`;

export default function DatabaseStatusModal({ isOpen, onClose }: DatabaseStatusModalProps) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'status' | 'sql'>('status');

  const handleTestConnection = async () => {
    setLoading(true);
    const result = await checkDatabaseConnection();
    setStatus(result);
    setLoading(false);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(FULL_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  useEffect(() => {
    if (isOpen) {
      handleTestConnection();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in"
      id="db-status-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-brand-secondary border border-brand-tertiary p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        id="db-status-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-tertiary pb-4" id="db-status-header">
          <div className="flex items-center gap-3" id="db-status-title-group">
            <div className="p-2.5 rounded-xl bg-brand-primary/10 border border-brand-primary/30 text-brand-primary" id="db-status-icon-badge">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-brand-neutral" id="db-status-modal-title">
                Banco de Dados Supabase
              </h2>
              <p className="text-xs text-gray-400 font-mono" id="db-status-modal-sub">
                udkeikmmbroznlwfrbgx.supabase.co
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-brand-bg transition cursor-pointer"
            id="db-status-close-btn"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 pt-3 border-b border-brand-tertiary/60">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer ${
              activeTab === 'status'
                ? 'bg-brand-tertiary/70 text-brand-primary border-b-2 border-brand-primary'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Status da Conexão
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-t-xl transition cursor-pointer ${
              activeTab === 'sql'
                ? 'bg-brand-tertiary/70 text-brand-primary border-b-2 border-brand-primary'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Script SQL (Schema para Tabelas)
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1" id="db-status-body">
          {activeTab === 'status' ? (
            <>
              {/* Main Status Indicator Card */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 transition ${
                  loading
                    ? 'bg-brand-bg border-brand-tertiary'
                    : status?.isConnected && (!status.tablesMissing || status.tablesMissing.length === 0)
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : status?.isConnected
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                }`}
                id="db-status-card"
              >
                {loading ? (
                  <RefreshCw className="w-6 h-6 text-brand-primary animate-spin shrink-0 mt-0.5" />
                ) : status?.isConnected && (!status.tablesMissing || status.tablesMissing.length === 0) ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                ) : status?.isConnected ? (
                  <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                )}

                <div className="flex-1 text-xs space-y-1" id="db-status-card-details">
                  <div className="flex items-center justify-between font-bold text-sm">
                    <span>
                      {loading
                        ? 'Testando conexão...'
                        : status?.isConnected && (!status.tablesMissing || status.tablesMissing.length === 0)
                        ? 'Banco de Dados Conectado e Pronto'
                        : status?.isConnected
                        ? 'Conectado (Aguardando criação das tabelas)'
                        : 'Aguardando Configuração das Tabelas'}
                    </span>
                    {status?.latencyMs !== undefined && !loading && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-gray-300">
                        {status.latencyMs} ms
                      </span>
                    )}
                  </div>
                  <p className="opacity-90 leading-relaxed">
                    {loading ? 'Verificando conexão com o servidor Supabase...' : status?.message}
                  </p>
                </div>
              </div>

              {/* Connection Info */}
              <div className="p-3.5 bg-brand-bg/80 border border-brand-tertiary rounded-xl space-y-2 text-xs" id="db-status-details">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-brand-primary" /> Endereço do Servidor (URL):
                  </span>
                  <span className="font-mono text-brand-primary font-semibold truncate max-w-[280px]">
                    {status?.url || SUPABASE_URL}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Autenticação (Anon Key):
                  </span>
                  <span className="font-mono text-emerald-400 font-semibold">Configurada no App ✓</span>
                </div>
              </div>

              {/* Table Verification Grid */}
              <div className="space-y-2" id="db-status-tables-section">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Table className="w-4 h-4 text-brand-primary" /> Tabelas Necessárias no Supabase:
                  </h3>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="text-[11px] text-brand-primary hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedSql ? 'Copiado!' : 'Copiar Script SQL'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" id="db-status-tables-grid">
                  {['categories', 'suppliers', 'products', 'product_variants', 'transactions', 'notifications'].map((tbl) => {
                    const isFound = status?.tablesFound?.includes(tbl);
                    return (
                      <div
                        key={tbl}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs font-mono transition ${
                          loading
                            ? 'bg-brand-bg/50 border-brand-tertiary/40 text-gray-500'
                            : isFound
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-950/20 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        <span className="truncate">{tbl}</span>
                        {loading ? (
                          <span className="text-[10px] text-gray-500">...</span>
                        ) : isFound ? (
                          <span className="text-[10px] font-bold text-emerald-400">✓ OK</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400">✗ Falta</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Instructions Guide */}
              <div className="p-3.5 bg-brand-primary/5 border border-brand-primary/20 rounded-xl space-y-2 text-xs text-gray-300" id="db-status-guide">
                <p className="font-bold text-brand-primary flex items-center gap-1.5">
                  ⚡ Como criar as tabelas no Supabase em 1 minuto:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-400 leading-relaxed">
                  <li>
                    Acesse o seu projeto no <strong className="text-white">supabase.com/dashboard/project/udkeikmmbroznlwfrbgx</strong>
                  </li>
                  <li>
                    No menu lateral esquerdo, clique em <strong className="text-white">SQL Editor</strong> &gt; <strong className="text-white">+ New query</strong>.
                  </li>
                  <li>
                    Clique no botão amarelo abaixo <strong className="text-brand-primary">"Copiar Script SQL Completo"</strong>, cole lá e aperte <strong className="text-white">Run</strong>.
                  </li>
                  <li>
                    Depois volte aqui e clique em <strong className="text-white">"Re-testar Conexão Agora"</strong> para ver tudo verde!
                  </li>
                </ol>
              </div>
            </>
          ) : (
            /* Tab: SQL Script */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Script pronto com todas as tabelas, tipos e chaves estrangeiras:
                </p>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3 py-1.5 bg-brand-primary text-black rounded-lg text-xs font-bold hover:bg-brand-primary/90 transition flex items-center gap-1.5 cursor-pointer shadow"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'Copiado para Área de Transferência!' : 'Copiar Script SQL'}
                </button>
              </div>
              <pre className="p-3.5 bg-brand-bg rounded-xl border border-brand-tertiary text-gray-300 text-[11px] font-mono overflow-x-auto max-h-[320px] select-all leading-relaxed">
                {FULL_SQL_SCHEMA}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-brand-tertiary pt-4" id="db-status-footer">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleTestConnection}
              disabled={loading}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-brand-primary text-black font-bold text-xs hover:bg-brand-primary/90 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              id="db-status-retest-btn"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Testando...' : 'Re-testar Conexão'}
            </button>

            <button
              onClick={handleCopySql}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-brand-tertiary text-brand-neutral border border-brand-primary/30 font-bold text-xs hover:bg-brand-tertiary/80 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-brand-primary" />}
              {copiedSql ? 'Copiado!' : 'Copiar SQL'}
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-brand-bg border border-brand-tertiary text-gray-300 font-semibold text-xs hover:text-white hover:bg-brand-tertiary transition cursor-pointer"
            id="db-status-ok-btn"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
