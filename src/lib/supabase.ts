/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Supabase configuration - Connected to the new database: udkeikmmbroznlwfrbgx
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL ||
  'https://udkeikmmbroznlwfrbgx.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVka2Vpa21tYnJvem5sd2ZyYmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NTc3ODEsImV4cCI6MjEwNzUzMzc4MX0.oEdfgaQo27rUlY-eapI0AN6k4lnUPVbKAso6wv2kY_s';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface ConnectionStatus {
  isConnected: boolean;
  message: string;
  url: string;
  tablesFound?: string[];
  tablesMissing?: string[];
  latencyMs?: number;
}

/**
 * Checks the database connection status by pinging Supabase and verifying required tables.
 */
export async function checkDatabaseConnection(): Promise<ConnectionStatus> {
  const startTime = performance.now();
  try {
    // 1. Ping test by querying categories or products table
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('count', { count: 'exact', head: true });

    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    const requiredTables = [
      'categories',
      'suppliers',
      'products',
      'product_variants',
      'transactions',
      'notifications'
    ];
    const tablesFound: string[] = [];
    const tablesMissing: string[] = [];

    // Check each required table presence
    for (const table of requiredTables) {
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (!error || error.code !== '42P01') {
        // Table exists (42P01 is relation does not exist)
        tablesFound.push(table);
      } else {
        tablesMissing.push(table);
      }
    }

    if (catError && catError.code === '42P01') {
      return {
        isConnected: false,
        message: 'Conectado ao Supabase, mas as tabelas ainda não foram criadas no banco! Execute o script SQL no SQL Editor.',
        url: SUPABASE_URL,
        tablesFound,
        tablesMissing,
        latencyMs
      };
    }

    if (tablesMissing.length > 0) {
      return {
        isConnected: true,
        message: `Conectado ao Supabase! Algumas tabelas faltam (${tablesMissing.join(', ')}). Copie e execute o script SQL.`,
        url: SUPABASE_URL,
        tablesFound,
        tablesMissing,
        latencyMs
      };
    }

    return {
      isConnected: true,
      message: 'Conexão ativa e tabelas do banco de dados verificadas com sucesso!',
      url: SUPABASE_URL,
      tablesFound,
      tablesMissing: [],
      latencyMs
    };
  } catch (err: any) {
    return {
      isConnected: false,
      message: `Erro ao conectar: ${err.message || 'Falha de rede ou chave inválida'}`,
      url: SUPABASE_URL
    };
  }
}
