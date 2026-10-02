# Plan Técnico de Implementación: Doble Conciliación de Pagos MP, Actualización Reactiva de Comprador y N° de Operación en CRM

> **Documento:** Plan Técnico de Implementación (Gate 2 SDD)  
> **Ubicación:** `.agents/plans/conciliacion-pedidos-mp-crm.md`  
> **Espec Asignada:** `.agents/specs/conciliacion-pedidos-mp-crm.md`  
> **Estado:** Pendiente de Aprobación Humana (Gate 3) 🛑  
> **Fecha:** 2026-10-01  

---

## 1. Arquitectura y Enfoque de Diseño

Para resolver de raíz los 3 problemas sin duplicación de código ni riesgo de condiciones de carrera:

1. **Servicio Unificado de Conciliación (`src/lib/order-reconciliation.ts`):**
   - Crearemos una función centralizada e idempotente `reconcileApprovedOrder({ orderId, paymentId })`.
   - Verifica si la orden ya fue aprobada (si ya lo está, retorna sin duplicar acciones).
   - Actualiza `payment_status = 'aprobado'` y `mp_payment_id = paymentId`.
   - Decrementa el stock en `repuestos_productos` para cada SKU.
   - Envía el correo de confirmación a través de `sendOrderConfirmationEmail`.
   - Esta función será invocada tanto por el **Webhook** (`/api/mercadopago/webhook`) como por la **pantalla de retorno** (`/pedido/[id].astro`).
2. **Corrección de Persistencia en `/api/mercadopago/create-preference.ts`:**
   - Si `customerPayload` viene en el request, se actualizará el registro en `public.customers` (nombre, rut/pasaporte, teléfono, dirección) ya sea que el cliente haya sido ubicado por `customer_id` (Google Auth) o por RUT/email.
3. **Mejoras en el Panel Administrativo (`/meson-servitecnology-st/pedidos/index.astro`):**
   - En la columna "Estado Pago", desplegar `MP #<mp_payment_id>` para pedidos aprobados por pasarela.
   - Incorporar `mp_payment_id` en el array de búsqueda del buscador reactivo en cliente.
   - Mostrar el N° de Operación en el modal de detalle del pedido con botón de copiado.
4. **Buzón Vendedor en `src/lib/mailer.ts`:**
   - Asegurar que `sendOrderConfirmationEmail` incluya en `bcc` tanto a `notificaciones@servitecnology.com` como a `contacto@servitecnology.com`.

---

## 2. Mapa de Archivos Afectados

| Operación | Ruta del Archivo | Responsabilidad |
| :--- | :--- | :--- |
| `[NEW]` | `src/lib/order-reconciliation.ts` | Función unificada, atómica e idempotente para aprobar orden, decrementar stock y enviar correos |
| `[MODIFY]` | `src/pages/pedido/[id].astro` | Ejecutar conciliación en servidor si la URL trae `collection_status=approved` y la orden está pendiente |
| `[MODIFY]` | `src/pages/api/mercadopago/webhook.ts` | Delegar la aprobación al servicio unificado `reconcileApprovedOrder` |
| `[MODIFY]` | `src/pages/api/mercadopago/create-preference.ts` | Actualizar siempre `customers` con `customerPayload` aunque exista `customer_id` |
| `[MODIFY]` | `src/pages/meson-servitecnology-st/pedidos/index.astro` | Mostrar `mp_payment_id` en la tabla, en el buscador y en el modal de detalles |
| `[MODIFY]` | `src/lib/mailer.ts` | Añadir `contacto@servitecnology.com` en copia oculta al vendedor |
| `[NEW]` | `tests/checkout/order-reconciliation.test.ts` | Pruebas unitarias de idempotencia, conciliación, descuento de stock y actualización de cliente |

---

## 3. Estrategia de Testing y Verificación (Vitest)

Se creará la suite `tests/checkout/order-reconciliation.test.ts` que validará:
1. **Prueba de Idempotencia:** Invocar la conciliación dos veces seguidas sobre la misma orden debe ejecutar el descuento y el correo sólo en la primera ocasión.
2. **Prueba de Actualización de Cliente en Checkout:** Enviar `createPreference` con `customer_id` existente y un `customerPayload` con nombre/RUT modificado debe reflejar los nuevos datos en la tabla `customers`.
3. **Prueba de Conciliación de Retorno:** Simular llamada de retorno con parámetros de Mercado Pago `approved` y verificar que la orden pase a `aprobado` y guarde el `mp_payment_id`.
4. **Ejecución de Suite Completa:** `npm test` con 0 errores en todos los módulos.
5. **Compilación de Producción:** `npm run build` sin errores de tipos en Astro y TypeScript.

---

## 4. Criterio de Parada Humana Obligatoria (Gate 3)

> [!CAUTION]
> Conforme al estándar de gobernanza **SDD (Hard Code-Gates)** de este repositorio, el agente tiene **ESTRICTAMENTE PROHIBIDO** modificar o crear código de producción en este turno. Debe detenerse aquí y solicitar la autorización explícita del usuario para iniciar la fase de implementación.
