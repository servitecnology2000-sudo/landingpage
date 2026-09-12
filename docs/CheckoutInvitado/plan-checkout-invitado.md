# Plan de Implementación: Checkout Pro sin Login Obligatorio (Modo Invitado)

> **Documento:** Plan de Implementación Detallado - Checkout de Invitados  
> **Ubicación:** `docs/CheckoutInvitado/plan-checkout-invitado.md`  
> **Módulo:** `/checkout`  
> **Estado:** LISTO PARA EJECUCIÓN 📋  

---

## 1. Justificación y Objetivos de Negocio

Actualmente, el flujo de compra en `/checkout` bloquea el avance hacia el pago con Mercado Pago si el comprador no inicia sesión previamente mediante Google OAuth. Esta barrera genera:
1. **Abandono de Carrito:** Clientes que no desean vincular su cuenta de Google o que buscan una compra rápida desisten de la transacción.
2. **Fricción Innecesaria:** Mercado Pago Checkout Pro admite nativamente pagos como "Invitado" (con tarjetas de débito/crédito chilenas y Webpay), por lo que forzar un login previo en la tienda es una restricción artificial.

### Objetivos:
* **Fricción Cero:** Permitir pagar directamente completando únicamente los datos obligatorios del comprador y facturación del SII.
* **Google OAuth Opcional y Persuasivo:** Ofrecer el inicio de sesión con Google como una ventaja de comodidad (autorellenar datos) y fidelización (acceso al historial de compras).
* **Validación Condicional de Entrega:**
  - **Retiro en Oficina Técnica ($0):** Oculta y no exige datos de despacho.
  - **Envío por Pagar (Cobro en Destino):** Despliega y valida Región, Comuna y Dirección de entrega.
* **Facturación SII Obligatoria:** Nombre/Razón Social, RUT (con validación de Módulo 11), Email y Teléfono móvil (+56 9...) obligatorios para ambos métodos de entrega.

---

## 2. Flujo de Usuario y Diseño de Interfaz (`/checkout`)

### A. Banner Opcional de Google OAuth
En la parte superior del formulario de checkout, se reemplaza el bloqueo por un banner informativo con diseño oscuro y acentos fluorescentes (`brand-cyan` / `brand-green`):
> 💡 **"¿Tienes cuenta? Ingresa con Google para autorellenar tus datos. Si creas tu cuenta podrás tener y ver el historial de tus compras."**  
> `[ Continuar con Google ]` *(Botón opcional de 1 clic)*

* Si el cliente pulsa el botón: Inicia sesión con Google, sus datos se precargan en los campos de facturación y se vincula su `auth_user_id`.
* Si el cliente NO pulsa el botón: Continúa llenando el formulario manualmente como invitado sin ninguna traba.

### B. Sección 1: Método de Entrega & Despacho
* **Opción A: Retiro en Oficina Técnica ($0 - GRATIS):**
  - Seleccionada por defecto.
  - Los campos de región, comuna y dirección permanecen ocultos y exentos de validación.
* **Opción B: Envío por Pagar (Cobro en Destino):**
  - Despliega:
    1. Selector de Región.
    2. Selector de Comuna (desplegable oficial para RM o campo de texto para otras regiones).
    3. Dirección exacta de entrega o sucursal de Starken / Chilexpress.
    4. Estimador de flete referencial.

### C. Sección 2: Datos del Comprador & Facturación SII (Obligatorio)
Campos requeridos por la normativa del SII y SERNAC:
1. **Nombre y Apellido / Razón Social:** Texto no vacío.
2. **RUT Chileno:** Formateo automático (`XX.XXX.XXX-X`) y validación algorítmica obligatoria de dígito verificador (Módulo 11).
3. **Correo Electrónico:** Formato de email válido (destinatario del comprobante formal y factura).
4. **Teléfono Móvil / WhatsApp:** Validación de número chileno de 9 dígitos (+56 9...).

---

## 3. Arquitectura Técnica y Modificaciones de Código

