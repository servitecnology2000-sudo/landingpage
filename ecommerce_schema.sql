-- ============================================================
-- SERVITECNOLOGY - Schema para E-commerce (Fase 1)
-- Tablas: customers, orders con RLS y Reserva de Stock
-- Ejecutar en Supabase → SQL Editor → New query
-- Proyecto: mivsnmvupahgbrjfdyhl
-- ============================================================

-- 1. TABLA: customers (Clientes)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  rut TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsquedas de clientes
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_rut ON public.customers(rut);

-- Habilitar RLS en customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS en customers
DROP POLICY IF EXISTS "Permitir insercion publica de clientes" ON public.customers;
CREATE POLICY "Permitir insercion publica de clientes"
  ON public.customers
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir lectura de clientes" ON public.customers;
CREATE POLICY "Permitir lectura de clientes"
  ON public.customers
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Permitir actualizacion de clientes" ON public.customers;
CREATE POLICY "Permitir actualizacion de clientes"
  ON public.customers
  FOR UPDATE
  TO public
  USING (true);

-- Otorgar permisos
GRANT ALL ON public.customers TO anon, authenticated, service_role;


-- 2. TABLA: orders (Pedidos con formato ST-2026-XXXX)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY, -- Formato ST-2026-XXXX
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('retiro', 'delivery_rm')),
  commune TEXT,
  shipping_cost NUMERIC(12,0) DEFAULT 0,
  total_amount NUMERIC(12,0) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pendiente' CHECK (payment_status IN ('pendiente', 'en_revision', 'aprobado')),
  order_status TEXT NOT NULL DEFAULT 'preparacion' CHECK (order_status IN ('preparacion', 'completado', 'cancelado')),
  stock_reserved_until TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para pedidos
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Habilitar RLS en orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS en orders
DROP POLICY IF EXISTS "Permitir insercion de pedidos" ON public.orders;
CREATE POLICY "Permitir insercion de pedidos"
  ON public.orders
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir lectura publica de pedidos" ON public.orders;
CREATE POLICY "Permitir lectura publica de pedidos"
  ON public.orders
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Permitir actualizacion de pedidos" ON public.orders;
CREATE POLICY "Permitir actualizacion de pedidos"
  ON public.orders
  FOR UPDATE
  TO public
  USING (true);

-- Otorgar permisos
GRANT ALL ON public.orders TO anon, authenticated, service_role;

-- 3. Verificación de tablas
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('customers', 'orders');
