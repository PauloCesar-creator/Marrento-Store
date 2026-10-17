import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Server,
  Table,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Code,
  Layers,
  Sparkles,
  Zap
} from 'lucide-react';
import { checkDatabaseConnection, ConnectionStatus, SUPABASE_URL } from '../lib/supabase';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RLS_FIX_SQL = `-- ==============================================================================
-- SCRIPT DE LIBERAÇÃO DE PERMISSÕES (RLS) - MULTI-APARELHOS SUPABASE
-- Cole no SQL Editor do Supabase (https://supabase.com/dashboard/project/udkeikmmbroznlwfrbgx)
-- e clique em "Run". Isso permite que todos os aparelhos salvem e sincronizem dados.
-- ==============================================================================

-- 1. Desativar RLS restritivo
ALTER TABLE IF EXISTS public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.monthly_closings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_entries DISABLE ROW LEVEL SECURITY;

-- 2. Conceder permissões públicas totais (anon e authenticated)
GRANT ALL ON TABLE public.categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.suppliers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.product_variants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.transactions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.notifications TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.monthly_closings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.financial_entries TO anon, authenticated, service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Criar políticas permissivas caso o Supabase force RLS
DROP POLICY IF EXISTS "anon_all_categories" ON public.categories;
CREATE POLICY "anon_all_categories" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_suppliers" ON public.suppliers;
CREATE POLICY "anon_all_suppliers" ON public.suppliers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_products" ON public.products;
CREATE POLICY "anon_all_products" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_variants" ON public.product_variants;
CREATE POLICY "anon_all_variants" ON public.product_variants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_transactions" ON public.transactions;
CREATE POLICY "anon_all_transactions" ON public.transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_notifications" ON public.notifications;
CREATE POLICY "anon_all_notifications" ON public.notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_closings" ON public.monthly_closings;
CREATE POLICY "anon_all_closings" ON public.monthly_closings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Habilitar sincronização em tempo real (Realtime)
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.categories; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.products; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variants; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_closings; EXCEPTION WHEN OTHERS THEN NULL; END $$;
`;

export const FULL_SQL_SCHEMA = `-- ==============================================================================
-- MARENTO STORE - SCHEMA COMPLETO DE BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    contact_email VARCHAR(150),
    contact_phone VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

${RLS_FIX_SQL}
`;

