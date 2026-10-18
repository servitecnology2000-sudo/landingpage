# Especificación Funcional: Auditoría y Reparación del Panel de Métricas Administrativas

> **Documento:** Especificación Funcional (Gate 1 SDD)  
> **Ubicación:** `.agents/specs/auditoria-reparacion-metricas-admin.md`  
> **Módulo:** `/meson-servitecnology-st/metricas`  
> **Motor Analítico:** `src/lib/analytics.ts`  
> **Estado:** En Revisión y Diagnóstico (Gate 1 & Gate 2)  
> **Fecha:** 2026-10-18  

---

## 1. Problema y Fricciones Identificadas

1. **Fallo Crítico en la Consulta Supabase SSR (HTTP 400 Bad Request):**
   - En `src/pages/meson-servitecnology-st/metricas/index.astro`, la consulta a Supabase solicita explícitamente:
     `.select('id, total_amount, shipping_cost, shipping_method, payment_method, payment_status, order_status, items, customer_id, created_at')`
   - Sin embargo, las columnas `shipping_method` y `payment_method` **no existen** en la tabla real `public.orders`. En su lugar, el esquema almacena la logística en `delivery_type` y la pasarela de pago a través de las referencias `mp_preference_id` y `mp_payment_id`.
   - PostgREST responde con error `HTTP 400 Bad Request` (`code: "42703", message: "column orders.shipping_method does not exist"`).
   - Como consecuencia, `ordersRes.data` es `null`, el arreglo de pedidos `allOrders` se inicializa como arreglo vacío `[]`, y todas las tarjetas de KPIs, gráficos SVG y listados quedan forzados a cero o vacíos.

2. **Desconexión entre Tipos de `AnalyticsOrder` y Esquema Real:**
   - La interfaz `AnalyticsOrder` en `src/lib/analytics.ts` define propiedades sintéticas (`shipping_method`, `payment_method`) que no provienen directamente de columnas de base de datos.
   - Las pruebas unitarias en `tests/lib/analytics.test.ts` utilizaban mocks con dichos campos artificialmente inyectados, ocultando el error de integración con la base de datos real.

3. **Ambigüedad en la Definición de "Repuestos Despachados":**
   - Anteriormente, el motor analítico sumaba las unidades de todas las órdenes con `payment_status === 'aprobado'` bajo el nombre `totalUnitsSold`, pero la tarjeta en la interfaz se titula "Repuestos Despachados".
   - Esto confunde unidades *vendidas/cobradas* con unidades *efectivamente despachadas/entregadas* (hitos logísticos `despachado`, `listo_retiro`, `entregado`).

4. **Robustez en Límites Temporales (Zona Horaria y Reloj):**
   - El filtrado por período (`filterOrdersByPeriod`) evalúa `orderDate <= now`. Pequeñas divergencias entre el reloj del servidor de Supabase y el entorno Node/Vercel pueden descartar pedidos creados en el mismo instante.

---

## 2. Definición Unívoca de Métricas Comerciales

### A. Facturación Aprobada
- **Definición:** Sumatoria estricta de `total_amount` de todas las órdenes en el período cuyo `payment_status` sea exactamente `'aprobado'`.
- **Exclusiones:** Se excluyen taxativamente órdenes con estado `pendiente`, `rechazado`, `cancelado` o `en_revision`.
- **Deduplicación:** Se procesan por identificador único de orden (`order.id`) para evitar duplicaciones.
- **Caso `ST-2026-4290`:** Importe de $25.000 CLP, aprobado → **$25.000 CLP**.

### B. Ticket Promedio
- **Definición:** `totalRevenue / approvedOrdersCount`.
- **Regla de Cero:** Si `approvedOrdersCount === 0`, retorna `0` sin provocar división por cero (`NaN`).
- **Caso `ST-2026-4290`:** $25.000 CLP / 1 orden aprobada → **$25.000 CLP**.

### C. Repuestos Despachados
- **Definición de Unidades Despachadas:** Conteo de unidades físicas (`item.cantidad`) provenientes de órdenes aprobadas cuyo estado logístico haya alcanzado o superado el despacho:
  `order_status IN ('despachado', 'listo_retiro', 'entregado')`.
