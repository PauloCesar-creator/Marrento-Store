-- ==============================================================================
-- MARENTO STORE - SCHEMA COMPLETO DE BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- ==============================================================================
-- INSTRUÇÕES DE INSTALAÇÃO NO SUPABASE:
-- 1. Acesse https://supabase.com/dashboard/project/udkeikmmbroznlwfrbgx
-- 2. No menu lateral esquerdo, clique em "SQL Editor".
-- 3. Clique em "+ New query" (Nova consulta).
-- 4. Cole todo este código e clique no botão verde "Run" (Executar).
-- 5. Todas as tabelas e permissões para múltiplos aparelhos estarão 100% liberadas!
-- ==============================================================================

-- 1. Extensões para identificadores únicos (UUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABELA: CATEGORIAS (categories)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);

-- ==============================================================================
-- 3. TABELA: FORNECEDORES (suppliers)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    contact_email VARCHAR(150),
    contact_phone VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);

-- ==============================================================================
-- 4. TABELA: PRODUTOS (products)
-- ==============================================================================
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

-- ==============================================================================
-- 5. TABELA: VARIAÇÕES DE PRODUTO (product_variants)
-- ==============================================================================
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

-- ==============================================================================
-- 6. TABELA: MOVIMENTAÇÕES DE ESTOQUE E TRANSAÇÕES (transactions)
-- ==============================================================================
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
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- ==============================================================================
-- 7. TABELA: NOTIFICAÇÕES (notifications)
-- ==============================================================================
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
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ==============================================================================
-- 8. TABELA: FECHAMENTOS MENSAIS (monthly_closings)
-- ==============================================================================
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

-- ==============================================================================
-- 9. TABELA: FLUXO DE CAIXA E FINANCEIRO (financial_entries)
-- ==============================================================================
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

CREATE INDEX IF NOT EXISTS idx_financial_type ON public.financial_entries(type);
CREATE INDEX IF NOT EXISTS idx_financial_date ON public.financial_entries(entry_date);

-- ==============================================================================
-- 10. LIBERAÇÃO COMPLETA DE PERMISSÕES E ACESSO RLS (MULTI-DISPOSITIVOS)
-- ==============================================================================
-- Desativa o RLS restritivo para permitir gravação instantânea:
ALTER TABLE IF EXISTS public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.monthly_closings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_entries DISABLE ROW LEVEL SECURITY;

-- Garante que se o Supabase mantiver RLS ativo, existam políticas públicas permissivas:
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

DROP POLICY IF EXISTS "anon_all_financial" ON public.financial_entries;
CREATE POLICY "anon_all_financial" ON public.financial_entries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Concessão explícita de permissões
GRANT ALL ON TABLE public.categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.suppliers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.product_variants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.transactions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.notifications TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.monthly_closings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.financial_entries TO anon, authenticated, service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ==============================================================================
-- 11. HABILITAR SINCRONIZAÇÃO EM TEMPO REAL (REALTIME)
-- ==============================================================================
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER TABLE public.suppliers REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.product_variants REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.monthly_closings REPLICA IDENTITY FULL;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.categories; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.products; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variants; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_closings; EXCEPTION WHEN OTHERS THEN NULL; END $$;

