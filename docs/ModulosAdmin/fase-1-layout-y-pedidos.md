# Fase 1: Layout Administrativo Unificado & Gestor de Pedidos con Logística de Despacho

> **Documento: Plan de Implementación Detallado - Fase 1**  
> **Ubicación:** `docs/ModulosAdmin/fase-1-layout-y-pedidos.md`  
> **Plan Maestro de Referencia:** [`docs/ModulosAdmin/plan-maestro-fase1.md`](file:///home/angel/Developer/landingpage/docs/ModulosAdmin/plan-maestro-fase1.md)  
> **Módulo:** `/meson-servitecnology-st/pedidos` & Layout Base Compartido  
> **Estado:** COMPLETADO Y CERTIFICADO ✅  

---

## 1. Justificación y Objetivos de la Fase 1

El e-commerce de SERVITECNOLOGY ya se encuentra operando tanto con pagos aprobados automáticos por **Mercado Pago** como con reservas por **Transferencia Bancaria Manual**. Sin embargo, la administración del sitio carece de una interfaz visual para supervisar las ventas que ingresan a la base de datos `orders` y coordinar los envíos a los clientes.

### Objetivos Principales:
1. **Fundación Arquitectónica (Layout Reutilizable):** Extraer la estructura visual, estilos Tailwind CSS 4 y el guard de autenticación (`admin_session` vs `ADMIN_SECRET`) en un componente de layout unificado (`AdminLayout.astro`) para abastecer tanto a los módulos existentes (Repuestos y Galería) como a los nuevos módulos de administración (`/pedidos`, `/clientes`, `/metricas`).
2. **Control Centralizado de Pedidos:** Construir la vista `/meson-servitecnology-st/pedidos` con tabla interactiva, KPIs superiores y filtros por estado de pago y despacho.
3. **Logística de Despacho y Retiro:**
   - **Envíos Nacionales / RM (Por Pagar):** Habilitar el ingreso obligatorio de Courier (Starken, Chilexpress, CorreosChile, etc.) y Código de Seguimiento (Tracking).
   - **Retiro en Taller:** Botón directo "Marcar Listo para Retiro".
4. **Notificaciones Automáticas por Email:** Disparar avisos transaccionales automáticos vía SMTP (`notificaciones@servitecnology.com`) con el número de seguimiento o las instrucciones de retiro en la sucursal de Santiago Centro.
5. **Conciliación de Transferencias:** Permitir al administrador aprobar manualmente pedidos pagados vía transferencia bancaria una vez verificado el abono en la cuenta corriente BancoEstado.

---

## 2. Paso 0: Actualización del Esquema en Supabase (Migración SQL)

Actualmente, la tabla `orders` definida en [`supabase/migrations/20260910_ecommerce_mvp_auth_mp.sql`](file:///home/angel/Developer/landingpage/supabase/migrations/20260910_ecommerce_mvp_auth_mp.sql) tiene una restricción que solo permite `order_status IN ('preparacion', 'completado', 'cancelado')` y carece de campos de tracking.

Se creará el script de migración [`supabase/migrations/20260912_orders_logistics.sql`](file:///home/angel/Developer/landingpage/supabase/migrations/20260912_orders_logistics.sql):

```sql
-- ============================================================
-- Migración: Soporte de Logística y Despacho en orders
-- ============================================================

-- 1. Agregar campos de seguimiento y courier
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS courier TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_pickup_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 2. Actualizar la restricción de estados de orden para soportar el ciclo de vida logístico
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;

ALTER TABLE public.orders 
  ADD CONSTRAINT orders_order_status_check 
  CHECK (order_status IN ('preparacion', 'despachado', 'listo_retiro', 'entregado', 'cancelado'));

-- 3. Índice para búsquedas rápidas por estado de despacho y courier
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON public.orders(tracking_number);
```

---

## 3. Paso 1: Layout Unificado del Administrador (`AdminLayout.astro`)

### Archivo a Crear:
`src/layouts/AdminLayout.astro`

### Responsabilidades:
1. **Guardia SSR de Seguridad:**
   ```ts
   const _env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string>);
   const adminSecret = _env['ADMIN_SECRET'] || import.meta.env.ADMIN_SECRET || '';
   const cookie = Astro.cookies.get('admin_session');
   if (!adminSecret || cookie?.value !== adminSecret) {
     return Astro.redirect('/meson-servitecnology-st/login');
   }
   ```
2. **Topbar y Navegación Horizontal Unificada:**
   - **Marca:** `SERVITECNOLOGY Admin` con tipografía Outfit y degradado fluorescente verde/cian.
   - **Enlaces Principales:**
     - 📦 **Repuestos** (`/meson-servitecnology-st?tab=inventario`)
     - 🖼️ **Galería** (`/meson-servitecnology-st?tab=galeria`)
     - 📋 **Pedidos** (`/meson-servitecnology-st/pedidos`) *(con pill de alerta si hay órdenes pendientes)*
     - 👥 **Clientes** (`/meson-servitecnology-st/clientes`) *(Fase 2)*
     - 📊 **Métricas** (`/meson-servitecnology-st/metricas`) *(Fase 3)*
   - **Acciones Rápidas:**
     - Botón "+ Nuevo Producto" (`/meson-servitecnology-st/nuevo`)
     - Botón "Ver Sitio" (`/`)
     - Botón "Cerrar sesión" (`/meson-servitecnology-st/logout`)
3. **Estilos Globales Reutilizables:**
   - Paleta corporativa oscura (`bg-[#09090b]`, bordes `rgba(255,255,255,0.05)`).
   - Clases estandarizadas para tablas, badges (`status-approved`, `status-pending`, `status-danger`), botones y modales.

---

## 4. Paso 2: Vista del Gestor de Pedidos (`/meson-servitecnology-st/pedidos/index.astro`)

### Archivo a Crear:
`src/pages/meson-servitecnology-st/pedidos/index.astro`

### Arquitectura de Datos (SSR):
1. Consulta a Supabase mediante `supabaseAdmin` para garantizar bypass de RLS server-side:
   ```ts
   const { data: rawOrders } = await supabaseAdmin
     .from('orders')
     .select(`
       *,
       customers (
         id,
         full_name,
         email,
         phone,
         rut,
         address
       )
     `)
     .order('created_at', { ascending: false });
   ```
2. **Tarjetas de KPIs Superiores:**
   - **Total de Pedidos:** Cantidad total de órdenes registradas.
   - **Pendientes de Pago:** Órdenes con `payment_status === 'pendiente'` (alertas de transferencias).
   - **Por Despachar / Retirar:** Órdenes pagadas con `order_status === 'preparacion'`.
   - **Total Recaudado:** Suma de `total_amount` de órdenes con `payment_status === 'aprobado'`.

3. **Filtros Rápidos en Interfaz (Pills):**
   - `Todos`
   - `Pendientes de Pago`
   - `Por Preparar / Despachar`
   - `Despachados / Listos`
   - `Entregados`
   - `Cancelados`

4. **Tabla de Órdenes:**
   - **ID de Pedido:** `ST-2026-XXXX` (monoespaciado, cian fluorescente).
   - **Fecha / Hora:** Formateada en hora local de Chile (`es-CL`).
   - **Cliente:** Nombre completo y RUT (o badge "Invitado").
   - **Modalidad de Entrega:** Badge azul "Retiro en Taller" o violeta "Envío Starken / Chilexpress" con la comuna.
   - **Total:** Formateado en `$XX.XXX CLP`.
   - **Estado de Pago:**
     - `aprobado` (Verde esmeralda fluorescente).
     - `pendiente` (Ámbar con advertencia).
     - `en_revision` (Azul cian).
     - `rechazado` / `cancelado` (Rojo).
   - **Estado Logístico:**
     - `preparacion` (Amarillo / Naranja).
     - `despachado` (Cian con número de guía visible).
     - `listo_retiro` (Verde esmeralda).
     - `entregado` (Gris tenue / Completado).
   - **Acción:** Botón "Gestionar Pedido 🔍" que despliega el modal interactivo.

---

## 5. Paso 3: Modal de Detalle y Gestión Logística

Al hacer clic en cualquier fila o en el botón "Gestionar Pedido", se desplegará un modal con pestañas o secciones claras:

### 1. Datos del Cliente & Contacto Directo:
- **Nombre:** Nombre del titular o empresa.
- **RUT:** RUT para facturación electrónica SII.
- **Email:** Enlace directo `mailto:...`.
- **Teléfono:** Botón con icono de WhatsApp que enlaza automáticamente a:
  ```text
  https://wa.me/569XXXXXXXX?text=Hola%20[Nombre],%20te%20contactamos%20de%20SERVITECNOLOGY%20respecto%20a%20tu%20pedido%20[ID]...
  ```
- **Dirección de Despacho:** Dirección y Comuna indicadas por el comprador.

### 2. Desglose de Repuestos:
- Tabla con foto miniatura, título del producto, SKU, cantidad comprada, precio unitario y total.
- Total pagado en web y desglose de costo de flete ($0 Cobro en Destino o Retiro).

### 3. Panel de Acciones Operacionales:
- **Caso A: Conciliación de Transferencia Bancaria:**
  - Si el pedido está `pendiente`:
    - Botón **"✅ Aprobar Pago de Transferencia"**: Actualiza `payment_status` a `aprobado`, asegura el stock y envía el correo de confirmación de compra si no se había enviado.
    - Botón **"❌ Rechazar / Cancelar Pedido"**: Cancela la orden y libera la reserva de stock a la tabla `repuestos_productos`.
- **Caso B: Despacho por Encomienda (`delivery_type === 'envio_nacional'`):**
  - Si el pago está `aprobado` y la orden está en `preparacion`:
    - Selector desplegable de Courier: **Starken**, **Chilexpress**, **CorreosChile**, **Blue Express**, **Varmontt**, **Otro**.
    - Input de texto: **Número de Seguimiento (Tracking / N° de Flete)**.
    - Checkbox: *"Enviar correo automático de despacho al cliente"* (marcado por defecto).
    - Botón: **"🚀 Marcar como Despachado y Notificar"**.
- **Caso C: Retiro en Taller (`delivery_type === 'retiro'`):**
  - Si el pago está `aprobado` y la orden está en `preparacion`:
    - Checkbox: *"Enviar correo notificando que está listo para retiro"* (marcado por defecto).
    - Botón: **"📦 Marcar Listo para Retiro en Sucursal"**.
- **Caso D: Cierre de Ciclo:**
  - Botón: **"🏁 Marcar como Entregado"** (cuando el cliente ya retiró o la encomienda llegó a destino).

---

## 6. Paso 4: Endpoint API de Actualización (`/api/admin/orders/update-status.ts`)

### Archivo a Crear:
`src/pages/api/admin/orders/update-status.ts`

### Flujo del Endpoint:
1. **Validación de Autenticación:** Verificar que la cookie `admin_session` coincida con `ADMIN_SECRET`.
2. **Lectura de Payload JSON:**
   - `order_id` (obligatorio)
   - `order_status` (`'preparacion' | 'despachado' | 'listo_retiro' | 'entregado' | 'cancelado'`)
   - `payment_status` (`'pendiente' | 'aprobado' | 'rechazado' | 'cancelado'`)
   - `courier` (opcional)
   - `tracking_number` (opcional)
   - `admin_notes` (opcional)
   - `notify_customer` (booleano)
3. **Persistencia en Supabase:**
   - Actualización atómica en la tabla `orders` vía `supabaseAdmin`.
   - Registro de timestamps automáticos (`shipped_at` al pasar a `despachado`, `ready_pickup_at` al pasar a `listo_retiro`).
4. **Disparo de Correos Transaccionales:**
   - Si `order_status === 'despachado'` y `notify_customer === true` ➔ Llama a `sendOrderShippedEmail(...)`.
   - Si `order_status === 'listo_retiro'` y `notify_customer === true` ➔ Llama a `sendOrderReadyForPickupEmail(...)`.
   - Si `payment_status` cambia a `aprobado` manualmente ➔ Llama a `sendOrderConfirmationEmail(...)`.

---

## 7. Paso 5: Plantillas de Correo en `src/lib/mailer.ts`

Se añadirán dos nuevas funciones exportadas en [`src/lib/mailer.ts`](file:///home/angel/Developer/landingpage/src/lib/mailer.ts):

### 1. `sendOrderShippedEmail(params)`:
- **Asunto:** `🚀 Tu pedido ${orderId} ha sido despachado - SERVITECNOLOGY`
- **Contenido HTML:**
  - Header corporativo oscuro con acentos verde esmeralda y cian.
  - Mensaje formal informando que su paquete ya fue entregado a la empresa de transporte.
  - Recuadro destacado con:
    - **Empresa de Transporte:** Ej. *Starken*
    - **Número de Seguimiento:** Ej. *987654321* (monoespaciado de alto contraste).
    - **Modalidad:** *Envío por Pagar / Cobro en Destino al recibir*.
    - **Botón directo de seguimiento:** Enlace al rastreo web del courier correspondiente.
  - Tabla de resumen de repuestos enviados.
  - Contacto directo por WhatsApp ante cualquier inquietud.

### 2. `sendOrderReadyForPickupEmail(params)`:
- **Asunto:** `📦 Tu pedido ${orderId} está listo para retiro en sucursal - SERVITECNOLOGY`
- **Contenido HTML:**
  - Mensaje informando que su compra está preparada y verificada en el mesón técnico.
  - Recuadro con:
    - **Dirección de Retiro:** *Santiago Centro (Oficina Técnica SERVITECNOLOGY)*.
    - **Horarios de Atención:** *Lunes a Viernes de 09:30 a 18:30 hrs*.
    - **Requisitos para Retirar:** Presentar Cédula de Identidad y el código de orden `${orderId}`.
  - Botón "Abrir ubicación en Google Maps".

---

---

## 8. Paso 6: Plan de Verificación, Testing y Aseguramiento de Calidad

En cumplimiento de la regla obligatoria definida en [`AGENTS.md`](file:///home/angel/Developer/landingpage/AGENTS.md), la Fase 1 contará con una suite de pruebas automatizadas y scripts de verificación antes de dar por completado el desarrollo:

### 8.1 Framework y Arquitectura de Pruebas: Vitest
Dado que el proyecto opera sobre Astro y Tailwind con el motor de Vite, la suite principal se implementará con **Vitest**:
- **Instalación:** `npm install -D vitest`
- **Configuración:** `vitest.config.ts` (entorno `node`, soporte nativo para TypeScript y mocks).
- **Comando:** `npm test` (`vitest run`) en `package.json`.

### 8.2 Casos de Prueba Automatizados (Test Suites):
1. **`tests/admin/orders-api.test.ts` (Integración Endpoint `/api/admin/orders/update-status`):**
   - 🔒 **Control de Acceso:** Rechazo con `401 Unauthorized` si no existe la cookie `admin_session` o si no coincide con `ADMIN_SECRET`.
   - ⚠️ **Validación de Payload:** Error `400 Bad Request` ante falta de `order_id` o estados inválidos.
   - 📦 **Validación de Despacho Nacional:** Verificación de que cambiar a estado `despachado` exija obligatoriamente `courier` y `tracking_number`.
   - 🚀 **Transición Exitosa a Despachado:** Validación de actualización en base de datos, asignación de `shipped_at` y disparo condicional de correo al cliente.
   - 🏬 **Transición a Listo para Retiro:** Verificación de actualización, asignación de `ready_pickup_at` y correo de retiro.
   - 💳 **Conciliación de Pago Manual:** Verificación de cambio de `payment_status` a `aprobado` y confirmación de stock.
2. **`tests/lib/mailer-templates.test.ts` (Unitario de Plantillas de Correo):**
   - **`sendOrderShippedEmail`:** Comprobar que el HTML contenga el courier exacto, tracking monoespaciado, enlace de rastreo y resumen de repuestos.
   - **`sendOrderReadyForPickupEmail`:** Comprobar que el HTML incluya la dirección oficial del taller en Santiago Centro, horarios de atención y advertencia de cédula de identidad.
   - **Mocking de Nodemailer:** Comprobar con `vi.spyOn(transporter, 'sendMail')` que el remitente `notificaciones@servitecnology.com` y los destinatarios sean correctos.

### 8.3 Verificación Manual y End-to-End (E2E):
1. **Visualización en Navegador:**
   - Acceso con sesión admin a `/meson-servitecnology-st/pedidos`.
   - Comprobación de renderizado responsivo (móvil y escritorio).
   - Uso de los filtros interactivos ("Pendientes", "Por Despachar", "Todos").
2. **Interacción con Modal y WhatsApp:**
   - Abrir el modal de un pedido y verificar que el enlace directo de WhatsApp Web abra con el número validado y el mensaje personalizado de la orden.
3. **Validación de Build:**
   - Ejecución de `npm run build` para asegurar compilación limpia sin errores tipográficos de TypeScript ni colisiones de rutas SSR.
4. **Registro en `CHANGELOG.md`:**
   - Documentar la suite de pruebas y la implementación en orden cronológico inverso estricto.
