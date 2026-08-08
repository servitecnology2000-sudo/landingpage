-- =============================================
-- SERVITECH / SERVITECNOLOGY — Schema & Políticas RLS para trabajos_galeria
-- Ejecutar en el SQL Editor de Supabase (Proyecto: mivsnmvupahgbrjfdyhl)
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

-- Habilitar Row Level Security en la tabla
ALTER TABLE trabajos_galeria ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas existentes en la tabla
DROP POLICY IF EXISTS "Lectura pública de galeria" ON trabajos_galeria;
DROP POLICY IF EXISTS "Inserción anon galeria" ON trabajos_galeria;
DROP POLICY IF EXISTS "Actualización anon galeria" ON trabajos_galeria;
DROP POLICY IF EXISTS "Eliminación anon galeria" ON trabajos_galeria;
DROP POLICY IF EXISTS "Permitir todo en galeria" ON trabajos_galeria;

-- Política Permisiva Global para la Tabla (Evita violaciones RLS al insertar/actualizar/eliminar)
CREATE POLICY "Permitir todo en galeria"
  ON trabajos_galeria
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Índice para acelerar la consulta por categoría y estado activo
CREATE INDEX IF NOT EXISTS idx_trabajos_cat_activo ON trabajos_galeria(categoria, activo);

-- =============================================
-- POLÍTICAS DE ALMACENAMIENTO (STORAGE)
-- Para el bucket público 'trabajos_galeria'
-- =============================================

-- Limpieza de políticas existentes en storage.objects
DROP POLICY IF EXISTS "Permitir subida anonima a trabajos_galeria" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura publica de trabajos_galeria" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualizacion anonima a trabajos_galeria" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminacion anonima a trabajos_galeria" ON storage.objects;
DROP POLICY IF EXISTS "Permitir todo en storage trabajos_galeria" ON storage.objects;

-- Política Permisiva Global para el Bucket Storage
CREATE POLICY "Permitir todo en storage trabajos_galeria"
  ON storage.objects
  FOR ALL
  TO public
  USING ( bucket_id = 'trabajos_galeria' )
  WITH CHECK ( bucket_id = 'trabajos_galeria' );
