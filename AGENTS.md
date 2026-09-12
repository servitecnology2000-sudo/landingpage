## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)


# SERVITECNOLOGY - Estado del Proyecto y Memoria del Agente

## 🚀 Arquitectura Actual del Ecosistema
- **Plataforma Web:** E-commerce corporativo y catálogo técnico de alta fidelidad desplegado en Vercel sobre Astro 5 (SSR con adaptador `@astrojs/vercel`).
- **Dominio Canónico:** `https://servitecnology.com` (con soporte en Vercel staging).
- **Estilos:** Tailwind CSS 4 con diseño oscuro de alto contraste, acentos fluorescentes (`brand-green`, `brand-cyan`, ámbar y esmeralda) y soporte para carruseles táctiles y marquesinas infinitas.
- **Base de Datos & Autenticación:** Supabase (ID de referencia: `mivsnmvupahgbrjfdyhl`).
  - `repuestos_productos`: Inventario con SKU, stock numérico (`stock_cantidad`), precios de venta/costo, imágenes, slugs y metadatos SEO.
  - `customers`: Perfiles de clientes sincronizados con `auth.users`, campos de contacto, RUT para facturación electrónica y direcciones de despacho.
  - `orders`: Órdenes de compra con identificador único legible (`ST-2026-XXXX`), items JSONB, tipos de entrega (`retiro`, `envio_nacional`), costos de flete, estados de pago (`pendiente`, `aprobado`, `rechazado`, `cancelado`), estados de orden (`preparacion`, `despachado`, `entregado`) y referencias de Mercado Pago (`mp_preference_id`, `mp_payment_id`).
  - `metricas_eventos`: Tracking analítico de clics y visitas.
  - `trabajos_galeria`: Portafolio dinámico de trabajos realizados por categoría técnica.
- **Storage:** Buckets públicos en Supabase: `imagenes-repuestos` y `trabajos_galeria`.
- **Pasarela de Pagos (Mercado Pago Chile MLC):**
  - Checkout Pro mediante SDK oficial `@mercadopago/sdk-nodejs` (`Preference` y conciliación de `Payment`).
  - Servidor MCP oficial de Mercado Pago (`https://mcp.mercadopago.com/mcp`) integrado en `.agents/mcp_config.json`.
  - Soporte para dos modalidades: **Transferencia Bancaria Manual** (BancoEstado con temporizador de reserva de 2 horas) y **Mercado Pago** (tarjetas de crédito, débito y dinero en cuenta).
  - Manejo de entorno dual (Sandbox con aislamiento de comprador de prueba y Producción).
  - Notificaciones Webhook (`/api/mercadopago/webhook`) con validación de idempotencia, conciliación automática con la API de Mercado Pago, actualización de orden en Supabase, descuento atómico de stock y envío automatizado de correos transaccionales con plantilla HTML formal para Facturación Electrónica SII.
- **Servicio de Notificaciones por Email:** Nodemailer con transporte SMTP corporativo (`notificaciones@servitecnology.com`) para confirmaciones de compra instantáneas.

## 🛠️ Rutas y Módulos Activos
1. **Rutas Públicas:**
   - `/`: Landing page principal (Hero, Servicios técnicos, Repuestos destacados).
   - `/ecommerce` (alias `/repuestos`): Catálogo universal con buscador multicriterio en vivo (SKU, marca, modelo, descripción) y carrito de compras flotante.
   - `/repuesto/[slug]`: Ficha de producto con microdatos schema `Product`, galería de fotos y botón de compra.
   - `/checkout`: Flujo de checkout en dos pasos (Autenticación/Datos del cliente con RUT obligatorio y selector de entrega, seguido de selección de medio de pago: Transferencia Bancaria o Mercado Pago).
   - `/pedido/[id]`: Pantalla de confirmación y seguimiento post-compra con discriminación condicional (`isPaid`):
     - **Pago Aprobado (Mercado Pago):** UI verde esmeralda con stock 100% asegurado, número de operación oficial de MP, detalles de despacho/retiro, garantía 3x3 y botón directo de soporte por WhatsApp. Oculta el temporizador de cuenta regresiva.
     - **Pendiente de Transferencia:** UI ámbar con instrucciones oficiales de BancoEstado, RUT empresarial, código obligatorio de glosa y temporizador regresivo de reserva temporal de 2 horas.
   - `/canal-de-youtube`: Integración con YouTube Data API v3 y reproductor modal de videos y reparaciones del taller.
   - `/terminos`, `/privacidad`, `/garantias`: Páginas legales conformes a normativas SERNAC y directrices del SII.
2. **Ruta Administrativa Privada (`/meson-servitecnology-st`):**
   - Panel de control ofuscado protegido por clave maestra (`ADMIN_SECRET`) y Supabase Auth.
   - Gestión CRUD completa de repuestos, control de inventario con toggle de producto agotado, carga masiva de imágenes a Supabase Storage y edición de galería de trabajos.

## 💳 Reglas Técnicas de Mercado Pago en Sandbox Chile (MLC)
- **Documento del Titular en Formularios:** En el selector desplegable de documento de Checkout Pro en Chile, debe seleccionarse siempre **`Otro`** (no `RUT`) e ingresar **`123456789`**. Ingresar un RUT con tarjetas de prueba activa validaciones bancarias reales y genera el error `UNDEFINED SOURCE` o rechazo de tarjeta.
- **Simulación de Estados:** En las pruebas con tarjetas sandbox (`5416 7526 0258 2580`), el nombre del titular controla el resultado: `APRO` (aprobado), `FUND` (fondos insuficientes), `CONT` (pendiente/autorización), `SECU` (código de seguridad inválido), etc.
- **Aislamiento de Sesión:** En modo sandbox, el backend inyecta automáticamente el email del comprador de pruebas (`ML_PRUEBAS_COMPRADOR_EMAIL`) en el payer de la preferencia para evitar conflictos con la cuenta real de Mercado Libre del vendedor.

## 📋 Regla de Actualización Obligatoria para el Agente
- **Actualización Inmediata de 'CHANGELOG.md':** CADA VEZ que realice un cambio, actualización de código, refactorización o despliegue en este proyecto, DEBO actualizar inmediatamente el archivo `CHANGELOG.md` antes de finalizar la tarea, registrando los cambios en el historial de versiones.
- **Orden del CHANGELOG.md (Estándar de la Industria):** El archivo debe mantener un **Orden Cronológico Inverso estricto (Reverse Chronological Order)**:
  - **Lo más NUEVO SIEMPRE va ARRIBA (al principio del archivo)**, inmediatamente debajo del título `# Historial de Versiones`.
  - Lo más ANTIGUO permanece abajo (al final del archivo).
  - Nunca agregar entradas nuevas al final del archivo; siempre insertarlas como el primer elemento de la lista.