-- =============================================
-- SERVITECH / SERVITECNOLOGY — Schema para trabajos_galeria
-- Ejecutar en el SQL Editor de Supabase
-- Proyecto: mivsnmvupahgbrjfdyhl
-- =============================================

-- 1. Tabla de Galería de Trabajos y Clientes Satisfechos
CREATE TABLE IF NOT EXISTS trabajos_galeria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT,
  imagen_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  categoria TEXT NOT NULL, -- 'Redes', 'CCTV', 'Soporte', 'Impresoras', 'Gaming', 'Desarrollo'
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE trabajos_galeria ENABLE ROW LEVEL SECURITY;

-- Política: Lectura pública (para mostrar en la cinta marquee)
CREATE POLICY "Lectura pública de galeria"
  ON trabajos_galeria
  FOR SELECT
  USING (true);

-- Política: Inserción anon / pública (gestión desde admin)
CREATE POLICY "Inserción anon galeria"
  ON trabajos_galeria
  FOR INSERT
  WITH CHECK (true);

-- Política: Actualización anon
CREATE POLICY "Actualización anon galeria"
  ON trabajos_galeria
  FOR UPDATE
  USING (true);

-- Política: Eliminación anon
CREATE POLICY "Eliminación anon galeria"
  ON trabajos_galeria
  FOR DELETE
  USING (true);

-- Índice para acelerar la consulta por categoría y estado activo
CREATE INDEX IF NOT EXISTS idx_trabajos_cat_activo ON trabajos_galeria(categoria, activo);

-- =============================================
-- POLÍTICAS DE ALMACENAMIENTO (STORAGE)
-- Para el bucket público 'trabajos_galeria'
-- =============================================

-- NOTA: Primero crea el Bucket 'trabajos_galeria' marcado como PUBLIC en la sección Storage de Supabase.

CREATE POLICY "Permitir subida anonima a trabajos_galeria"
ON storage.objects FOR INSERT TO public
WITH CHECK ( bucket_id = 'trabajos_galeria' );

CREATE POLICY "Permitir lectura publica de trabajos_galeria"
ON storage.objects FOR SELECT TO public
USING ( bucket_id = 'trabajos_galeria' );

CREATE POLICY "Permitir actualizacion anonima a trabajos_galeria"
ON storage.objects FOR UPDATE TO public
USING ( bucket_id = 'trabajos_galeria' );

CREATE POLICY "Permitir eliminacion anonima a trabajos_galeria"
ON storage.objects FOR DELETE TO public
USING ( bucket_id = 'trabajos_galeria' );
