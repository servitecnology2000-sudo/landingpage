-- =============================================
-- SERVITECH — Schema para repuestos_productos
-- Ejecutar en el SQL Editor de Supabase
-- Proyecto: mivsnmvupahgbrjfdyhl
-- =============================================

-- Tabla principal de productos/repuestos
CREATE TABLE IF NOT EXISTS repuestos_productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  categoria TEXT,
  estado TEXT DEFAULT 'Usado Verificado',
  precio_venta NUMERIC(12,0) DEFAULT 0,
  precio_costo NUMERIC(12,0) DEFAULT 0,
  compatibilidad TEXT[] DEFAULT '{}',
  stock_cantidad INTEGER DEFAULT 1,
  imagenes TEXT[] DEFAULT '{}',
  seo_titulo TEXT,
  seo_descripcion TEXT,
  seo_keywords TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE repuestos_productos ENABLE ROW LEVEL SECURITY;

-- Política: Lectura pública (sin autenticación requerida)
CREATE POLICY "Lectura pública de repuestos"
  ON repuestos_productos
  FOR SELECT
  USING (true);

-- Política: Inserción pública con anon key (gestión vía admin panel con secreto)
CREATE POLICY "Inserción anon"
  ON repuestos_productos
  FOR INSERT
  WITH CHECK (true);

-- Política: Actualización anon
CREATE POLICY "Actualización anon"
  ON repuestos_productos
  FOR UPDATE
  USING (true);

-- Política: Eliminación anon
CREATE POLICY "Eliminación anon"
  ON repuestos_productos
  FOR DELETE
  USING (true);

-- Índice para búsquedas rápidas por slug
CREATE INDEX IF NOT EXISTS idx_repuestos_slug ON repuestos_productos(slug);

-- Índice para filtrado por categoría
CREATE INDEX IF NOT EXISTS idx_repuestos_categoria ON repuestos_productos(categoria);

-- =============================================
-- POLÍTICAS DE ALMACENAMIENTO (STORAGE)
-- Para permitir subir imágenes al bucket
-- =============================================
CREATE POLICY "Permitir subida anonima a imagenes-repuestos"
ON storage.objects FOR INSERT TO public
WITH CHECK ( bucket_id = 'imagenes-repuestos' );

CREATE POLICY "Permitir actualizacion anonima a imagenes-repuestos"
ON storage.objects FOR UPDATE TO public
USING ( bucket_id = 'imagenes-repuestos' );

CREATE POLICY "Permitir eliminacion anonima a imagenes-repuestos"
ON storage.objects FOR DELETE TO public
USING ( bucket_id = 'imagenes-repuestos' );

-- =============================================
-- TABLA DE MÉTRICAS Y TRACKING DE EVENTOS
-- =============================================
CREATE TABLE IF NOT EXISTS metricas_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_evento TEXT NOT NULL,
  elemento_id TEXT,
  url_origen TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE metricas_eventos ENABLE ROW LEVEL SECURITY;

-- Política: Inserción pública
CREATE POLICY "Permitir inserción pública de eventos"
  ON metricas_eventos
  FOR INSERT
  WITH CHECK (true);

-- Política: Lectura pública/admin
CREATE POLICY "Permitir lectura de eventos"
  ON metricas_eventos
  FOR SELECT
  USING (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_metricas_tipo ON metricas_eventos(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_metricas_elemento ON metricas_eventos(elemento_id);

-- =============================================
-- TABLAS DE ECOMMERCE (FASE 1)
-- =============================================

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  rut TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir insercion publica de clientes" ON public.customers FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Permitir lectura de clientes" ON public.customers FOR SELECT TO public USING (true);
CREATE POLICY "Permitir actualizacion de clientes" ON public.customers FOR UPDATE TO public USING (true);
GRANT ALL ON public.customers TO anon, authenticated, service_role;

-- Tabla de pedidos
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

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir insercion de pedidos" ON public.orders FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Permitir lectura publica de pedidos" ON public.orders FOR SELECT TO public USING (true);
CREATE POLICY "Permitir actualizacion de pedidos" ON public.orders FOR UPDATE TO public USING (true);
GRANT ALL ON public.orders TO anon, authenticated, service_role;


