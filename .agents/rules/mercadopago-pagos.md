---
description: Reglas técnicas de Checkout Pro Mercado Pago Chile (MLC), ambiente Sandbox, conciliación y transferencias
trigger: model_decision
---

# Reglas de Pasarela de Pagos (Mercado Pago Chile & Transferencias)

Este módulo gestiona la integración con **Mercado Pago Chile (MLC)** mediante Checkout Pro y la modalidad alternativa de **Transferencia Bancaria Manual**.

---

## 1. Reglas Técnicas de Sandbox en Chile (MLC)

> [!IMPORTANT]
> **REGLA DE ORO DEL DOCUMENTO DEL TITULAR EN SANDBOX:**
> En el formulario de pago de Checkout Pro en Chile:
> - En el selector de tipo de documento, debe seleccionarse SIEMPRE **`Otro`** (nunca `RUT`).
> - Ingresar como número de documento: **`123456789`**.
> - **Causa raíz:** Si se selecciona `RUT`, Mercado Pago intenta validar el documento contra la base tributaria chilena real, provocando el error `UNDEFINED SOURCE` o rechazo inmediato de la tarjeta de prueba.

### Simulación de Resultados con Tarjeta Sandbox:
- **Número de tarjeta de prueba:** `5416 7526 0258 2580` (vencimiento futuro, CVV `123`).
- El **Nombre del Titular** define el estado simulado del pago:
  - `APRO`: Pago Aprobado.
  - `FUND`: Fondos Insuficientes.
  - `CONT`: Pago Pendiente / En Proceso de Autorización.
  - `SECU`: Código de Seguridad Inválido.
  - `CALL`: Llamar a la entidad emisora para autorizar.

### Aislamiento de Cuentas:
En modo sandbox, el backend (`/api/mercadopago/create-preference`) debe inyectar automáticamente el email del comprador de pruebas (`ML_PRUEBAS_COMPRADOR_EMAIL`) en el objeto `payer` para evitar conflictos de cookies o de sesión con la cuenta real de Mercado Libre/Mercado Pago del vendedor.

---

## 2. Conciliación y Webhooks (`/api/mercadopago/webhook`)

1. **Idempotencia:** Cada notificación entrante debe verificar si el pago ya fue procesado en la tabla `orders` para prevenir dobles descuentos de stock o correos duplicados.
2. **Conciliación Oficial:** Consultar a la API de Mercado Pago mediante el SDK para verificar el estado real (`payment.get({ id })`) antes de actualizar la orden en base de datos.
3. **Descuento de Stock:** Al transicionar a `aprobado`, descontar de forma atómica el stock en `repuestos_productos`.
4. **Liberación de Stock por Cancelación:** El endpoint `/api/mercadopago/cancel-attempt` libera de inmediato la reserva de stock si el usuario aborta o cancela el intento de pago.
5. **Notificación por Email:** Despachar correo transaccional formal con Nodemailer (`notificaciones@servitecnology.com`) con desglose para Facturación Electrónica SII.

---

## 3. Modalidad de Transferencia Bancaria Manual (BancoEstado)

- **Instrucciones:** Datos bancarios de BancoEstado (RUT de empresa, Cuenta Corriente, correo de confirmación).
- **Glosa Obligatoria:** El cliente debe incluir el identificador único de la orden (`ST-2026-XXXX`).
- **Temporizador de Reserva:** Cuenta regresiva de 2 horas. Si el pago no es validado manualmente por el administrador en ese plazo, la orden puede liberarse.

---

## 4. Verificaciones Obligatorias
- [ ] ¿Se verificó que el payer incluya el email de pruebas en entorno Sandbox?
- [ ] ¿El webhook valida idempotencia y consulta el estado real al SDK?
- [ ] ¿El endpoint `cancel-attempt` libera el stock reservado correctamente?
- [ ] ¿Los tests unitarios de checkout pasan con `npm test`?
