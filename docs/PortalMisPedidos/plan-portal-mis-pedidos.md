# Plan de Implementación: Portal del Cliente "Mis Pedidos" & Historial de Compras

> **Documento:** Plan de Implementación Detallado - Portal del Cliente  
> **Ubicación:** `docs/PortalMisPedidos/plan-portal-mis-pedidos.md`  
> **Módulo:** `/mis-pedidos`  
> **Estado:** LISTO PARA EJECUCIÓN 📋  

---

## 1. Justificación y Objetivos

Ofrecer a los clientes registrados mediante Google OAuth un portal privado y moderno donde puedan:
1. **Consultar su Historial de Compras:** Visualizar todas sus compras históricas en SERVITECNOLOGY bajo un solo lugar.
2. **Trazabilidad Logística en Tiempo Real:** Conocer el estado exacto del pedido (`preparacion`, `despachado`, `listo_retiro`, `entregado`), empresa de transporte (Starken / Chilexpress) y código de seguimiento oficial (`tracking_number`).
3. **Respaldo y Facturación SII:** Descargar o consultar los datos de facturación electrónica asociados a su RUT.
4. **Vinculación Inteligente Retroactiva:** Si un usuario compró ayer como **invitado** con su correo `pedro@gmail.com` y hoy decide ingresar con Google con ese mismo correo, el sistema enlazará automáticamente sus compras anteriores para que no pierda ningún pedido.

---

## 2. Análisis Exhaustivo de la Base de Datos (Supabase)

### ¿Hace falta crear tablas nuevas en la base de datos?
**NO.** Crear una tabla adicional (como `order_history` o `user_orders`) resultaría redundante y desnormalizaría la arquitectura.

#### Justificación Técnica:
1. **Relación Nativa 1 a N ya Existente:**
   * La tabla `public.customers` ya posee `auth_user_id UUID REFERENCES auth.users(id)`.
   * La tabla `public.orders` ya posee `customer_id UUID REFERENCES public.customers(id)`.
   * Para listar las órdenes de un usuario autenticado solo se requiere:
     ```sql
     SELECT o.* 
     FROM public.orders o
     JOIN public.customers c ON o.customer_id = c.id
     WHERE c.auth_user_id = auth.uid() OR c.email = auth.email()
     ORDER BY o.created_at DESC;
     ```
2. **Ciclo Logístico Completo ya Soportado:**
   * La tabla `public.orders` (actualizada en la migración `20260912_orders_logistics.sql`) ya cuenta con:
     - `order_status` ('preparacion', 'despachado', 'listo_retiro', 'entregado', 'cancelado').
     - `tracking_number` (Número de guía/flete de Starken o Chilexpress).
     - `courier` (Nombre del transportista).
     - `shipped_at` (Fecha y hora de entrega al courier).
     - `ready_pickup_at` (Fecha y hora de disponibilidad en oficina técnica).
     - `admin_notes` (Notas de servicio o indicaciones técnicas).

### Campos Opcionales / Recomendados para Agregar a `public.orders`
Para llevar la experiencia del portal al estándar de la industria, se propone una migración DDL ligera (`20260912_orders_customer_portal.sql`):
```sql
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS invoice_folio TEXT,       -- Folio oficial de Factura/Boleta SII
  ADD COLUMN IF NOT EXISTS invoice_url TEXT,         -- Enlace al PDF tributario del SII
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ; -- Fecha de recepción efectiva (cálculo de garantía 3x3)
```
* **`invoice_folio` / `invoice_url`:** Permite al cliente descargar su factura digital directamente desde su historial.
* **`delivered_at`:** Marca el inicio exacto del periodo de garantía legal de 90 días (3 meses) estipulado por SERNAC y la política de garantías de SERVITECNOLOGY.

---

## 3. Flujo de Usuario y Pantalla `/mis-pedidos`

### A. Detección de Estado de Sesión (Cliente / SSR)
* **Estado 1: Usuario No Autenticado:**
  - Hero Cyberpunk con mensaje persuasivo:
    > *"Accede a tu cuenta de SERVITECNOLOGY para revisar el estado de tus despachos, números de seguimiento en vivo y tus facturas electrónicas."*
  - Botón de Google OAuth de 1 clic: `[ Iniciar Sesión con Google ]`.
* **Estado 2: Usuario Autenticado:**
  - Saludo personalizado: *"Hola, [Nombre] (cliente@correo.cl)"*.
  - Badge de cuenta verificada.
  - Botón de *"Cerrar Sesión"*.

