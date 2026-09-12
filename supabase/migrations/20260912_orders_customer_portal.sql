-- ============================================================
-- Migración: Portal del Cliente "Mis Pedidos" y Facturación SII
-- Proyecto: servitecnology2000 (mivsnmvupahgbrjfdyhl)
-- Fecha: 2026-09-12
-- ============================================================

-- 1. Agregar columnas para factura electrónica SII y fecha de entrega para garantías
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS invoice_folio TEXT,
  ADD COLUMN IF NOT EXISTS invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- 2. Índices para optimizar consultas de portal de clientes
CREATE INDEX IF NOT EXISTS idx_orders_invoice_folio ON public.orders(invoice_folio);