### A. Frontend: `src/pages/checkout.astro`
1. **Eliminar Bloqueo de Google:**
   - Remover la condición:
     ```typescript
     // ELIMINAR:
     if (!currentUser) {
         openGoogleModal();
         return;
     }
     ```
2. **Actualizar el Botón de Acción:**
   - Si no hay sesión: El botón dice *"Continuar al Pago con Mercado Pago"* o *"Pagar $XX.XXX CLP con Mercado Pago"*.
3. **Envío de Datos Enriquecidos a la API:**
   - El payload para generar la orden y preferencia incluirá todos los datos del formulario directamente, sin depender de un `currentUser.id` obligatorio:
     ```typescript
     const payloadPreference = {
         customer: {
             full_name: fullNameInput.value.trim(),
             email: emailInput.value.trim().toLowerCase(),
             phone: formatChileanPhone(phoneInput.value),
             rut: rutInput.value.trim().toUpperCase(),
             auth_user_id: currentUser ? currentUser.id : null
         },
         delivery_type: currentDelivery,
         commune: currentDelivery === 'retiro' ? 'Retiro en Oficina' : communeVal,
         address: currentDelivery === 'retiro' ? 'Oficina Técnica Santiago Centro' : addressInput.value.trim(),
         items: getItems()
     };
     ```

### B. Backend: `src/pages/api/mercadopago/create-preference.ts`
1. **Gestión Atómica del Cliente:**
   - Recibe los datos del cliente (`customer`).
   - Busca en `public.customers` si ya existe un cliente con ese `email` o `rut`:
     - **Si existe:** Actualiza sus datos de contacto y reutiliza su `id` (UUID). Si viene con `auth_user_id`, lo asocia.
     - **Si no existe:** Inserta un nuevo registro con `customer_type: 'invitado'` (o `'registrado'` si vino logueado), autogenerando su UUID.
2. **Creación de Orden en `public.orders`:**
   - Genera el identificador legible `ST-2026-XXXX`.
   - Asigna `customer_id` con el UUID del cliente obtenido.
   - Guarda los items validados contra stock real en `repuestos_productos`.
3. **Generación de Preferencia en Mercado Pago:**
   - Inyecta en el objeto `payer` de la preferencia de MP:
     - Nombre, Email y RUT ingresados.
   - Configura las `back_urls` oficiales hacia `/pedido/ST-2026-XXXX`.
   - Retorna el `initPoint` oficial para la redirección inmediata del navegador.

---

## 4. Plan de Pruebas Automatizadas (Vitest)

Se creará la suite:
📁 `tests/checkout/guest-checkout.test.ts`

### Casos de Prueba:
1. **Creación de Preferencia de Invitado:** Envía un payload sin `auth_user_id`, valida que cree la orden `ST-2026-XXXX` y retorne un `initPoint` válido.
2. **Retiro en Oficina sin Dirección:** Valida que con `delivery_type = 'retiro'` la orden se registre exitosamente con flete $0 y dirección de oficina por defecto.
3. **Envío por Pagar con Validación de Despacho:** Valida que con `delivery_type = 'envio_nacional'` exija comuna y dirección.
4. **Validación Estricta del SII:** Rechaza con HTTP 400 si el RUT tiene dígito verificador erróneo o si falta el correo.
5. **Persistencia en `customers`:** Comprueba en Supabase que el cliente se guarde con `customer_type = 'invitado'` y `auth_user_id = NULL`.

---

## 5. Criterios de Aceptación

- [ ] Un usuario anónimo puede completar una compra sin ver ventanas modales obligatorias de Google.
- [ ] El banner superior explica con claridad la opción de ingresar con Google y el beneficio del historial de compras.
- [ ] La selección de "Retiro en Oficina" no pide datos de despacho; "Envío por pagar" los valida rigurosamente.
- [ ] Los datos tributarios del SII (RUT con módulo 11, Nombre, Email, Teléfono) son obligatorios en todos los casos.
- [ ] La suite de pruebas `guest-checkout.test.ts` pasa al 100% con `npm test`.
- [ ] La compilación `npm run build` finaliza con 0 errores.
