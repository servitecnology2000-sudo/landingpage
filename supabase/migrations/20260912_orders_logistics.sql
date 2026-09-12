-- ============================================================
-- Migración: Soporte de Logística, Despacho y Retiro en orders
-- Proyecto: servitecnology2000 (mivsnmvupahgbrjfdyhl)
-- Fecha: 2026-09-12
-- ============================================================

-- 1. Agregar columnas para control logístico de envíos y retiros
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS courier TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_pickup_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 2. Actualizar la restricción de estados para admitir el ciclo logístico completo
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_order_status_check;

ALTER TABLE public.orders 
  ADD CONSTRAINT orders_order_status_check 
  CHECK (order_status IN ('preparacion', 'despachado', 'listo_retiro', 'entregado', 'cancelado'));

-- 3. Índices para optimizar consultas de pedidos por estado y número de guía
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON public.orders(tracking_number);
