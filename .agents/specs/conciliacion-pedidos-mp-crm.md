# Especificación Funcional: Doble Conciliación de Pagos MP, Actualización Reactiva de Comprador y Trazabilidad de N° de Operación en CRM

> **Documento:** Especificación Funcional (Gate 1 SDD)  
> **Ubicación:** `.agents/specs/conciliacion-pedidos-mp-crm.md`  
> **Módulos:**  
> - `/pedido/[id]` (Pantalla de Confirmación de Retorno de Checkout)  
> - `/api/mercadopago/create-preference` (Creación de Preferencia y Persistencia de Cliente)  
> - `/meson-servitecnology-st/pedidos` (Panel Administrativo de Gestión de Pedidos)  
> - `/api/mercadopago/webhook` (Webhook Asíncrono de Mercado Pago)  
> **Estado:** Implementado y Certificado ✅  
> **Fecha:** 2026-10-01  

---

## 1. Problema y Fricciones Identificadas

1. **Dependencia Unilateral del Webhook para Notificaciones y Aprobación:**
   - Actualmente, la transición de una orden a `payment_status = 'aprobado'`, el descuento definitivo de stock y el envío de correos transaccionales (`sendOrderConfirmationEmail`) dependen exclusivamente del endpoint `/api/mercadopago/webhook`.
   - Si el webhook no está configurado en el panel de Mercado Pago, o sufre latencia/bloqueo de red, la orden permanece indefinidamente en `payment_status = 'pendiente'` en la base de datos (con `mp_payment_id = null`), a pesar de que el cliente ya pagó y la pantalla `/pedido/[id]` muestra el banner verde de éxito. En consecuencia, **ni el comprador ni el vendedor reciben el correo de confirmación de venta**.
2. **Pérdida de Actualización de Datos del Comprador en Checkout:**
   - En `/checkout`, si un usuario registrado con Google modifica sus datos en la Sección 2 ("Datos del Comprador & Facturación SII") (por ejemplo, cambia su nombre, actualiza su RUT o ingresa un número de Pasaporte extranjero), el backend `/api/mercadopago/create-preference` detecta que el cliente ya existe por su `customer_id` y omite por completo la actualización de los campos recibidos en `customerPayload`.
   - Como resultado, la orden queda vinculada al perfil antiguo y en `/meson-servitecnology-st/pedidos` la columna **"Cliente & RUT"** muestra los datos obsoletos en lugar de los ingresados para la facturación actual.
3. **Falta de Visibilidad del N° de Operación de Mercado Pago en el Panel de Pedidos:**
   - En la tabla de `/meson-servitecnology-st/pedidos`, las órdenes aprobadas muestran únicamente la etiqueta "Aprobado", pero no visualizan el identificador de transacción bancaria de Mercado Pago (`mp_payment_id`, ej: `180918033851`).
   - El administrador de taller no puede conciliar de un vistazo el dinero en su cuenta de Mercado Pago con la orden física sin abrir Mercado Pago por separado, ni buscar órdenes directamente por dicho número de operación.

---

## 2. Solución Funcional Propuesta

### A. Doble Conciliación Automática (Webhook + Retorno en `/pedido/[id]`)
- Al cargar la página de confirmación `/pedido/[id]`, el servidor (SSR) detecta si los parámetros de Mercado Pago indican aprobación (`collection_status=approved` o `status=approved` o `payment=success`) y existe un ID de transacción (`collection_id` o `payment_id`).
- Si la orden en la base de datos aún se encuentra en estado `pendiente`, el servidor consulta en tiempo real a la API de Mercado Pago (`new Payment(mpClient).get({ id })`).
- Si Mercado Pago confirma el estado `approved`:
  1. Actualiza atómicamente la orden en Supabase: `payment_status = 'aprobado'` y `mp_payment_id = String(collectionId)`.
  2. Descuenta el stock físico en `repuestos_productos` para cada item del pedido.
  3. Despacha el correo de confirmación formal tanto al **comprador** (`to: customer.email`) como al **vendedor** (`bcc: notificaciones@servitecnology.com` y `contacto@servitecnology.com`).
- Si el webhook de Mercado Pago ya procesó la orden previamente, la conciliación detecta que ya está `aprobado` y actúa de forma idempotente sin duplicar descuentos ni correos.

