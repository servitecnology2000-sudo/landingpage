-- ============================================================
-- SERVITECNOLOGY - Script SQL para Galería de Trabajos
-- Ejecuta este script en: Supabase → SQL Editor → New query
-- ============================================================

-- 1. CREAR LA TABLA (si no existe)
CREATE TABLE IF NOT EXISTS public.trabajos_galeria (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      TEXT        NOT NULL DEFAULT '',
  imagen_url  TEXT        NOT NULL,
  storage_path TEXT,
  categoria   TEXT        NOT NULL DEFAULT 'Soporte',
  activo      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. HABILITAR RLS EN LA TABLA
ALTER TABLE public.trabajos_galeria ENABLE ROW LEVEL SECURITY;

-- 3. ELIMINAR POLÍTICAS ANTIGUAS QUE PUEDAN ESTAR BLOQUEANDO
DROP POLICY IF EXISTS "Allow public read"    ON public.trabajos_galeria;
DROP POLICY IF EXISTS "Allow public insert"  ON public.trabajos_galeria;
DROP POLICY IF EXISTS "Allow public update"  ON public.trabajos_galeria;
DROP POLICY IF EXISTS "Allow public delete"  ON public.trabajos_galeria;
DROP POLICY IF EXISTS "Allow all for public" ON public.trabajos_galeria;

-- 4. CREAR POLÍTICA PERMISIVA TOTAL (lectura pública + escritura desde service role)
--    El cliente con Service Role Key ignora RLS por definición.
--    Esta política permite que el cliente ANON también pueda leer.
CREATE POLICY "Allow public read"
  ON public.trabajos_galeria
  FOR SELECT
  TO public
  USING (true);

-- 5. PERMISOS DE TABLA
GRANT SELECT ON public.trabajos_galeria TO anon;
GRANT SELECT ON public.trabajos_galeria TO authenticated;
GRANT ALL    ON public.trabajos_galeria TO service_role;

-- ============================================================
-- STORAGE: Configurar el bucket 'trabajos_galeria' como PÚBLICO
-- ============================================================

-- Insertar bucket público (ignorar error si ya existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('trabajos_galeria', 'trabajos_galeria', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Eliminar políticas de storage antiguas
DROP POLICY IF EXISTS "Allow public storage read"   ON storage.objects;
DROP POLICY IF EXISTS "Allow service role upload"   ON storage.objects;
DROP POLICY IF EXISTS "Allow service role delete"   ON storage.objects;

-- Política: cualquiera puede LEER los objetos del bucket
CREATE POLICY "Allow public storage read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'trabajos_galeria');

-- Política: service_role puede ESCRIBIR (upload/upsert)
CREATE POLICY "Allow service role upload"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'trabajos_galeria');

-- Política: service_role puede ELIMINAR
CREATE POLICY "Allow service role delete"
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'trabajos_galeria');

-- ============================================================
-- VERIFICACIÓN: Esta query debería devolver 1 fila si todo OK
-- ============================================================
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'trabajos_galeria';
