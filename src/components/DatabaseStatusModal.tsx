import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, XCircle, AlertCircle, RefreshCw, Server, Table, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { checkDatabaseConnection, ConnectionStatus } from '../lib/supabase';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DatabaseStatusModal({ isOpen, onClose }: DatabaseStatusModalProps) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const handleTestConnection = async () => {
    setLoading(true);
    const result = await checkDatabaseConnection();
    setStatus(result);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      handleTestConnection();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      id="db-status-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl bg-brand-secondary border border-brand-tertiary p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
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
                Status da Conexão do Banco de Dados
              </h2>
              <p className="text-xs text-gray-400" id="db-status-modal-sub">
                Supabase PostgreSQL (Provedor Nuvem)
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

        {/* Content Body */}
        <div className="py-5 space-y-4 overflow-y-auto" id="db-status-body">
          {/* Main Status Indicator Card */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 transition ${
              loading
                ? 'bg-brand-bg border-brand-tertiary'
                : status?.isConnected && status?.tablesMissing?.length === 0
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : status?.isConnected
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
            }`}
            id="db-status-card"
          >
            {loading ? (
              <RefreshCw className="w-6 h-6 text-brand-primary animate-spin shrink-0 mt-0.5" />
            ) : status?.isConnected && status?.tablesMissing?.length === 0 ? (
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
                    : status?.isConnected
                    ? 'Banco de Dados Conectado'
                    : 'Desconectado / Aguardando Tabelas'}
                </span>
                {status?.latencyMs !== undefined && !loading && (
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-gray-300">
                    {status.latencyMs} ms
                  </span>
                )}
              </div>
              <p className="opacity-90">{loading ? 'Verificando conexão com o servidor Supabase...' : status?.message}</p>
            </div>
          </div>

          {/* Connection Info */}
          <div className="p-3.5 bg-brand-bg/80 border border-brand-tertiary rounded-xl space-y-2 text-xs" id="db-status-details">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-brand-primary" /> Endereço do Servidor (URL):
              </span>
              <span className="font-mono text-brand-primary font-semibold truncate max-w-[280px]">
                {status?.url || 'https://pppyusvkcqlaofkwano.supabase.co'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Autenticação (Anon Key):
              </span>
              <span className="font-mono text-emerald-400 font-semibold">Configurada ✓</span>
            </div>
          </div>

          {/* Table Verification Grid */}
          <div className="space-y-2" id="db-status-tables-section">
            <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Table className="w-4 h-4 text-brand-primary" /> Tabelas do Sistema no Supabase:
            </h3>

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

          {/* Quick Guide on how to verify directly in Supabase */}
          <div className="p-3.5 bg-brand-primary/5 border border-brand-primary/20 rounded-xl space-y-2 text-xs text-gray-300" id="db-status-guide">
            <p className="font-bold text-brand-primary flex items-center gap-1.5">
              💡 Como verificar diretamente no Painel do Supabase:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-gray-400 leading-relaxed">
              <li>Acesse <strong className="text-white">supabase.com/dashboard</strong> e entre no seu projeto.</li>
              <li>Acesse a aba <strong className="text-white">Table Editor</strong> para ver as tabelas e dados ao vivo.</li>
              <li>Se alguma tabela estiver como <span className="text-rose-400 font-bold">✗ Falta</span>, abra o <strong className="text-white">SQL Editor</strong> no Supabase, cole o script <code className="text-brand-primary bg-black/50 px-1 rounded">/supabase_schema.sql</code> e clique em <strong>Run</strong>.</li>
            </ol>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-brand-tertiary pt-4" id="db-status-footer">
          <button
            onClick={handleTestConnection}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-brand-primary text-black font-bold text-xs hover:bg-brand-primary/90 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            id="db-status-retest-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Testando...' : 'Re-testar Conexão Agora'}
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-brand-tertiary text-gray-200 font-semibold text-xs hover:bg-brand-tertiary/80 transition cursor-pointer"
            id="db-status-ok-btn"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
