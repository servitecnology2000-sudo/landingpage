---
description: Reglas del panel administrativo privado, autenticación, módulo CRM y ciclo logístico de órdenes
trigger: model_decision
---

# Reglas de Panel Administrativo y CRM

El módulo administrativo permite la gestión operativa del inventario, catálogo, clientes y trazabilidad logística de pedidos.

---

## 1. Seguridad y Acceso

- **Ruta Ofuscada:** `/meson-servitecnology-st`
- **Mecanismo de Protección:** Clave maestra de entorno (`ADMIN_SECRET`) en conjunto con sesiones de Supabase Auth.
- **Protección de Endpoints:** Todas las rutas `/api/admin/*` deben validar el header o cookie de autorización administrativa antes de ejecutar operaciones de lectura/escritura.

---

## 2. Gestión de Clientes y RUT Chileno

- **Validación de RUT:** Todo ingreso o edición de clientes debe validar formato y dígito verificador mediante el módulo centralizado [`src/lib/rut-validator.ts`](file:///home/angel/Developer/landingpage/src/lib/rut-validator.ts).
- **RUT para Facturación:** El RUT es un campo obligatorio para la emisión de Factura Electrónica ante el Servicio de Impuestos Internos (SII).
- **Consistencia de Perfiles:** Las compras realizadas por invitados se asocian retroactivamente al cliente cuando éste se registra o inicia sesión con el mismo correo electrónico.

---

## 3. Ciclo Logístico de Órdenes

Las órdenes (`orders`) transitan por estados logísticos controlados:
1. `preparacion`: Estado inicial tras la confirmación del pago.
2. `despachado`: Para órdenes con envío (`delivery_rm` o `envio_nacional`). Requiere `tracking_number`, `courier` (Starken, Chilexpress, Blue Express, etc.) y `shipped_at`.
3. `listo_retiro`: Para órdenes con retiro en oficina (`retiro`). Registra `ready_pickup_at` y genera aviso al cliente.
4. `entregado`: Estado terminal exitoso.
5. `cancelado`: Liberación de stock y archivo de la orden.

Toda acción administrativa de cambio de estado o eliminación debe solicitar confirmación mediante `window.showAdminConfirm(...)` y brindar feedback mediante `window.showAdminToast(...)`.

---

## 4. Verificaciones Obligatorias
- [ ] ¿Los endpoints en `/api/admin/*` cuentan con guardias de seguridad?
- [ ] ¿Se valida el dígito verificador del RUT con `rut-validator.ts`?
- [ ] ¿Las acciones destructivas o de cambio de estado usan modales en lugar de confirmaciones nativas?
- [ ] ¿Los tests en `tests/admin/` pasan exitosamente?
