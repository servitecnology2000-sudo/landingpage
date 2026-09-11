# Plan de Implementación Detallado: Fase 3
## Webhook de Conciliación Automática Mercado Pago, Descuento de Inventario y Notificaciones por Correo

> **Documento:** Plan Detallado - Fase 3  
> **Ubicación:** `docs/DesarrolloEcommerce/fase-3-webhooks-notificaciones.md`  
> **Dependencias:** `mercadopago`, `nodemailer`, Supabase Client (`orders`, `repuestos_productos`, `customers`), Variables de Entorno (`MERCADOPAGO_WEBHOOK_SECRET`, `SMTP_HOST`, `SMTP_PASS`).  
> **Estado:** IMPLEMENTADO & VALIDADO ✅ (Compilación con 0 errores)

---

## 1. Objetivos de la Fase 3

1. **Endpoint de Webhook Seguro (`/api/mercadopago/webhook`):**
   - Recibir notificaciones en tiempo real de Mercado Pago (eventos `payment.created`, `payment.updated`).
   - Consultar el estado real del pago mediante el SDK oficial (`Payment.get({ id })`).
2. **Idempotencia y Anti-Duplicidad:**
   - Evitar procesar dos veces el mismo pago si Mercado Pago reintenta el webhook.
   - Si la orden ya está en estado `aprobado`, responder inmediatamente HTTP 200 sin volver a descontar inventario.
3. **Actualización de Orden y Descuento de Stock en Supabase:**
   - Localizar la orden en `public.orders` por su `external_reference` (`ST-2026-XXXX`).
   - Si el pago es aprobado (`status === 'approved'`):
     - Cambiar `payment_status` a `'aprobado'`.
     - Guardar el `mp_payment_id` para trazabilidad y conciliación financiera.
     - Decrementar el stock en tiempo real en la tabla `repuestos_productos` para cada SKU comprado.
   - Si el pago es rechazado o cancelado:
     - Actualizar `payment_status` a `'rechazado'` o `'cancelado'`.
4. **Envío de Correo Transaccional Oficial:**
   - Enviar un correo automatizado con diseño corporativo HTML desde **`notificaciones@servitecnology.com`** al email del cliente.
   - Incluir resumen del pedido, repuestos adquiridos, total pagado, datos de facturación SII y recordatorio de que el flete se paga en destino al courier.

---

## 2. Arquitectura del Flujo del Webhook

```text
[Mercado Pago] 
       │ (POST con payment.id)
       ▼
POST /api/mercadopago/webhook
       │
       ├─ 1. Extraer payment ID de query/body
       ├─ 2. Consultar API Mercado Pago: mpClient.payment.get(paymentId)
       │      - status: 'approved' | 'rejected' | 'pending'
       │      - external_reference: ST-2026-XXXX
       │
       ├─ 3. Buscar orden en public.orders donde id = external_reference
       │      - Si order.payment_status === 'aprobado' -> Retornar HTTP 200 (Idempotencia)
       │
       ├─ 4. Si status === 'approved':
       │      - UPDATE public.orders SET payment_status = 'aprobado', mp_payment_id = paymentId
       │      - Decrementar stock_cantidad en repuestos_productos por cada item
       │      - Obtener datos del cliente en public.customers
       │      - Disparar correo HTML desde notificaciones@servitecnology.com
       │
       ▼
Retorna HTTP 200 OK a Mercado Pago
```

---

## 3. Especificación Técnica

### 3.1 Módulo de Correo Transaccional (`src/lib/mailer.ts`)
- Configurado con `nodemailer` utilizando los parámetros oficiales SMTP de Servitecnology (`mail.leonesconsulting.com` / puerto 465 SSL o variables configurables).
- Remitente predeterminado: `Servitecnology Notificaciones <notificaciones@servitecnology.com>`.
- Plantilla HTML con estilos oscuros, tipografía moderna, desglose de ítems, aviso de factura electrónica SII y aclaratoria de cobro en destino para el flete.

### 3.2 Endpoint Webhook (`src/pages/api/mercadopago/webhook.ts`)
- Manejo de métodos `POST` y `GET` (para health check de Mercado Pago).
- Soporte para verificación de firma criptográfica mediante HMAC si `MERCADOPAGO_WEBHOOK_SECRET` está presente.
- Fallback seguro con logs descriptivos.

---

## 4. Archivos a Modificar / Crear

1. **[NEW] `src/lib/mailer.ts`:** Módulo de envío de correos transaccionales con plantilla HTML responsive de confirmación de compra.
2. **[NEW] `src/pages/api/mercadopago/webhook.ts`:** API Route del Webhook de Mercado Pago.
3. **[MODIFY] `CHANGELOG.md`:** Registro de la implementación de la Fase 3.
4. **[MODIFY] `docs/DesarrolloEcommerce/implementation_plan.md`:** Marcar Fase 3 como completada.