### B. Listado Interactivo de Pedidos
Cada pedido se despliega en una tarjeta estética con:
1. **Encabezado:** Código de Orden (`ST-2026-XXXX`), fecha formateada en español y badge de pago (`Aprobado` en verde fluorescente).
2. **Barra de Progreso Logístico:**
   - Línea de tiempo visual interactiva:
     `[1. Recibido / Pagado] ➔ [2. En Preparación Técnica] ➔ [3. En Tránsito / Listo Retiro] ➔ [4. Entregado]`
3. **Caja de Transporte / Retiro:**
   - Si es **Envío Nacional por Pagar:** Muestra Courier (Starken / Chilexpress), Número de Seguimiento con botón para copiar al portapapeles y fecha de despacho.
   - Si es **Retiro en Oficina:** Muestra dirección de Santiago Centro y confirmación de disponibilidad técnica.
4. **Desglose de Repuestos:**
   - Miniaturas de los repuestos, SKU, título, cantidad comprada y total en CLP.
5. **Acciones Rápidas:**
   - Botón *"Ver Detalle Completo / Factura"*: Conduce a `/pedido/ST-2026-XXXX`.
   - Botón *"Ayuda por WhatsApp"*: Abre `wa.me/569...` con mensaje pre-rellenado: *"Hola SERVITECNOLOGY, requiero soporte sobre mi pedido ST-2026-XXXX"*.

### C. Acceso desde el Menú de Navegación (`Header.astro`)
* Se agrega un componente reactivo en `Header.astro`:
  - Si hay sesión: Muestra avatar/nombre con enlace directo a *"Mis Pedidos"*.
  - Si no hay sesión: Botón discreto *"Mi Cuenta"*.

---

## 4. Arquitectura de Endpoints Backend

### [NEW] `src/pages/api/account/orders.ts` (GET)
1. **Validación de Autenticación:**
   - Lee el `Authorization: Bearer <token>` de Supabase Auth o la cookie de sesión.
   - Valida el token con `supabase.auth.getUser(token)`.
   - Si no es válido, retorna HTTP 401 (`No autenticado`).
2. **Vinculación Inteligente Retroactiva:**
   - Busca en `public.customers` si existe un registro donde `email = user.email` y `auth_user_id IS NULL`.
   - Si existe, ejecuta:
     ```typescript
     await supabaseAdmin
       .from('customers')
       .update({ auth_user_id: user.id, customer_type: 'registrado' })
       .eq('email', user.email);
     ```
   - Esto une de inmediato cualquier compra anterior que el cliente haya realizado como invitado.
3. **Consulta de Órdenes:**
   - Obtiene todos los `customer_id` asociados a este usuario (por `auth_user_id` o `email`).
   - Consulta `public.orders` filtrando por esos `customer_id`, ordenados por `created_at DESC`.
   - Retorna la lista formateada en JSON.

---

## 5. Plan de Pruebas Automatizadas (Vitest)

Se creará la suite:
📁 `tests/account/customer-orders.test.ts`

### Casos de Prueba:
1. **Rechazo Sin Autenticación (401):** Valida que una petición a `/api/account/orders` sin cabecera de autenticación sea rechazada con 401.
2. **Listado de Órdenes del Usuario:** Simula una petición con usuario autenticado y verifica que solo retorne las órdenes correspondientes a su perfil.
3. **Vinculación Automática de Pedidos de Invitado:** Inserta una orden como invitado con email `test_invitado@correo.cl`, simula el registro de ese usuario con Google, y valida que `/api/account/orders` retorne la orden previa vinculada.
4. **Validación de Campos Logísticos y Facturación:** Valida que el payload contenga `order_status`, `tracking_number`, `courier`, `shipped_at`, `invoice_folio`.

---

## 6. Criterios de Aceptación

- [ ] La ruta `/mis-pedidos` es accesible y responsiva en escritorio y móviles.
- [ ] Muestra pantalla explicativa si el usuario no ha iniciado sesión, con botón Google OAuth.
- [ ] Tras iniciar sesión, despliega el historial completo de pedidos con sus estados logísticos y números de flete.
- [ ] Vinculación retroactiva automática: pedidos de invitado previos con el mismo correo se reflejan en la cuenta.
- [ ] Header actualizado con acceso directo a "Mis Pedidos".
- [ ] La suite de pruebas `customer-orders.test.ts` pasa al 100% con `npm test`.
- [ ] Compilación de producción (`npm run build`) limpia y sin errores de TypeScript.