export default function DatabaseStatusModal({ isOpen, onClose }: DatabaseStatusModalProps) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedRls, setCopiedRls] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'rls' | 'schema'>('status');

  const checkConnection = async () => {
    setLoading(true);
    try {
      const res = await checkDatabaseConnection();
      setStatus(res);
      if (res.rlsBlocked) {
        setActiveTab('rls');
      }
    } catch {
      setStatus({
        isConnected: false,
        message: 'Falha crítica ao verificar banco.',
        url: SUPABASE_URL,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen]);

  const handleCopySchema = () => {
    navigator.clipboard.writeText(FULL_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyRls = () => {
    navigator.clipboard.writeText(RLS_FIX_SQL);
    setCopiedRls(true);
    setTimeout(() => setCopiedRls(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
      id="db-status-modal-backdrop"
    >
      <div
        className="w-full max-w-2xl bg-brand-secondary border border-brand-primary/40 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 my-auto text-brand-neutral relative"
        id="db-status-modal-window"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-brand-tertiary/60 pb-4" id="db-status-header">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-primary/10 border border-brand-primary/30 text-brand-primary shadow-inner">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-xl text-brand-neutral tracking-tight">
                  Status do Banco de Dados
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-primary/15 text-brand-primary border border-brand-primary/30 uppercase font-semibold">
                  Supabase Cloud
                </span>
              </div>
              <p className="text-xs text-gray-400 font-sans mt-0.5">
                Armazenamento centralizado em nuvem e sincronização multi-aparelhos.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-brand-bg hover:bg-brand-tertiary text-gray-400 hover:text-white transition cursor-pointer border border-brand-tertiary"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-brand-tertiary/50 pb-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'status'
                ? 'bg-brand-primary text-black shadow-md'
                : 'bg-brand-bg/60 text-gray-400 hover:text-white'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Diagnóstico & Conexão</span>
          </button>

          <button
            onClick={() => setActiveTab('rls')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'rls'
                ? 'bg-amber-500 text-black shadow-md font-extrabold'
                : status?.rlsBlocked
                ? 'bg-amber-950/50 text-amber-300 border border-amber-500/50 animate-pulse'
                : 'bg-brand-bg/60 text-gray-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Liberar Permissões (RLS)</span>
            {status?.rlsBlocked && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'schema'
                ? 'bg-brand-primary text-black shadow-md'
                : 'bg-brand-bg/60 text-gray-400 hover:text-white'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Schema Completo</span>
          </button>
        </div>

        {/* TAB 1: STATUS & DIAGNOSTIC */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            {/* RLS Warning Banner if blocked */}
            {status?.rlsBlocked && (
              <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/50 space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-amber-200">
                      Permissões de Gravação Bloqueadas (RLS Ativo no Supabase)
                    </h4>
                    <p className="text-xs text-amber-300/80 leading-relaxed">
                      As tabelas existem no banco, mas o Supabase está rejeitando gravações da chave pública (erro 42501).
                      Para que as vendas e cadastros fiquem salvos nas tabelas e sincronizem entre múltiplos aparelhos, clique no botão abaixo para copiar o script de liberação e execute no Supabase SQL Editor.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleCopyRls}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition cursor-pointer shadow-md"
                  >
                    {copiedRls ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedRls ? 'Copiado para Área de Transferência!' : 'Copiar Script de Liberação (1 Clique)'}</span>
                  </button>

                  <a
                    href="https://supabase.com/dashboard/project/udkeikmmbroznlwfrbgx/sql"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-bg border border-amber-500/40 text-amber-200 text-xs font-bold hover:bg-brand-tertiary transition"
                  >
                    <span>Abrir Supabase SQL Editor</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Main Status Indicator */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                status?.isConnected && !status?.rlsBlocked
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : status?.rlsBlocked
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {status?.isConnected && !status?.rlsBlocked ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                ) : status?.rlsBlocked ? (
                  <ShieldAlert className="w-7 h-7 text-amber-400 shrink-0" />
                ) : (
                  <XCircle className="w-7 h-7 text-rose-400 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    {status?.isConnected && !status?.rlsBlocked
                      ? 'Banco de Dados Conectado & Gravação Ativa!'
                      : status?.rlsBlocked
                      ? 'Conectado (Apenas Leitura - Gravação Bloqueada pelo RLS)'
                      : 'Falha de Conexão com o Supabase'}
                  </h4>
                  <p className="text-xs opacity-90 mt-0.5">{status?.message}</p>
                </div>
              </div>

              {status?.latencyMs !== undefined && (
                <div className="text-right shrink-0">
                  <span className="block text-[10px] uppercase tracking-wider opacity-75 font-mono">Latência</span>
                  <span className="font-mono text-xs font-bold">{status.latencyMs}ms</span>
                </div>
              )}
            </div>

            {/* Connection Information */}
            <div className="p-4 rounded-2xl bg-brand-bg/80 border border-brand-tertiary/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">URL do Supabase</span>
                <span className="font-mono text-brand-primary">{SUPABASE_URL}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Permissão de Leitura</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ativa
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Permissão de Gravação (Multi-Aparelhos)</span>
                {status?.writeAllowed ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Liberada para Todos Aparelhos
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Bloqueada pelo RLS
                  </span>
                )}
              </div>
            </div>

            {/* Tables Grid */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                Tabelas Verificadas no Banco
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  'categories',
                  'suppliers',
                  'products',
                  'product_variants',
                  'transactions',
                  'monthly_closings',
                  'notifications'
                ].map((tbl) => {
                  const isFound = status?.tablesFound?.includes(tbl);
                  return (
                    <div
                      key={tbl}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        isFound
                          ? 'bg-brand-bg/90 border-emerald-500/30 text-emerald-300'
                          : 'bg-brand-bg/40 border-rose-500/30 text-rose-400'
                      }`}
                    >
                      <span className="font-mono font-medium truncate">{tbl}</span>
                      {isFound ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={checkConnection}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-tertiary text-brand-neutral font-bold text-xs hover:border-brand-primary transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-primary' : ''}`} />
                <span>Re-testar Conexão</span>
              </button>

              <button
                onClick={handleCopyRls}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-black font-bold text-xs hover:bg-brand-primary/90 transition cursor-pointer shadow-md"
              >
                {copiedRls ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>Copiar Script de Liberação</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: RLS FIX SCRIPT */}
        {activeTab === 'rls' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-1.5 text-xs text-amber-200">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Zap className="w-4 h-4" />
                <span>Como liberar a sincronização entre aparelhos em 3 passos rápidos:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-gray-300 pl-1">
                <li>Clique no botão dourado <strong>"Copiar Script RLS"</strong> abaixo.</li>
                <li>Abra o <strong>SQL Editor</strong> do Supabase no link ao lado.</li>
                <li>Cole o código na caixa de texto e clique no botão verde <strong>"Run"</strong>.</li>
              </ol>
            </div>

            <div className="relative">
              <pre className="p-4 bg-brand-bg border border-brand-tertiary/60 rounded-xl text-[11px] font-mono text-gray-300 max-h-60 overflow-y-auto whitespace-pre leading-relaxed">
                {RLS_FIX_SQL}
              </pre>

              <button
                onClick={handleCopyRls}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                {copiedRls ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRls ? 'Copiado!' : 'Copiar Script'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <a
                href="https://supabase.com/dashboard/project/udkeikmmbroznlwfrbgx/sql"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-brand-primary font-bold hover:underline"
              >
                <span>Acessar SQL Editor do seu projeto Supabase</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => {
                  setActiveTab('status');
                  checkConnection();
                }}
                className="px-4 py-2 rounded-xl bg-brand-bg border border-brand-tertiary text-xs font-bold hover:text-white"
              >
                Voltar e Re-testar
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: FULL SCHEMA */}
        {activeTab === 'schema' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Script SQL completo com criação de todas as 8 tabelas e permissões:
              </p>
              <button
                onClick={handleCopySchema}
                className="px-3.5 py-1.5 rounded-xl bg-brand-primary text-black font-bold text-xs flex items-center gap-1.5 hover:bg-brand-primary/90 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Schema Completo'}</span>
              </button>
            </div>

            <pre className="p-4 bg-brand-bg border border-brand-tertiary/60 rounded-xl text-[11px] font-mono text-gray-300 max-h-72 overflow-y-auto whitespace-pre leading-relaxed">
              {FULL_SQL_SCHEMA}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
