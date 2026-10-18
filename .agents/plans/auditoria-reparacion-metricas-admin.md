# Plan Técnico de Implementación: Auditoría y Reparación del Panel de Métricas Administrativas

> **Documento:** Plan Técnico de Implementación (Gate 2 SDD)  
> **Ubicación:** `.agents/plans/auditoria-reparacion-metricas-admin.md`  
> **Especificación Asociada:** [`.agents/specs/auditoria-reparacion-metricas-admin.md`](file:///c:/servitecnology/landingpage/.agents/specs/auditoria-reparacion-metricas-admin.md)  
> **Archivos a Modificar:**  
> - `src/pages/meson-servitecnology-st/metricas/index.astro`  
> - `src/lib/analytics.ts`  
> - `tests/lib/analytics.test.ts`  
> **Estado:** Listo para Autorización Gate 3  
> **Fecha:** 2026-10-18  

---

## 1. Diagnóstico Técnico y Causa Raíz

### Causa Raíz Principal
En `src/pages/meson-servitecnology-st/metricas/index.astro`, línea 33:
```ts
supabaseAdmin
  .from('orders')
  .select('id, total_amount, shipping_cost, shipping_method, payment_method, payment_status, order_status, items, customer_id, created_at')
```
Las columnas `shipping_method` y `payment_method` no existen en la tabla `public.orders`. PostgREST retorna `400 Bad Request` (`column orders.shipping_method does not exist`), provocando que `ordersRes.data` sea `null` y `allOrders = []`. Al estar la lista vacía, todas las tarjetas de KPIs, gráficos SVG y listados quedan en 0.

### Causas Secundarias
1. **Falta de normalización en la lectura:** `orders` almacena el canal logístico en `delivery_type` ('retiro', 'delivery_rm', 'envio_nacional'). El método de pago no tiene columna propia sino que se deriva de `mp_payment_id` / `mp_preference_id`.
2. **Definición logística de despacho:** `calculateFinancialKPIs` calculaba `totalUnitsSold` (todas las órdenes aprobadas) pero la tarjeta UI se rotula "Repuestos Despachados". Debe calcularse tanto `totalUnitsDispatched` (órdenes en `despachado`, `listo_retiro` o `entregado`) como `totalUnitsSold`.
3. **Manejo de errores resiliente en SSR:** La llamada `Promise.all` carecía de verificación explícita de `ordersRes.error`, degradando silenciosamente sin alertar en el log del servidor.

---

## 2. Plan de Modificaciones Detallado

### Tarea 1: Adaptación de Tipos y Mapeo en `src/lib/analytics.ts`
1. Actualizar `AnalyticsOrder` para reflejar el esquema real de Supabase:
   - `delivery_type?: 'retiro' | 'delivery_rm' | 'envio_nacional' | string | null`
   - `mp_payment_id?: string | null`
   - `mp_preference_id?: string | null`
   - Mantener `shipping_method` y `payment_method` como campos opcionales/derivados para retrocompatibilidad.
2. Añadir función normalizadora pura:
   ```ts
   export function normalizeOrderForAnalytics(raw: any): AnalyticsOrder {
     const shipping_method = raw.shipping_method || raw.delivery_type || 'retiro';
     const payment_method = raw.payment_method || (raw.mp_payment_id || raw.mp_preference_id ? 'mercadopago' : 'transferencia');
     return {
       ...raw,
       shipping_method,
       payment_method,
       total_amount: Number(raw.total_amount) || 0,
       shipping_cost: Number(raw.shipping_cost) || 0
     };
   }
   ```
3. Extender `FinancialKPIs`:
   - `totalUnitsDispatched: number` (unidades de órdenes aprobadas con `order_status IN ('despachado', 'listo_retiro', 'entregado')`).
   - `dispatchedOrdersCount: number` (conteo de órdenes despachadas/entregadas).
   - `totalUnitsSold: number` (unidades totales vendidas en órdenes aprobadas).
4. Asegurar que `filterOrdersByPeriod` maneje holgura horaria:
   - `orderDate <= new Date(now.getTime() + 24 * 60 * 60 * 1000)` para evitar exclusiones por divergencia de reloj o zona horaria UTC vs Santiago.

### Tarea 2: Corrección de la Consulta SSR en `src/pages/meson-servitecnology-st/metricas/index.astro`
1. Reemplazar la consulta select de `orders`:
   ```ts
   supabaseAdmin
     .from('orders')
     .select('id, total_amount, shipping_cost, delivery_type, mp_preference_id, mp_payment_id, payment_status, order_status, items, customer_id, created_at')
     .order('created_at', { ascending: false })
   ```
2. Mapear los datos recibidos mediante `normalizeOrderForAnalytics`:
   ```ts
   if (ordersRes.error) {
     console.error('Error al consultar orders en métricas:', ordersRes.error);
   } else {
     allOrders = (ordersRes.data || []).map(normalizeOrderForAnalytics);
   }
   ```
3. En la tarjeta "Repuestos Despachados":
   - Desplegar `{kpis.totalUnitsDispatched} unidades` en el número principal.
   - En el subtexto, clarificar `{kpis.dispatchedOrdersCount} pedidos despachados · Fletes: ${kpis.shippingRevenue.toLocaleString('es-CL')} CLP`.

### Tarea 3: Pruebas Automatizadas en `tests/lib/analytics.test.ts`
1. Probar la orden real `ST-2026-4290` con sus datos reales (1 orden aprobada, entregada, $25.000 CLP, SKU `DW98X` cantidad 1).
2. Probar órdenes con pago pendiente, rechazado y cancelado (deben excluirse de la facturación).
3. Probar órdenes en preparación vs despachadas/entregadas para la métrica de despacho.
4. Probar base de datos vacía (`orders = []`).
5. Probar importes nulos, strings o malformados.
6. Probar división por cero en tasa de efectividad y ticket promedio.
7. Probar la función `normalizeOrderForAnalytics` con columnas reales de Supabase (`delivery_type`, `mp_preference_id`).

---

## 3. Matriz de Verificación y Certificación

| Prueba / Criterio | Archivo | Resultado Esperado |
| :--- | :--- | :--- |
| Consulta Supabase en SSR | `src/pages/meson-servitecnology-st/metricas/index.astro` | HTTP 200 sin error 42703 |
| Cálculo de Facturación | `src/lib/analytics.ts` | $25.000 CLP |
| Cálculo de Ticket Promedio | `src/lib/analytics.ts` | $25.000 CLP |
| Cálculo de Despachados | `src/lib/analytics.ts` | 1 unidad despachada |
| Tasa de Efectividad | `src/lib/analytics.ts` | 100.0% |
| Gráfico SVG | `src/pages/meson-servitecnology-st/metricas/index.astro` | Barra visible en 15 de octubre |
| Suite Vitest | `tests/lib/analytics.test.ts` | 100% de tests passing |
| Build de Producción | `npm run build` | Compilación exitosa |
