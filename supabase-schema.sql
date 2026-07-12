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
  stock_disponible BOOLEAN DEFAULT TRUE,
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
