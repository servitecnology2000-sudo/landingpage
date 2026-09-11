# Plan Maestro: E-commerce MVP Automatizado (Mercado Pago + Autenticación)

> **Documento: Plan Maestro / Vista General de Arquitectura**  
> **Ubicación:** `docs/DesarrolloEcommerce/implementation_plan.md`  
> **Propósito:** Actúa como el **Single Source of Truth** de alto nivel para el MVP de comercio electrónico de SERVITECNOLOGY, definiendo la visión global, el estado de la infraestructura y el índice hacia los planes de implementación detallados por cada fase técnica.

---

## Objetivo General
Permitir a los clientes armar su carrito de repuestos libremente como invitados, iniciar sesión rápidamente con Google (Supabase Auth), ingresar de forma obligatoria sus datos de facturación SII y logística al final del checkout, y pagar con Mercado Pago Checkout Pro (links de pago dinámicos), automatizando el cobro, la conciliación mediante webhooks, la actualización de stock en tiempo real y el envío de notificaciones por correo.

---

## Estado de Infraestructura y Base de Datos (Paso 0: COMPLETADO ✅)

La migración ha sido **aplicada con éxito** en el proyecto Supabase `servitecnology2000` (`mivsnmvupahgbrjfdyhl`):
1. **Tabla `customers`:** Creada con clave primaria `id` vinculada directamente a `auth.users(id)` (`ON DELETE CASCADE`), con campos `full_name`, `email`, `phone`, `rut`, `address` y políticas RLS activadas.
2. **Tabla `orders`:** Creada con formato de pedido `ST-2026-XXXX`, campos `mp_preference_id`, `mp_payment_id`, estados de pago (`pendiente`, `en_revision`, `aprobado`, `rechazado`, `cancelado`), reserva de stock y políticas RLS activadas.
3. **Script SQL de respaldo:** Registrado en [`supabase/migrations/20260910_ecommerce_mvp_auth_mp.sql`](file:///home/angel/Developer/landingpage/supabase/migrations/20260910_ecommerce_mvp_auth_mp.sql).

---

## Principios y Decisiones Clave Aprobadas

1. **Flujo de Usuario (Invitado -> Checkout con Google OAuth):**
   - El cliente navega por el catálogo y arma su carrito sin fricción como invitado.
   - Al hacer clic en "Continuar al Pago" en el checkout, se solicita iniciar sesión con Google mediante Supabase Auth.
   - Una vez autenticado, se le exige completar de forma obligatoria su **RUT (para Factura SII), Teléfono móvil, Comuna y Dirección exacta de despacho**. Estos datos se persisten en la tabla `customers`.
2. **Logística y Envíos (Cobro en Destino):**
   - **Tanto para la Región Metropolitana como para Regiones:** Se implementa la modalidad **"Envío por Pagar / Cobro en Destino"** (vía Starken / Chilexpress).
   - **Costo en Pasarela:** En Mercado Pago se cobra **$0 por concepto de flete** (el cliente solo paga el producto a Servitecnology).
   - **Transparencia en la Interfaz:** Se despliega un cálculo y tabla de **valores estimados referenciales de envío** (RM ~$3.990 - $4.990, Regiones ~$5.990 - $9.990) con aviso explícito indicando que el flete exacto se cancela directamente a la empresa de transporte al recibir el paquete.
   - **Retiro Presencial:** Se mantiene la alternativa **Retiro en Oficina Técnica ($0)** en Santiago Centro.
3. **Integración Mercado Pago:**
   - La arquitectura y endpoints quedan 100% implementados utilizando variables de entorno (`MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`). En cuanto Mercado Libre apruebe las credenciales, solo se deben pegar en el `.env` local y en el dashboard de Vercel.
4. **Notificaciones Transaccionales:**
   - Confirmación, resumen de orden y detalles de despacho enviados automáticamente al cliente utilizando la cuenta oficial remitente **`notificaciones@servitecnology.com`**.

---

## Desglose y Roadmap de Planes Detallados

Para mantener un control riguroso y sin sobrecarga cognitiva, cada etapa del desarrollo cuenta con un **Plan de Implementación Detallado** en esta misma carpeta:

```text
docs/DesarrolloEcommerce/
├── implementation_plan.md               <-- Este documento (Plan Maestro Global)
├── fase-1-auth-checkout.md              <-- FASE 1: Auth Google, Invitados, Formulario Obligatorio y Envíos por Pagar (ACTUAL)
├── fase-2-mercadopago-api.md            <-- FASE 2: SDK Mercado Pago, Validación de Stock y Generación de Preferencias
└── fase-3-webhooks-notificaciones.md    <-- FASE 3: Webhooks de Confirmación, Descuento de Stock y Correo Transaccional
```

### Resumen de Fases:
- **[Fase 1: Flujo de Autenticación Supabase & Checkout con Cobro en Destino](file:///home/angel/Developer/landingpage/docs/DesarrolloEcommerce/fase-1-auth-checkout.md):**  
  Implementación del botón Google OAuth en el frontend, formulario de captura obligatoria de datos de despacho/facturación (`customers`), actualización del selector de entrega a "Cobro en Destino" con tabla de valores referenciales y conexión del checkout. (COMPLETADA ✅)
- **[Fase 2: Endpoint de Creación de Preferencia Mercado Pago](file:///home/angel/Developer/landingpage/docs/DesarrolloEcommerce/fase-2-mercadopago-api.md):**  
  Instalación del SDK `mercadopago`, creación de API Route `/api/mercadopago/create-preference`, validación estricta de precios y stock en servidor contra `repuestos_productos`, registro de orden `pendiente` y obtención de `init_point`.
- **Fase 3: Webhook Automatizado & Correo de Notificación (`fase-3-webhooks-notificaciones.md`):**  
  Creación de endpoint `/api/mercadopago/webhook`, verificación de firma criptográfica, actualización de estado a `aprobado`, decremento definitivo de stock e integración de envío de email automático desde `notificaciones@servitecnology.com`.

---

## Checklist Global de Pre-Requisitos

- [x] Conexión y token MCP de Supabase validado y funcional.
- [x] Migración SQL ejecutada (`customers` y `orders` creados en Supabase con RLS).
- [x] Activar proveedor Google en el panel de Supabase Auth (`external_google_enabled: true`).
- [x] Implementar Fase 1 (Auth Google + Captura Obligatoria de Datos SII + Cobro en Destino).
- [x] Instalar dependencia de Mercado Pago (`mercadopago`).
- [x] Implementar Fase 2 (SDK Mercado Pago + Endpoint de Preferencias Dinámicas Anti-fraude).
- [x] Implementar Fase 3 (Webhook de Confirmación, Descuento de Stock & Notificaciones por Email).
- [ ] En cuanto Mercado Libre apruebe las credenciales: pegar `MERCADOPAGO_ACCESS_TOKEN` en `.env` y Vercel.
