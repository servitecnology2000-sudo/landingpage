-- ============================================================
-- SERVITECNOLOGY - Migración: Casos de Éxito para /diseno-web
-- Archivo: supabase/migrations/20261121_casos_exito.sql
-- ============================================================

-- 1. CREAR TABLA public.casos_exito
CREATE TABLE IF NOT EXISTS public.casos_exito (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       TEXT         NOT NULL DEFAULT '',
  cliente      TEXT         NOT NULL DEFAULT '',
  tipo         TEXT         NOT NULL DEFAULT 'Sitio Web',
  descripcion  TEXT         NOT NULL DEFAULT '',
  puntos       TEXT         NOT NULL DEFAULT '',
  tags         TEXT         NOT NULL DEFAULT '',
  imagen       TEXT         NOT NULL DEFAULT '',
  storage_path TEXT,
  url_demo     TEXT         NOT NULL DEFAULT '',
  cta_whatsapp TEXT         NOT NULL DEFAULT '',
  orden        INTEGER      NOT NULL DEFAULT 0,
  activo       BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 2. ÍNDICES DE RENDIMIENTO Y FILTRADO
CREATE INDEX IF NOT EXISTS idx_casos_exito_orden ON public.casos_exito(orden ASC);
CREATE INDEX IF NOT EXISTS idx_casos_exito_activo ON public.casos_exito(activo);

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.casos_exito ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE ACCESO
-- Lectura pública: únicamente casos activos para visitantes del sitio
DROP POLICY IF EXISTS "Lectura pública de casos activos" ON public.casos_exito;
CREATE POLICY "Lectura pública de casos activos"
  ON public.casos_exito
  FOR SELECT
  TO public
  USING (activo = true);

-- Políticas para rol administrativo (service_role y anon para compatibilidad con panel protegido)
DROP POLICY IF EXISTS "Permitir gestión a service_role en casos_exito" ON public.casos_exito;
CREATE POLICY "Permitir gestión a service_role en casos_exito"
  ON public.casos_exito
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir gestión completa administrativa en casos_exito" ON public.casos_exito;
CREATE POLICY "Permitir gestión completa administrativa en casos_exito"
  ON public.casos_exito
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Otorgar permisos
GRANT ALL ON public.casos_exito TO anon, authenticated, service_role;

-- 5. INSERTAR LOS 3 CASOS INICIALES (MOLDE ORIGINAL)
INSERT INTO public.casos_exito (titulo, cliente, tipo, descripcion, puntos, tags, imagen, url_demo, cta_whatsapp, orden, activo)
VALUES 
(
  'E-commerce & Catálogo de Repuestos con Stock en Tiempo Real',
  'Plataforma de Comercio Electrónico',
  'E-commerce & Catálogo',
  'Desarrollo integral de tienda online con buscador universal por SKU, filtros reactivos de categorías, pasarela Mercado Pago y panel administrativo para control de inventario de taller.',
  'Buscador inteligente SKU / Modelos
Integración oficial Mercado Pago
Panel de gestión de stock en tiempo real',
  'E-commerce, Mercado Pago, Astro + Supabase, SEO Shopping',
  '/imagenes/disenoweb.jpg',
  '/repuestos',
  'Hola SERVITECNOLOGY, me interesa un E-commerce con catálogo autoadministrable como el de repuestos.',
  1,
  true
),
(
  'Portal Corporativo de Servicios TI y Captación de Clientes',
  'Sitio Web Institucional',
  'Landing Corporativa',
  'Sitio web de alto rendimiento optimizado para Google Lighthouse (95+ en Core Web Vitals), con modo oscuro estético, galerías interactivas y esquema de datos estructurados para presencia local en Santiago.',
  'Tiempo de carga inferior a 1 segundo
SEO Técnico y LocalBusiness Schema
Diseño responsive adaptado a móviles',
  'Alta Velocidad, SEO Técnico, Dark Mode, Diseño Moderno',
  '/imagenes/principal.webp',
  '/',
  'Hola SERVITECNOLOGY, me interesa una página web corporativa con diseño profesional como servitecnology.com.',
  2,
  true
),
(
  'Catálogo Digital y Tienda de Cotización Directa',
  'Plataforma de Cotizaciones B2B',
  'Tienda de Cotizaciones',
  'Sistema web enfocado en la presentación clara de productos y servicios con botón directo de cotización a WhatsApp, eliminando fricciones y facilitando el cierre inmediato de ventas.',
  'Cero comisiones mensuales por venta
Cotización directa por WhatsApp con mensaje precargado
Catálogo dinámico autoadministrable',
  'Cotizador Web, WhatsApp Sales, Catálogo Interactivo',
  '/imagenes/soportepc.webp',
  '/soporte',
  'Hola SERVITECNOLOGY, me interesa una web de catálogo y cotización rápida para mis productos o servicios.',
  3,
  true
)
ON CONFLICT DO NOTHING;
