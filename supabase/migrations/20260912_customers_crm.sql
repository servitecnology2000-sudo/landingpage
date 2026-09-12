-- ============================================================
-- Migración: Directorio CRM y Flexibilización de Clientes
-- Proyecto: servitecnology2000 (mivsnmvupahgbrjfdyhl)
-- Fecha: 2026-09-12
-- ============================================================

-- 1. Agregar columna para vincular Auth sin restringir la PK id
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Migrar id existentes a auth_user_id
UPDATE public.customers 
  SET auth_user_id = id 
  WHERE auth_user_id IS NULL;

-- 3. Liberar la restricción de que id tenga que ser forzosamente de auth.users
ALTER TABLE public.customers 
  DROP CONSTRAINT IF EXISTS customers_id_fkey;

-- 4. Configurar id para autogenerar UUID por defecto si no se especifica
ALTER TABLE public.customers 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 5. Agregar columnas de clasificación y facturación de empresa SII
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS customer_type TEXT NOT NULL DEFAULT 'registrado' 
    CHECK (customer_type IN ('registrado', 'invitado', 'manual')),
  ADD COLUMN IF NOT EXISTS razon_social TEXT,
  ADD COLUMN IF NOT EXISTS giro TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 6. Índices para búsquedas rápidas en el CRM
CREATE INDEX IF NOT EXISTS idx_customers_rut ON public.customers(rut);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_type ON public.customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_auth_user ON public.customers(auth_user_id);