### B. Persistencia y Actualización Reactiva del Comprador en `/checkout`
- En `/api/mercadopago/create-preference`, independientemente de si el cliente ya existe por `customer_id`, por `rut` o por `email`, el sistema **SIEMPRE actualizará** los datos del perfil con la información enviada en el formulario de facturación:
  - Nombre completo / Razón Social.
  - RUT o Pasaporte (según `identification_type`).
  - Teléfono de contacto.
  - Dirección y comuna.
- Si el cliente es nuevo (invitado sin cuenta), se crea su registro con estos mismos datos.
- De este modo, la orden y la vista administrativa reflejan exactamente los datos actualizados que el comprador declaró para su boleta/factura.

### C. Visualización y Búsqueda de N° Operación MP en `/meson-servitecnology-st/pedidos`
- En la tabla del panel administrativo de pedidos, la columna **"Estado Pago"** para compras aprobadas desplegará:
  - Badge verde: `● Aprobado`
  - Subtítulo en monospace: `MP #180918033851` con enlace rápido o tooltip.
- En el modal de gestión de la orden (`modal-order-details`), se añade una fila dedicada: **"N° Operación Mercado Pago:"** con botón de copiado rápido.
- La barra de búsqueda superior del panel de pedidos admitirá filtrar directamente por el número de operación de Mercado Pago (`mp_payment_id`).

---

## 3. Requisitos en Sintaxis EARS

- **[EARS-001] WHEN** el cliente retorna a la URL `/pedido/[id]` con parámetros `collection_status=approved` y la orden en Supabase tiene `payment_status = 'pendiente'`, **THE SYSTEM SHALL** consultar la API oficial de Mercado Pago para verificar la autenticidad del pago.
- **[EARS-002] IF** Mercado Pago confirma que el pago está en estado `approved`, **THEN THE SYSTEM SHALL** actualizar la orden a `payment_status = 'aprobado'`, registrar `mp_payment_id`, decrementar el stock en `repuestos_productos` y enviar el correo de confirmación de compra al comprador y al vendedor.
- **[EARS-003] WHERE** la orden en la base de datos ya se encuentra en estado `aprobado`, **THE SYSTEM SHALL NOT** decrementar stock nuevamente ni reenviar el correo de confirmación (Idempotencia estricta).
- **[EARS-004] WHEN** el usuario envía el formulario en `/checkout` hacia `/api/mercadopago/create-preference`, **THE SYSTEM SHALL** actualizar en `public.customers` el nombre, documento (RUT o pasaporte), teléfono y dirección del cliente, incluso cuando el `customer_id` ya existía previamente en la base de datos.
- **[EARS-005] WHERE** el administrador visualiza la tabla en `/meson-servitecnology-st/pedidos`, **THE SYSTEM SHALL** mostrar el `mp_payment_id` en las órdenes aprobadas por Mercado Pago.
- **[EARS-006] WHEN** el administrador ingresa un número de operación de Mercado Pago en el buscador de pedidos, **THE SYSTEM SHALL** filtrar y listar las órdenes coincidentes.
- **[EARS-007] WHERE** se envía el correo de confirmación `sendOrderConfirmationEmail`, **THE SYSTEM SHALL** incluir como destinatarios a `data.customerEmail` y en copia oculta de respaldo a `notificaciones@servitecnology.com` y `contacto@servitecnology.com`.

---

## 4. Definition of Done (DoD)

- [x] La página `/pedido/[id].astro` ejecuta la conciliación automática en servidor si el webhook aún no ha procesado el pago.
- [x] La orden de prueba `ST-2026-5915` queda debidamente aprobada con su `mp_payment_id` registrado (`180918033851`).
- [x] `/api/mercadopago/create-preference.ts` actualiza siempre los datos del cliente con los valores del formulario de facturación actual.
- [x] La tabla de `/meson-servitecnology-st/pedidos` muestra el N° de Operación MP en las órdenes aprobadas.
- [x] El buscador de pedidos permite encontrar órdenes por `mp_payment_id`.
- [x] El modal de detalle de orden muestra el N° de Operación MP.
- [x] Las pruebas automatizadas en `tests/` cubren la doble conciliación y la actualización de cliente sin regresiones.
- [x] `npm test` aprueba el 100% de las suites de prueba (133/133 tests).
- [x] `npm run build` compila con 0 errores de TypeScript.
