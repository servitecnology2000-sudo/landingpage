# Fase 3: Panel de Métricas Financieras, Comerciales y Rendimiento de Inventario

> **Documento: Plan de Implementación Detallado - Fase 3**  
> **Ubicación:** `docs/ModulosAdmin/fase-3-metricas-kpis.md`  
> **Plan Maestro de Referencia:** [`docs/ModulosAdmin/plan-maestro-fase1.md`](file:///home/angel/Developer/landingpage/docs/ModulosAdmin/plan-maestro-fase1.md)  
> **Módulo:** `/meson-servitecnology-st/metricas`  
> **Estado:** COMPLETADO Y CERTIFICADO ✅  

---

## 1. Justificación y Objetivos de la Fase 3

Habiendo implementado con éxito la **Fase 1** (Gestión de Pedidos & Logística de Despacho) y la **Fase 2** (Directorio CRM & Fidelización de Clientes), el taller técnico y e-commerce de SERVITECNOLOGY requiere visibilidad estratégica sobre su desempeño comercial y financiero.

Actualmente, los pedidos y recaudaciones quedan registrados en Supabase, pero el administrador no cuenta con:
1. Un balance financiero claro de ingresos brutos por período (Mes en curso, últimos 30 días, trimestre, histórico).
2. Un análisis de rotación de inventario que identifique los repuestos con mayor demanda y facturación para reposición anticipada.
3. Indicadores de canales logísticos (qué porcentaje retira en Santiago Centro vs couriers nacionales).
4. Desglose de pasarelas de pago (Mercado Pago vs Transferencia Bancaria directa BancoEstado).
5. Alertas automáticas de quiebre de stock para los repuestos de mayor rotación.

### Objetivos Principales:
1. **Motor de Agregación Analítica (`src/lib/analytics.ts`):** Funciones puras y eficientes en TypeScript para procesar órdenes, calcular métricas de tendencia, desglosar arrays JSONB de items y clasificar transacciones en el servidor sin saturar la base de datos.
2. **Selector de Rango Temporal SSR:** Parámetro reactivo en URL (`?period=este_mes | ultimos_30 | trimestre | historico`) para consultar y comparar dinámicamente los datos con filtrado en tiempo de compilación/ejecución SSR.
3. **Tablero de KPIs de Alto Impacto:**
   - 💰 **Ingresos Aprobados Totales** en CLP.
   - 💳 **Ticket Promedio** por orden aprobada.
   - 📈 **Tasa de Aprobación/Conversión** (`aprobadas / total órdenes creadas`).
   - 🚚 **Ingresos por Costo de Envío / Fletes**.
   - 📦 **Unidades de Repuestos Vendidas**.
4. **Visualizaciones de Tendencia Nativas (Tailwind + SVG):**
   - Gráfico de barras de tendencia cronológica diaria/semanal de ingresos en CLP con tooltips CSS e iluminación fluorescente `brand-green`.
   - Distribución porcentual de Canales de Entrega (Retiro en Bodega vs Delivery RM vs Envíos Nacionales).
   - Distribución de Métodos de Pago (Mercado Pago vs Transferencia Bancaria).
5. **Ranking de Top Repuestos Más Vendidos:**
   - Tabla interactiva con foto miniatura, SKU, nombre, unidades vendidas, ingresos generados y semáforo de stock actual.
6. **Top Clientes por LTV del Período:**
   - Listado de los compradores con mayor facturación en el rango temporal con acceso directo a WhatsApp y enlace al CRM.
7. **Alertas de Reabastecimiento Crítico:**
   - Detección de repuestos con alta rotación pero con stock bajo ($\le 2$ unidades o $\le \text{stock\_minimo}$).
8. **Aseguramiento de Calidad:**
   - Suite de pruebas unitarias en Vitest (`tests/lib/analytics.test.ts`) cubriendo sumatorias exactas, manejo de períodos, casos borde con 0 pedidos y agregaciones JSONB de items.

---

## 2. Arquitectura de Datos y Consultas en Servidor (SSR)

### 2.1 Tablas Involucradas en Supabase

| Tabla | Campos Consultados | Propósito en Métricas |
| :--- | :--- | :--- |
| `orders` | `id, total_amount, shipping_cost, shipping_method, payment_method, payment_status, order_status, items, customer_id, created_at` | Cálculo de ingresos, ticket promedio, agregación de productos JSONB, ratios de pago y entrega. |
| `customers` | `id, full_name, rut, phone, email, razon_social` | Identificación de los compradores VIP del período y cálculo de LTV. |
| `repuestos_productos` | `id, sku, titulo, stock_cantidad, stock_minimo, imagenes, categoria` | Cruce con productos más vendidos para validar stock remanente y emitir alertas de quiebre. |

### 2.2 Estrategia de Filtrado Temporal en SSR

El frontend permitirá alternar entre cuatro períodos mediante query params en la URL:
- `?period=este_mes` (Por defecto): Desde el primer día del mes actual a las 00:00:00 hasta la fecha actual.
- `?period=ultimos_30`: Pedidos generados en los últimos 30 días móviles ($T - 30 \text{ días}$).
- `?period=trimestre`: Pedidos generados en los últimos 90 días móviles.
- `?period=historico`: Todo el universo de pedidos registrados en el sistema.

---

## 3. Especificación del Motor Analítico (`src/lib/analytics.ts`)

Se creará una biblioteca desacoplada con tipado estricto para facilitar su certificación con Vitest y su uso en SSR:

```typescript
export interface OrderItemJSON {
  sku: string;
  titulo: string;
  precio_venta: number;
  cantidad: number;
  imagen?: string;
}

export interface AnalyticsOrder {
  id: string;
  total_amount: number;
  shipping_cost: number;
  shipping_method: 'retiro' | 'delivery_rm' | 'envio_nacional' | string;
  payment_method: 'mercadopago' | 'transferencia' | string;
  payment_status: 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado' | string;
  order_status: string;
  items: OrderItemJSON[] | null;
  customer_id?: string | null;
  created_at: string;
}

export interface PeriodFilter {
  key: 'este_mes' | 'ultimos_30' | 'trimestre' | 'historico';
  label: string;
  startDate: Date | null;
}
```

### Funciones Principales:
1. `filterOrdersByPeriod(orders: AnalyticsOrder[], period: PeriodFilter): AnalyticsOrder[]`
2. `calculateFinancialKPIs(orders: AnalyticsOrder[])`:
   - `totalRevenue`: Suma de `total_amount` de órdenes con `payment_status === 'aprobado'`.
   - `shippingRevenue`: Suma de `shipping_cost` de órdenes aprobadas.
   - `approvedOrdersCount`: Total de pedidos pagados exitosamente.
   - `averageTicket`: `totalRevenue / approvedOrdersCount` (o `0` si no hay órdenes).
   - `totalOrdersCount`: Universo total de órdenes generadas.
   - `approvalRate`: `(approvedOrdersCount / totalOrdersCount) * 100`.
   - `totalUnitsSold`: Cantidad total de repuestos individuales vendidos.
3. `aggregateTopProducts(orders: AnalyticsOrder[], catalogProducts: any[])`:
   - Itera sobre los items JSONB de órdenes aprobadas.
   - Agrupa por `sku`, sumando unidades y monto facturado.
   - Cruza con el catálogo para obtener stock actual y estado de inventario (`ok`, `critico`, `agotado`).
   - Retorna ordenado descendente por recaudación o unidades.
4. `aggregateTimeline(orders: AnalyticsOrder[], period: PeriodFilter)`:
   - Agrupa ventas aprobadas por día o semana (según el rango temporal).
   - Genera los puntos para renderizado de gráfico de barras SVG escalable.
5. `aggregateMethodDistribution(orders: AnalyticsOrder[])`:
   - Conteo e ingresos agrupados por `payment_method` (Mercado Pago vs Transferencia).
   - Conteo agrupado por `shipping_method` (Retiro, Delivery RM, Envío Nacional).
6. `aggregateTopCustomers(orders: AnalyticsOrder[], customersMap: Map<string, any>)`:
   - Identifica clientes con mayor volumen de compra en el período.

---

## 4. Diseño de la Interfaz de Usuario (`/meson-servitecnology-st/metricas`)

La vista reutilizará `AdminLayout.astro` con `activeSection="metricas"`, respetando la paleta oscura de alto contraste:

### 4.1 Encabezado y Selector de Período
- Título principal con badge fluorescente `brand-green`.
- Selector de período tipo pastillas de navegación (`este_mes`, `ultimos_30`, `trimestre`, `historico`). Al hacer clic, navega a la URL correspondiente manteniendo la interactividad nativa SSR.
- Botón de refresco rápido y fecha de corte en hora local de Chile.

### 4.2 Grid de KPIs Superiores (4 Columnas)
- **Tarjeta 1: Facturación Aprobada:** Monto en CLP grande con badge de órdenes exitosas.
- **Tarjeta 2: Ticket Promedio:** Monto medio por compra con indicador de efectividad.
- **Tarjeta 3: Unidades Vendidas:** Repuestos entregados y recaudación de fletes.
- **Tarjeta 4: Tasa de Conversión:** Porcentaje de órdenes que completaron el pago efectivamente.

### 4.3 Gráfico de Tendencia de Ventas (SVG Nativo)
- Renderizado de barras verticales con degradado `brand-green` a transparente.
- Eje X con días/fechas formateadas (`DD/MM`).
- Hover en cada barra para ver el monto exacto en CLP y la cantidad de pedidos de ese día.
- Línea base de promedio diario del período.

### 4.4 Paneles de Distribución (Canales de Pago y Despacho)
- **Tarjeta de Medios de Pago:**
  - Barra de progreso comparativa: Mercado Pago (azul/cyan) vs Transferencia BancoEstado (ámbar/verde).
  - Porcentajes y montos en CLP de cada método.
- **Tarjeta de Modalidades de Entrega:**
  - Desglose entre:
    - Retiro en Taller (Santiago Centro)
    - Delivery Exprés RM
    - Couriers Nacionales (Starken / Chilexpress / Correos)

### 4.5 Tabla de Top Repuestos con Alerta de Inventario
- Columnas: Posición, Repuesto (Imagen + Título + SKU), Unidades Vendidas, Ingresos Totales, Stock Restante y Estado.
- Badges de alerta:
  - 🟢 `En Stock`: Si `stock_cantidad > stock_minimo`.
  - 🟡 `Stock Crítico`: Si `stock_cantidad <= stock_minimo` y $> 0$.
  - 🔴 `Agotado`: Si `stock_cantidad === 0`.

### 4.6 Clientes VIP del Período
- Ranking de los compradores más frecuentes con monto aportado, enlace al CRM (`/meson-servitecnology-st/clientes`) y atajo a WhatsApp.

---

## 5. Pruebas Automatizadas con Vitest

Se creará la suite `tests/lib/analytics.test.ts` para certificar:
1. **Casos Límite y Robustez:**
   - Retorno seguro de valores en cero cuando la lista de órdenes está vacía (`orders = []`).
   - Discriminación estricta de órdenes pendientes o canceladas (no deben inflar los ingresos).
2. **Cálculos Financieros:**
   - Verificación de sumatoria de montos, fletes y ticket promedio con decimales redondeados.
   - Cálculo correcto de la tasa de aprobación porcentual.
3. **Agregación de Items JSONB:**
   - Desglose de múltiples items dentro de una misma orden.
   - Suma correcta de unidades de un mismo SKU repetido en varias órdenes distintas.
4. **Agrupación de Métodos:**
   - Distribución exacta de pasarelas de pago y tipos de despacho.

---

## 6. Plan de Ejecución Paso a Paso

1. **Paso 1: Motor Analítico y Tipos (`src/lib/analytics.ts`)**
   - Construir las funciones puras de procesamiento y agregación de órdenes.
2. **Paso 2: Pruebas Unitarias (`tests/lib/analytics.test.ts`)**
   - Implementar la suite de tests en Vitest y validar con `npm test`.
3. **Paso 3: Construcción de la Vista SSR (`/meson-servitecnology-st/metricas/index.astro`)**
   - Conectar consultas SSR a `orders`, `customers` y `repuestos_productos`.
   - Implementar el selector de períodos, tarjetas de KPIs, gráficos SVG de tendencia, distribuciones y rankings.
4. **Paso 4: Certificación Integral**
   - Ejecución de la suite completa de tests (`npm test`).
   - Verificación de compilación de producción (`npm run build`).
   - Actualización de documentación y `CHANGELOG.md` en orden cronológico inverso estricto.
