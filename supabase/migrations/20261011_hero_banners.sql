-- ============================================================
-- SERVITECNOLOGY - Migración: Banners y Carrusel de Repuestos
-- Archivo: supabase/migrations/20261011_hero_banners.sql
-- ============================================================

-- 1. CREAR TABLA public.hero_banners
CREATE TABLE IF NOT EXISTS public.hero_banners (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       TEXT         NOT NULL DEFAULT '',
  descripcion  TEXT         NOT NULL DEFAULT '',
  imagen_url   TEXT         NOT NULL,
  storage_path TEXT,
  link_url     TEXT         NOT NULL DEFAULT '',
  alt_text     TEXT         NOT NULL DEFAULT '',
  seccion      TEXT         NOT NULL DEFAULT 'repuestos',
  orden        INTEGER      NOT NULL DEFAULT 0,
  activo       BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Asegurar columna 'seccion' si la tabla ya existía
ALTER TABLE public.hero_banners ADD COLUMN IF NOT EXISTS seccion TEXT NOT NULL DEFAULT 'repuestos';

-- 2. ÍNDICES DE RENDIMIENTO Y FILTRADO
CREATE INDEX IF NOT EXISTS idx_hero_banners_orden ON public.hero_banners(orden ASC);
CREATE INDEX IF NOT EXISTS idx_hero_banners_activo ON public.hero_banners(activo);
CREATE INDEX IF NOT EXISTS idx_hero_banners_seccion ON public.hero_banners(seccion);

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE ACCESO
-- Lectura pública: únicamente banners activos para visitantes del sitio
DROP POLICY IF EXISTS "Lectura pública de banners activos" ON public.hero_banners;
CREATE POLICY "Lectura pública de banners activos"
  ON public.hero_banners
  FOR SELECT
  TO public
  USING (activo = true);

-- Políticas para rol autenticado / anónimo con API administrativa (service_role y anon para compatibilidad con panel protegido)
DROP POLICY IF EXISTS "Permitir gestión a service_role" ON public.hero_banners;
CREATE POLICY "Permitir gestión a service_role"
  ON public.hero_banners
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir gestión completa administrativa" ON public.hero_banners;
CREATE POLICY "Permitir gestión completa administrativa"
  ON public.hero_banners
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Otorgar permisos
GRANT ALL ON public.hero_banners TO anon, authenticated, service_role;

-- 5. BUCKET DE ALMACENAMIENTO 'banners'
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage para el bucket 'banners'
DROP POLICY IF EXISTS "Lectura pública de imágenes en bucket banners" ON storage.objects;
CREATE POLICY "Lectura pública de imágenes en bucket banners"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'banners');

DROP POLICY IF EXISTS "Gestión de imágenes en bucket banners" ON storage.objects;
CREATE POLICY "Gestión de imágenes en bucket banners"
  ON storage.objects
  FOR ALL
  TO public
  USING (bucket_id = 'banners')
  WITH CHECK (bucket_id = 'banners');
