# Fase 2: Gestor de Clientes & Directorio CRM con CRUD Completo

> **Documento: Plan de Implementación Detallado - Fase 2**  
> **Ubicación:** `docs/ModulosAdmin/fase-2-gestion-clientes.md`  
> **Plan Maestro de Referencia:** [`docs/ModulosAdmin/plan-maestro-fase1.md`](file:///home/angel/Developer/landingpage/docs/ModulosAdmin/plan-maestro-fase1.md)  
> **Módulo:** `/meson-servitecnology-st/clientes`  
> **Estado:** COMPLETADO Y CERTIFICADO ✅  

---

## 1. Justificación y Objetivos de la Fase 2

El catálogo y checkout de SERVITECNOLOGY generan registros de compradores por diversas vías:
1. Clientes registrados mediante **Google OAuth** en Supabase Auth.
2. Clientes que compran como **invitados (Guest)** ingresando sus datos de facturación en el checkout.
3. Clientes presenciales o corporativos atendidos en el **mesón del taller técnico** que el administrador necesita registrar manualmente.

Actualmente, no existe un panel centralizado para visualizar a estos clientes, verificar su historial acumulado de compras, corregir errores en sus direcciones o contactarlos directamente ante dudas de servicio técnico y despacho.

### Objetivos Principales:
1. **Directorio CRM Unificado:** Construir la vista `/meson-servitecnology-st/clientes` sobre `AdminLayout.astro` con tabla interactiva, KPIs de fidelización y búsqueda en tiempo real.
2. **Soporte de Clientes Híbridos (Registrados, Invitados y Manuales):** Flexibilizar el esquema de Supabase para admitir perfiles creados sin requerir obligatoriamente una cuenta en `auth.users`.
3. **Métricas de Valor del Cliente (LTV):** Calcular en tiempo de ejecución el gasto total histórico por cliente (`orders.total_amount` aprobadas) y la cantidad de pedidos realizados.
4. **Atajo de Contacto Inmediato (WhatsApp Web):** Enlace dinámico `wa.me/569...` con número validado y saludo formal para coordinar entregas o soporte post-venta.
5. **Funcionalidad CRUD Completa:**
   - **Crear (Create):** Registrar clientes manualmente desde el panel con validación de RUT y teléfono Subtel.
   - **Leer (Read):** Listar clientes con buscador multicriterio e inspeccionar su historial de pedidos (`ST-2026-XXXX`).
   - **Actualizar (Update):** Corregir datos de facturación (RUT, Razón Social, Giro) y direcciones.
   - **Eliminar (Delete):** Borrar registros obsoletos con confirmación de seguridad.
6. **Aseguramiento de Calidad:** Suite de pruebas automatizadas con Vitest (`tests/admin/customers-api.test.ts`) cubriendo validación de RUT, seguridad y operaciones CRUD.

---

## 2. Paso 0: Actualización del Esquema en Supabase (Migración SQL)

### Problema Arquitectónico Actual:
En la migración original ([`20260910_ecommerce_mvp_auth_mp.sql`](file:///home/angel/Developer/landingpage/supabase/migrations/20260910_ecommerce_mvp_auth_mp.sql)), la clave primaria `id` de `customers` tiene una restricción estricta de clave foránea hacia `auth.users(id)`:
```sql
id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
```
Esto impide crear clientes manualmente o guardar compras de usuarios que no tengan sesión en Supabase Auth.

### Solución: Script `supabase/migrations/20260912_customers_crm.sql`
Se liberará la restricción foránea estricta de `id` asignándole un valor por defecto `gen_random_uuid()`, se agregará el campo opcional `auth_user_id` para vincular cuentas registradas, y se añadirán campos de facturación y CRM:

```sql
-- ============================================================
-- Migración: Directorio CRM y Flexibilización de Clientes
-- Proyecto: servitecnology2000 (mivsnmvupahgbrjfdyhl)
-- ============================================================

-- 1. Agregar columna para vincular Auth sin restringir la PK id
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Migrar id existentes a auth_user_id si aún no se ha hecho
UPDATE public.customers 
  SET auth_user_id = id 
  WHERE auth_user_id IS NULL;

-- 3. Configurar id para autogenerar UUID por defecto
ALTER TABLE public.customers 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. Agregar columnas de clasificación y facturación de empresa SII
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS customer_type TEXT NOT NULL DEFAULT 'registrado' 
    CHECK (customer_type IN ('registrado', 'invitado', 'manual')),
  ADD COLUMN IF NOT EXISTS razon_social TEXT,
  ADD COLUMN IF NOT EXISTS giro TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5. Índices para búsquedas rápidas en el CRM
CREATE INDEX IF NOT EXISTS idx_customers_rut ON public.customers(rut);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_type ON public.customers(customer_type);
```

> **Ejecución Automatizada:** El agente aplicará esta migración directamente usando `node scripts/apply-migration.mjs supabase/migrations/20260912_customers_crm.sql`.

---

## 3. Paso 1: Vista del Gestor de Clientes (`src/pages/meson-servitecnology-st/clientes/index.astro`)

### Arquitectura de Datos (SSR):
1. **Consulta Unificada:** Obtener todos los clientes ordenados por fecha de creación descendente.
2. **Cruce con Pedidos:** Obtener las órdenes registradas para calcular las métricas acumuladas por cliente en memoria:
   ```ts
   const { data: rawCustomers } = await supabaseAdmin
     .from('customers')
     .select('*')
     .order('created_at', { ascending: false });

   const { data: rawOrders } = await supabaseAdmin
     .from('orders')
     .select('id, customer_id, total_amount, payment_status, order_status, created_at');

   // Mapeo de agregación: pedidos y gasto por cliente
   const customerStatsMap = new Map();
   for (const ord of rawOrders || []) {
     if (!ord.customer_id) continue;
     const current = customerStatsMap.get(ord.customer_id) || { totalSpent: 0, orderCount: 0, orders: [] };
     if (ord.payment_status === 'aprobado') {
       current.totalSpent += Number(ord.total_amount) || 0;
     }
     current.orderCount += 1;
     current.orders.push(ord);
     customerStatsMap.set(ord.customer_id, current);
   }
   ```

3. **Tarjetas de KPIs Superiores:**
   - **Total de Clientes:** Conteo general en el CRM.
   - **Clientes Compradores:** Aquellos con al menos 1 orden aprobada.
   - **Clientes Recurrentes:** Clientes con 2 o más compras históricas.
   - **Ticket Promedio Global:** Gasto promedio por comprador en la tienda.

4. **Buscador y Filtros Dinámicos (Pills):**
   - Input de búsqueda en vivo: busca instantáneamente por RUT, Nombre, Teléfono, Correo o Dirección.
   - Píldoras de filtro rápido:
     - `Todos`
     - `Con Compras` (`orderCount > 0`)
     - `Registrados Google` (`customer_type === 'registrado'`)
     - `Invitados Web` (`customer_type === 'invitado'`)
     - `Manuales Taller` (`customer_type === 'manual'`)

5. **Tabla Responsiva de Clientes:**
   - **RUT:** Formateado formalmente (ej. `27.498.484-8`).
   - **Nombre / Razón Social:** Con indicación si es persona natural o empresa.
   - **Contacto Inmediato:**
     - Botón verde de **WhatsApp Web** (`https://wa.me/569XXXXXXXX?text=...`) con saludo de bienvenida preconfigurado.
     - Botón de correo `mailto:`.
   - **Tipo de Cliente:** Badge distintivo (Azul = Registrado, Violeta = Invitado, Esmeralda = Manual).
   - **Total Gastado (LTV):** Formateado en `$XX.XXX CLP` junto al número de pedidos asociados.
   - **Acciones:**
     - Botón `📜 Historial`: Abre el modal con las órdenes de este cliente.
     - Botón `✏️ Editar`: Abre el modal de edición de datos.
     - Botón `🗑️ Eliminar`: Confirmación antes de borrar.

---

## 4. Paso 2: Modales Interactivos

### Modal 1: Crear o Editar Cliente (`#customerFormModal`)
Permite al administrador añadir clientes presenciales del mesón o corregir errores de tipeo cometidos por compradores en el checkout.
- **Campos del Formulario:**
  - `full_name`: Nombre completo o Razón Social (Obligatorio).
  - `rut`: RUT chileno con validación en tiempo real (Módulo 11 SII).
  - `phone`: Teléfono de contacto con prefijo `+56 9` (Validación Subtel).
  - `email`: Correo electrónico (Obligatorio).
  - `address`: Dirección completa de despacho o domicilio.
  - `giro`: Giro comercial (Opcional, para facturación electrónica).
  - `customer_type`: Selector (`registrado`, `invitado`, `manual`).
  - `notes`: Notas internas de CRM (preferencias de repuestos, equipo que posee, etc.).
- **Feedback Visual:** Toast interactivo (`window.showAdminToast`) y recarga suave de tabla.

### Modal 2: Historial de Compras del Cliente (`#customerOrdersModal`)
Al presionar "Ver Historial", despliega una lista detallada con todas las órdenes del cliente:
- Código de Orden (`ST-2026-XXXX`).
- Fecha de compra.
- Total pagado ($ CLP).
- Badges de estado de pago (`aprobado`, `pendiente`) y despacho (`despachado`, `listo_retiro`).
- Enlace directo: *"Gestionar Pedido en Panel ➔"* que redirige al Gestor de Pedidos.

---

## 5. Paso 3: Endpoints API del Backend

Se crearán los endpoints seguros bajo `src/pages/api/admin/customers/`:

### 1. `POST /api/admin/customers/save.ts`
- **Seguridad:** Verificación de cookie `admin_session` contra `ADMIN_SECRET`.
- **Validaciones:**
  - Validación del RUT chileno mediante algoritmo Módulo 11.
  - Validación de campos obligatorios (`full_name`, `email`, `rut`).
  - Normalización de teléfono (`+569...`).
- **Persistencia:** Si recibe `id`, ejecuta `UPDATE`; si no, ejecuta `INSERT` con `customer_type: 'manual'` (o el seleccionado).
- **Respuesta:** `{ success: true, customer: savedRecord }`.

### 2. `POST /api/admin/customers/delete.ts`
- **Seguridad:** Verificación de cookie `admin_session`.
- **Integridad Referencial:** Antes de eliminar, desvincula las órdenes asociadas (`UPDATE orders SET customer_id = NULL WHERE customer_id = :id`) para preservar el historial financiero sin violar restricciones de clave foránea.
- **Respuesta:** `{ success: true, message: 'Cliente eliminado correctamente' }`.

---

## 6. Paso 4: Suite de Pruebas Automatizadas con Vitest

Se crearán las siguientes suites en `tests/`:

1. **`tests/lib/rut-validator.test.ts` (Unitario):**
   - Verificación de RUTs válidos con dígito numérico y con `K`.
   - Rechazo de RUTs con dígito verificador erróneo o longitud inválida.
   - Formateador formal con puntos y guion (`12.345.678-K`).
2. **`tests/admin/customers-api.test.ts` (Integración):**
   - 🔒 **Control de Acceso:** Rechazo con `401 Unauthorized` si no hay sesión admin válida.
   - ⚠️ **Validación de Datos:** Rechazo con `400 Bad Request` si el RUT es inválido o faltan campos obligatorios.
   - 💾 **Creación Exitosa:** Verificación de inserción de cliente manual.
   - ✏️ **Actualización Exitosa:** Modificación de dirección y notas de CRM.
   - 🗑️ **Eliminación Segura:** Borrado de cliente preservando la integridad de órdenes.

---

## 7. Paso 5: Plan de Verificación y Testing

1. **Migración SQL:**
   - Aplicar `20260912_customers_crm.sql` en Supabase en vivo y verificar con script de prueba.
2. **Pruebas Automatizadas:**
   - Ejecutar `npm test` asegurando que todas las suites (anteriores + nuevas de clientes) pasen al 100%.
3. **Flujo Visual en Navegador:**
   - Abrir `/meson-servitecnology-st/clientes`.
   - Probar la creación de un nuevo cliente manual desde el modal.
   - Probar la edición de datos de un cliente existente.
   - Verificar que el botón de WhatsApp abra correctamente el enlace `wa.me/569...`.
   - Probar los filtros por píldoras ("Con Compras", "Registrados", "Todos") y el buscador en tiempo real.
   - Abrir el modal de historial de compras y verificar que liste los pedidos de ese cliente.
4. **Compilación de Producción:**
   - Ejecutar `npm run build` certificando cero errores de sintaxis o tipos.
5. **Historial de Versiones:**
   - Registrar la finalización del módulo en [`CHANGELOG.md`](file:///home/angel/Developer/landingpage/CHANGELOG.md) en orden cronológico inverso.
