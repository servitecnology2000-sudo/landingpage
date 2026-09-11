# Guía Oficial de Tarjetas de Prueba & Simulación de Pagos en Mercado Pago (Chile)

Esta guía documenta los datos oficiales proporcionados por el panel de desarrolladores de **Mercado Pago Chile** para la aplicación `Servitecnology-eCommerce` (App ID: `3244293161655961`), junto con las instrucciones para simular estados de pago (aprobado, pendiente, rechazado) en el entorno de desarrollo y pruebas (Sandbox).

---

## ⚠️ Regla de Oro para Pruebas en Sandbox

> [!IMPORTANT]
> **No utilices tu cuenta real personal de Mercado Libre / Mercado Pago:**
> Mercado Pago **bloqueará la transacción** con el error *"Una de las partes con la que intentas hacer el pago es de prueba"* si intentas pagarle a un vendedor de prueba usando tu cuenta personal real, o si intentas comprarte a ti mismo con la misma cuenta de desarrollador.

### Cómo realizar la prueba correctamente:
1. Abre tu navegador en una **Ventana de Incógnito / Pestaña Privada** (para evitar que tome cookies de tu cuenta personal de Mercado Libre).
2. En el formulario de `/checkout`, utiliza el **Usuario Comprador de Pruebas** oficial creado para esta aplicación (o un correo de prueba como `test_user_...`):
   * **Email de prueba:** `test_user_4386276905329265909@testuser.com`
   * **Contraseña (si Mercado Pago solicita inicio de sesión):** `evA1cLVqLf`
   * **Usuario:** `TESTUSER4386276905329265909`
3. Agrega los repuestos en `/repuestos` y ve al `/checkout`.
4. Completa los datos de envío y haz clic en **Guardar Datos & Proceder al Pago**.
5. En la pantalla de Mercado Pago, selecciona **"Pagar con tarjeta de crédito o débito"**.
6. Ingresa una de las tarjetas de prueba oficiales que se detallan a continuación.

---

## 🔍 ¿Por qué ocurría el error "UNDEFINED SOURCE" y "No pudimos procesar tu pago"?
1. **Redirección a Producción (`init_point`) en lugar de Sandbox (`sandbox_init_point`):**  
   Mercado Pago genera dos URLs de pago: `init_point` (para producción real) y `sandbox_init_point` (`https://sandbox.mercadopago.cl/...`).  
   Si se intenta usar una tarjeta de prueba ficticia en el entorno de producción (`init_point`), la red bancaria chilena no reconoce el banco emisor de la tarjeta y muestra **`UNDEFINED SOURCE`**. Al hacer clic en "Pagar", el motor antifraude rechaza la transacción con *"No pudimos procesar tu pago"*.
2. **Cruce entre Cuenta Personal Real y Vendedor de Pruebas:**  
   Si en el formulario del checkout se ingresa un correo personal real (por ejemplo `@gmail.com` asociado a tu cuenta de Mercado Libre), Mercado Libre vincula la sesión y bloquea la operación porque las políticas de Mercado Pago impiden que usuarios reales operen con credenciales de prueba. Se debe utilizar siempre el **Comprador de Pruebas** (`test_user_...@testuser.com`).

---

## 💳 Tarjetas de Prueba Oficiales (Chile)

| Tipo de Tarjeta | Número de Tarjeta | Código de Seguridad (CVV) | Fecha de Caducidad |
| :--- | :--- | :---: | :---: |
| **Mastercard Crédito** | `5416 7526 0258 2580` | `123` | `11/30` |
| **Visa Crédito** | `4168 8188 4444 7115` | `123` | `11/30` |
| **American Express** | `3757 781744 61804` | `1234` | `11/30` |
| **Mastercard Débito** | `5241 0198 2664 6950` | `123` | `11/30` |
| **Visa Débito** | `4023 6535 2391 4373` | `123` | `11/30` |

---

## 🎯 Simulación de Estados de Pago (Nombre del Titular y Documento)

