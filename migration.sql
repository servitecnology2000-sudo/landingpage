-- =============================================
-- SCRIPT DE MIGRACIÓN: EJECUTAR EN SUPABASE
-- =============================================

-- 1. Modificar tabla repuestos_productos
-- Cambiar stock_disponible (boolean) por stock_cantidad (integer)
ALTER TABLE repuestos_productos ADD COLUMN stock_cantidad INTEGER DEFAULT 1;

-- Migrar la data existente para mantener la consistencia
UPDATE repuestos_productos SET stock_cantidad = CASE WHEN stock_disponible THEN 1 ELSE 0 END;

-- Eliminar la columna antigua
ALTER TABLE repuestos_productos DROP COLUMN stock_disponible;

-- 2. Crear nueva tabla de métricas y tracking
CREATE TABLE IF NOT EXISTS metricas_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_evento TEXT NOT NULL,
  elemento_id TEXT,
  url_origen TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security para metricas_eventos
ALTER TABLE metricas_eventos ENABLE ROW LEVEL SECURITY;

-- Política: Inserción pública (cualquier usuario visitante puede registrar eventos)
CREATE POLICY "Permitir inserción pública de eventos"
  ON metricas_eventos
  FOR INSERT
  WITH CHECK (true);

-- Política: Lectura (para leer datos en el dashboard)
CREATE POLICY "Permitir lectura de eventos"
  ON metricas_eventos
  FOR SELECT
  USING (true);

-- Índices para optimizar el panel de analíticas
CREATE INDEX IF NOT EXISTS idx_metricas_tipo ON metricas_eventos(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_metricas_elemento ON metricas_eventos(elemento_id);
