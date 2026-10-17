/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Supabase configuration - Connected to database: udkeikmmbroznlwfrbgx
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as any);

export const SUPABASE_URL =
  env.VITE_SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://udkeikmmbroznlwfrbgx.supabase.co';

export const SUPABASE_ANON_KEY =
  env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVka2Vpa21tYnJvem5sd2ZyYmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NTc3ODEsImV4cCI6MjEwNzUzMzc4MX0.oEdfgaQo27rUlY-eapI0AN6k4lnUPVbKAso6wv2kY_s';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface ConnectionStatus {
  isConnected: boolean;
  message: string;
  url: string;
  tablesFound?: string[];
  tablesMissing?: string[];
  latencyMs?: number;
  writeAllowed?: boolean;
  rlsBlocked?: boolean;
  rlsError?: string;
}

/**
 * Checks the database connection status by pinging Supabase and verifying required tables and write permissions.
 */
export async function checkDatabaseConnection(): Promise<ConnectionStatus> {
  const startTime = performance.now();
  try {
    const requiredTables = [
      'categories',
      'suppliers',
      'products',
      'product_variants',
      'transactions',
      'notifications',
      'monthly_closings'
    ];
    const tablesFound: string[] = [];
    const tablesMissing: string[] = [];

    // Check each required table presence
    for (const table of requiredTables) {
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (!error || error.code !== '42P01') {
        tablesFound.push(table);
      } else {
        tablesMissing.push(table);
      }
    }

    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    if (tablesMissing.length > 0) {
      return {
        isConnected: true,
        message: `Conectado ao Supabase! Faltam tabelas (${tablesMissing.join(', ')}). Copie e execute o script SQL no SQL Editor do Supabase.`,
        url: SUPABASE_URL,
        tablesFound,
        tablesMissing,
        latencyMs,
        writeAllowed: false
      };
    }

    // Active test: Check write permission (RLS status)
    let writeAllowed = true;
    let rlsBlocked = false;
    let rlsError = '';

    try {
      const testPing = `__ping_test_${Date.now()}`;
      const { error: testInsertErr } = await supabase
        .from('categories')
        .insert([{ name: testPing }]);

      if (testInsertErr) {
        if (
          testInsertErr.code === '42501' ||
          testInsertErr.message?.toLowerCase().includes('row-level security') ||
          testInsertErr.message?.toLowerCase().includes('permission denied')
        ) {
          writeAllowed = false;
          rlsBlocked = true;
          rlsError = testInsertErr.message;
        }
      } else {
        // Cleanup test row
        await supabase.from('categories').delete().eq('name', testPing);
      }
    } catch (e: any) {
      writeAllowed = false;
      rlsError = e.message || 'Falha ao testar gravação';
    }

    if (rlsBlocked) {
      return {
        isConnected: true,
        message: 'Conectado! As tabelas existem, mas as permissões de gravação (RLS) estão bloqueadas. Execute o script de permissão RLS no SQL Editor do Supabase.',
        url: SUPABASE_URL,
        tablesFound,
        tablesMissing: [],
        latencyMs,
        writeAllowed: false,
        rlsBlocked: true,
        rlsError
      };
    }

    return {
      isConnected: true,
      message: 'Conexão ativa, tabelas verificadas e permissões de gravação 100% liberadas!',
      url: SUPABASE_URL,
      tablesFound,
      tablesMissing: [],
      latencyMs,
      writeAllowed: true,
      rlsBlocked: false
    };
  } catch (err: any) {
    return {
      isConnected: false,
      message: `Erro ao conectar: ${err.message || 'Falha de rede ou chave inválida'}`,
      url: SUPABASE_URL,
      writeAllowed: false
    };
  }
}
