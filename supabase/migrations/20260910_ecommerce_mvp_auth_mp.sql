-- ============================================================
-- Migración: E-commerce MVP Automatizado (Auth + Mercado Pago)
-- Tablas: customers, orders con RLS, soporte OAuth y Mercado Pago
-- Proyecto: servitecnology2000 (mivsnmvupahgbrjfdyhl)
-- ============================================================

-- 1. TABLA: customers (Clientes vinculados a Auth)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  rut TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsquedas de clientes
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

-- Habilitar RLS en customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para customers
DROP POLICY IF EXISTS "Permitir insercion publica o autenticada de clientes" ON public.customers;
CREATE POLICY "Permitir insercion publica o autenticada de clientes"
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

GRANT ALL ON public.customers TO anon, authenticated, service_role;


-- 2. TABLA: orders (Pedidos con soporte de Mercado Pago)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY, -- Formato ST-2026-XXXX o UUID
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('retiro', 'delivery_rm', 'envio_nacional')),
  commune TEXT,
  shipping_address TEXT,
  shipping_cost NUMERIC(12,0) DEFAULT 0,
  total_amount NUMERIC(12,0) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pendiente' CHECK (payment_status IN ('pendiente', 'en_revision', 'aprobado', 'rechazado', 'cancelado')),
  order_status TEXT NOT NULL DEFAULT 'preparacion' CHECK (order_status IN ('preparacion', 'completado', 'cancelado')),
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  stock_reserved_until TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para pedidos
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_mp_payment ON public.orders(mp_payment_id);

-- Habilitar RLS en orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para orders
DROP POLICY IF EXISTS "Permitir insercion de pedidos" ON public.orders;
CREATE POLICY "Permitir insercion de pedidos"
  ON public.orders
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir lectura de pedidos" ON public.orders;
CREATE POLICY "Permitir lectura de pedidos"
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

GRANT ALL ON public.orders TO anon, authenticated, service_role;
