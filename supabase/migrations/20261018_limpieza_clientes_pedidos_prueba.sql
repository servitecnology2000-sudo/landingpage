-- ==============================================================================
-- SERVITECNOLOGY — Limpieza Transaccional Controlada de Clientes y Pedidos
-- Proyecto: servitecnology2000 (mivsnmvupahgbrjfdyhl)
-- Fecha: 2026-10-18
--
-- Registros preservados (INVIOLABLES):
--   - Cliente: 'Compañia de Inversiones y Rentas Caunahue spa' (UUID: 9c6f18c9-e97b-4f3d-84fc-8dc7998ef416)
--   - Pedido:  'ST-2026-4290' (FK customer_id: 9c6f18c9-e97b-4f3d-84fc-8dc7998ef416)
--
-- Registros candidatos a eliminación:
--   - 77 pedidos de prueba en public.orders
--   - 75 clientes de prueba en public.customers
-- ==============================================================================

BEGIN;

-- 1. Verificación previa de seguridad (Sanity check)
-- Asegura que el cliente real y el pedido real existen y están vinculados antes de tocar cualquier fila
DO $$
DECLARE
  v_customer_exists BOOLEAN;
  v_order_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.customers 
    WHERE id = '9c6f18c9-e97b-4f3d-84fc-8dc7998ef416' 
      AND (full_name ILIKE '%Caunahue%' OR rut = '77.498.086-5')
  ) INTO v_customer_exists;

  SELECT EXISTS(
    SELECT 1 FROM public.orders 
    WHERE id = 'ST-2026-4290' 
      AND customer_id = '9c6f18c9-e97b-4f3d-84fc-8dc7998ef416'
  ) INTO v_order_exists;

  IF NOT v_customer_exists THEN
    RAISE EXCEPTION 'ABORTANDO: No se encontró el cliente real Caunahue spa (9c6f18c9-e97b-4f3d-84fc-8dc7998ef416).';
  END IF;

  IF NOT v_order_exists THEN
    RAISE EXCEPTION 'ABORTANDO: No se encontró el pedido real ST-2026-4290 vinculado al cliente real.';
  END IF;
END $$;

-- 2. Eliminar pedidos de prueba (conservando estrictamente ST-2026-4290)
DELETE FROM public.orders
WHERE id != 'ST-2026-4290';

-- 3. Eliminar clientes de prueba (conservando estrictamente a Caunahue spa)
DELETE FROM public.customers
WHERE id != '9c6f18c9-e97b-4f3d-84fc-8dc7998ef416';

-- 4. Comprobación de integridad post-eliminación dentro de la misma transacción
DO $$
DECLARE
  v_orders_count INT;
  v_customers_count INT;
BEGIN
  SELECT COUNT(*) INTO v_orders_count FROM public.orders;
  SELECT COUNT(*) INTO v_customers_count FROM public.customers;

  IF v_orders_count != 1 THEN
    RAISE EXCEPTION 'ABORTANDO: Se esperaba exactamente 1 pedido en public.orders pero hay %', v_orders_count;
  END IF;

  IF v_customers_count != 1 THEN
    RAISE EXCEPTION 'ABORTANDO: Se esperaba exactamente 1 cliente en public.customers pero hay %', v_customers_count;
  END IF;
END $$;

COMMIT;