- **Diferenciación en Interfaz:**
  - Métrica principal en grande: **Unidades despachadas** (`totalUnitsDispatched`).
  - Subtexto complementario: **Pedidos despachados** (`dispatchedOrdersCount`) y recaudación por fletes (`shippingRevenue`).
- **Caso `ST-2026-4290`:** `order_status = 'entregado'`, 1 unidad SKU `DW98X` → **1 unidad despachada**.

### D. Tasa de Efectividad (Conversión de Pago)
- **Fórmula:** `(approvedOrdersCount / totalOrdersCount) * 100` con redondeo a 1 decimal.
- **Numerador:** Órdenes con `payment_status === 'aprobado'`.
- **Denominador:** Total de órdenes generadas en el período (`totalOrdersCount = orders.length`).
- **Control de División por Cero:** Si `totalOrdersCount === 0`, retorna `0%`.
- **Límites:** Acotado estrictamente entre `0%` y `100%`.
- **Caso `ST-2026-4290`:** 1 orden aprobada / 1 orden total → **100.0%**.

---

## 3. Requisitos en Sintaxis EARS

- **[EARS-MET-001] WHEN** el servidor SSR cargue la página `/meson-servitecnology-st/metricas`, **THE SYSTEM SHALL** consultar a Supabase utilizando exclusivamente las columnas reales existentes en `public.orders`: `id, total_amount, shipping_cost, delivery_type, mp_preference_id, mp_payment_id, payment_status, order_status, items, customer_id, created_at`.
- **[EARS-MET-002] WHEN** se procese la orden para el motor analítico, **THE SYSTEM SHALL** mapear `shipping_method = order.delivery_type` y derivar `payment_method = (order.mp_payment_id || order.mp_preference_id) ? 'mercadopago' : 'transferencia'`.
- **[EARS-MET-003] WHEN** una orden tenga `payment_status != 'aprobado'`, **THE SYSTEM SHALL** excluir su importe de `totalRevenue` y `averageTicket`.
- **[EARS-MET-004] WHEN** se calcule la tarjeta de "Repuestos Despachados", **THE SYSTEM SHALL** sumar la cantidad de unidades (`item.cantidad`) únicamente de aquellas órdenes con `order_status IN ('despachado', 'listo_retiro', 'entregado')` y `payment_status === 'aprobado'`.
- **[EARS-MET-005] WHEN** no existan órdenes registradas en el período seleccionado, **THE SYSTEM SHALL** retornar ceros formateados (`$0 CLP`, `0 unidades`, `0%`) sin emitir excepciones ni errores en consola.
- **[EARS-MET-006] WHEN** se evalúe el filtro por rango temporal (`filterOrdersByPeriod`), **THE SYSTEM SHALL** considerar el huso horario oficial `America/Santiago` e incluir con holgura los eventos del día en curso.

---

## 4. Criterios de Aceptación (Definition of Done - DoD)

1. **Cero Errores PostgREST en Consulta:** La consulta a Supabase responde con HTTP 200 sin columnas inexistentes.
2. **Tarjeta Facturación Aprobada:** Muestra `$25.000 CLP` con la orden `ST-2026-4290`.
3. **Tarjeta Ticket Promedio:** Muestra `$25.000 CLP`.
4. **Tarjeta Repuestos Despachados:** Muestra `1 unidades` y refleja el estado de entrega.
5. **Tarjeta Tasa de Efectividad:** Muestra `100%`.
6. **Gráfico SVG de Tendencia:** Renderiza la barra correspondiente al día 15 de octubre de 2026 con $25.000 CLP.
7. **Top Repuestos:** Muestra SKU `DW98X` (`tapa-pantalla-latitude-5420`) con 1 unidad vendida y $25.000 CLP.
8. **Top Compradores:** Muestra a `Compañia de Inversiones y Rentas Caunahue spa` con 1 compra y $25.000 CLP.
9. **Compatibilidad:** Selector de período (`este_mes`, `ultimos_30`, `trimestre`, `historico`) funciona sin fallas.
10. **Pruebas Automatizadas:** Suite `tests/lib/analytics.test.ts` actualizada y pasando al 100%, más `npm run build` exitoso.
