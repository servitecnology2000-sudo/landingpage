---
description: Reglas críticas sobre arquitectura de base de datos Supabase, migraciones DDL autónomas y almacenamiento
trigger: model_decision
---

# Reglas de Base de Datos y Supabase

Este proyecto utiliza **Supabase** como motor relacional PostgreSQL, autenticación y storage de archivos.

---

## 1. Principios Clave y Configuración

- **ID del Proyecto:** `mivsnmvupahgbrjfdyhl` (`servitecnology2000`).
- **Token de Acceso Personal:** Configurado en `.agents/mcp_config.json` (`SUPABASE_ACCESS_TOKEN`).
- **Esquema de Tablas Principales:**
  - `repuestos_productos`: Inventario de catálogo con SKU, `stock_cantidad`, `precio_oferta`, `precio_normal`, imágenes, compatibilidad técnica, slugs y metadatos SEO.
  - `customers`: Perfiles de clientes sincronizados con `auth.users` o compras de invitado, campos de contacto, RUT obligatorio para facturación electrónica y direcciones de despacho.
  - `orders`: Órdenes de compra con identificador único legible (`ST-2026-XXXX`), items JSONB, tipos de entrega (`retiro`, `delivery_rm`, `envio_nacional`), costos de flete, estados de pago (`pendiente`, `aprobado`, `rechazado`, `cancelado`), ciclo logístico (`preparacion`, `despachado`, `listo_retiro`, `entregado`, `cancelado`), control de seguimiento (`tracking_number`, `courier`, `shipped_at`, `ready_pickup_at`, `admin_notes`) y referencias de Mercado Pago (`mp_preference_id`, `mp_payment_id`).
  - `metricas_eventos`: Tracking analítico de eventos, clics y visitas.
  - `trabajos_galeria`: Portafolio dinámico de trabajos realizados por categoría técnica.
- **Buckets Públicos de Storage:** `imagenes-repuestos` y `trabajos_galeria`.

---

## 2. Aplicación Autónoma de Migraciones DDL (Innegociable)

1. **Ubicación y Nomenclatura:** Todo cambio de esquema SQL debe guardarse en:
   `supabase/migrations/YYYYMMDD_nombre_descriptivo.sql`
2. **Ejecución Directa en Supabase en Vivo:**
   El agente debe aplicar las migraciones directamente utilizando el script de Management API:
   ```bash
   node scripts/apply-migration.mjs supabase/migrations/YYYYMMDD_nombre.sql
   ```
   o a través del servidor MCP de Supabase (`execute_sql`).
3. **Certificación:** Cada migración debe acompañarse o validarse inmediatamente con la suite de pruebas (`npm test`).

---

## 3. Trampas Comunes y Gotchas Evitados (Lessons Learned)

- **Anti-patrón (Descuento de stock no atómico):** Leer el stock actual en memoria y hacer un update directo (`stock = stock - 1`). Puede causar sobreventa por concurrencia.
  - **Solución correcta:** Utilizar funciones atómicas de PostgreSQL o transacciones seguras que verifiquen `stock_cantidad >= items_solicitados`.
- **Anti-patrón (Borrado de órdenes en cascada sin liberar stock):** Dejar stock reservado indefinidamente tras pagos fallidos o cancelados.
  - **Solución correcta:** En caso de cancelación de intento (`/api/mercadopago/cancel-attempt`), revertir inmediatamente la reserva devolviendo el stock al inventario.
- **Anti-patrón (Migraciones no versionadas):** Modificar la base de datos desde la consola web sin dejar el script SQL en el repositorio.
  - **Solución correcta:** Todo cambio debe estar formalizado en un archivo dentro de `supabase/migrations/` para mantener consistencia de entornos.

---

## 4. Verificaciones Obligatorias
- [ ] ¿El archivo SQL está en `supabase/migrations/YYYYMMDD_*.sql`?
- [ ] ¿Se ejecutó la migración vía `node scripts/apply-migration.mjs` o MCP?
- [ ] ¿Se validó que las políticas RLS permitan la lectura o escritura según el rol?
- [ ] ¿La suite de tests pasa con `npm test` certificando el nuevo esquema?