Mercado Pago exige en Chile (**MLC**) que en el formulario de la tarjeta se seleccione en el selector de documento el tipo **"Otro"** (¡NO RUT!) con el número **`123456789`**:

> [!CAUTION]
> **Campo "Documento del titular":**  
> 1. Haz clic en el selector desplegable donde dice `RUT ˅`.  
> 2. Selecciona **`Otro`**.  
> 3. Escribe exactamente: **`123456789`**.  
> Si dejas seleccionado `RUT` o escribes un RUT chileno con una tarjeta de prueba, la pasarela intenta resolver un banco chileno inexistente, muestra **`UNDEFINED SOURCE`** y rechaza el pago con *"No pudimos procesar tu pago"*. Con la tarjeta Visa además dirá que *"no se puede pagar con esa tarjeta"*.

| Nombre del Titular | Resultado Simulado | Tipo de Documento | Número de Documento |
| :---: | :--- | :---: | :---: |
| **`APRO`** | **Pago aprobado** ✅ | **`Otro`** (¡NO RUT!) | **`123456789`** |
| **`CONT`** | **Pendiente de pago** ⏳ | **`Otro`** | `123456789` |
| **`FUND`** | **Rechazado por fondos insuficientes** ❌ | **`Otro`** | `123456789` |
| **`SECU`** | **Rechazado por código de seguridad inválido** ❌ | **`Otro`** | `123456789` |
| **`EXPI`** | **Rechazado por fecha de vencimiento** ❌ | **`Otro`** | `123456789` |
| **`CALL`** | **Rechazado con validación para autorizar** ❌ | **`Otro`** | `123456789` |
| **`FORM`** | **Rechazado por error en formulario** ❌ | **`Otro`** | `123456789` |
| **`OTHE`** | **Rechazado por error general** ❌ | **`Otro`** | `123456789` |

---

## 👤 Cuentas Oficiales de Prueba en esta Aplicación

En Mercado Pago existen dos perfiles creados para esta integración:
1. **Cuenta Vendedora (Servitecnology):**
   - **ID:** `3680788543`
   - **Usuario:** `TESTUSER2887970320255947564`
   - **Email:** `test_user_2887970320255947564@testuser.com`
2. **Cuenta Compradora Oficial (Buyer):**
   - **ID:** `3683310708`
   - **Usuario:** `TESTUSER4386276905329265909`
   - **Email:** `test_user_4386276905329265909@testuser.com`
   - **Contraseña:** `evA1cLVqLf`

---

## 🔄 Flujo Completo de Conciliación y Webhooks

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (Incógnito)
    participant Front as Frontend (/checkout)
    participant API as /api/mercadopago/create-preference
    participant MP as Pasarela Mercado Pago
    participant Webhook as /api/mercadopago/webhook
    participant BD as Supabase DB
    participant Mail as Servidor SMTP (mail.whagil.com)

    Cliente->>Front: Clic en "Guardar Datos & Proceder al Pago"
    Front->>API: POST items, customer_id, delivery_type
    API->>BD: Inserta orden preliminar ST-2026-XXXX en orders
    API->>MP: Genera Preference con items validados
    MP-->>API: Retorna preference_id e init_point
    API-->>Front: Redirige al cliente a Mercado Pago
    Cliente->>MP: Ingresa Tarjeta Oficial de Prueba con titular APRO
    MP-->>Cliente: Pago Aprobado y redirección de retorno
    MP->>Webhook: Notificación instantánea payment.created / payment.updated
    Webhook->>MP: paymentClient.get({ id }) (Validación de autenticidad)
    Webhook->>BD: Actualiza orden a 'aprobado'
    Webhook->>BD: Decrementa stock real en repuestos_productos
    Webhook->>Mail: Envía correo con plantilla corporativa desde notificaciones@servitecnology.com
    Mail-->>Cliente: Email con resumen, comprobante y flete por pagar
```
