# Plan de Implementación Detallado: Fase 2
## Integración de SDK Mercado Pago, Validación de Precios/Stock en Servidor y Generación de Preferencias (Links Dinámicos)

> **Documento:** Plan Detallado - Fase 2  
> **Ubicación:** `docs/DesarrolloEcommerce/fase-2-mercadopago-api.md`  
> **Dependencias:** SDK Oficial `mercadopago`, Supabase Client (`repuestos_productos`, `orders`), Variables de Entorno (`MERCADOPAGO_ACCESS_TOKEN`).  
> **Estado:** IMPLEMENTADO & VALIDADO ✅ (Compilación con 0 errores)

---

## 1. Objetivos de la Fase 2

1. **Instalación y Configuración del SDK:**
   - Incorporar la librería oficial de Mercado Pago en `package.json`.
   - Inicializar el cliente de Mercado Pago con configuración segura desacoplada en `src/lib/mercadopago.ts`.
2. **Endpoint Seguro de Creación de Preferencias:**
   - Crear la API Route `src/pages/api/mercadopago/create-preference.ts`.
   - Recibir el carrito y los datos del cliente autenticado desde el frontend de `/checkout`.
3. **Validación Estricta Anti-Fraude en Servidor:**
   - **Nunca confiar en los precios que envía el navegador del cliente:** Consultar en Supabase (`repuestos_productos`) el precio real (`precio_venta`) y el stock disponible (`stock_cantidad`) de cada SKU.
   - Si algún producto no tiene stock suficiente o el precio fue manipulado en el DOM, rechazar la transacción con error explícito.
4. **Persistencia de Orden Preliminar en Supabase:**
   - Insertar el pedido en la tabla `public.orders` con estado de pago `pendiente` y estado de orden `preparacion`.
   - Asociar el ID generado `ST-2026-XXXX` y el `customer_id` del comprador.
   - Guardar el `mp_preference_id` generado.
5. **Generación del Link de Pago Dinámico (`init_point`):**
   - Configurar los ítems, el pagador (`payer`), y las URLs de retorno (`back_urls` de éxito, fallo y pendiente).
   - Retornar el link dinámico de Checkout Pro al cliente para abrir la ventana de pago o redirigir sin salir de la experiencia del sitio.

---

## 2. Arquitectura del Flujo de Pago

```text
[Cliente en /checkout con datos validados de Fase 1]
         │
         ▼ (Clic en "Proceder al Pago con Mercado Pago")
POST /api/mercadopago/create-preference
         │
         ├─ 1. Validar sesión del usuario (Auth ID)
         ├─ 2. Consultar BD Supabase: repuestos_productos (Precio real + Stock)
         ├─ 3. Si stock = 0 -> Error: "Producto sin stock disponible"
         ├─ 4. Generar ID legible: ST-2026-XXXX
         ├─ 5. Crear orden en Supabase (orders) -> payment_status: 'pendiente'
         ├─ 6. Invocar Mercado Pago Preference API:
         │      - items: [{ title, unit_price, quantity }]
         │      - payer: { name, email, identification: { type: 'RUT', number } }
         │      - back_urls: { success, failure, pending }
         │      - external_reference: ST-2026-XXXX
         │
         ▼ Retorna: { preferenceId, initPoint }
[Navegador del Cliente]
         │
         ▼
Abre Checkout Pro (Ventana modal o redirección segura de Mercado Pago)
```

---

## 3. Especificación Técnica de Componentes y Código

### 3.1 Cliente de Mercado Pago (`src/lib/mercadopago.ts`)
```typescript
import { MercadoPagoConfig, Preference } from 'mercadopago';

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || import.meta.env.MERCADOPAGO_ACCESS_TOKEN || '';

export const mpClient = new MercadoPagoConfig({
  accessToken: accessToken,
  options: { timeout: 7000 }
});

export const preferenceClient = new Preference(mpClient);
```

### 3.2 Payload de Preferencia de Mercado Pago
* **`items`:** Listado de productos con el precio unitario obtenido directamente desde la base de datos de Supabase.
* **`shipments`:** Costo $0 (debido a la modalidad *Cobro en Destino* formalizada en la Fase 1).
* **`payer`:** Correo, nombre y RUT del comprador validados en `customers`.
* **`external_reference`:** Código de orden `ST-2026-XXXX` para conciliación exacta en la Fase 3 con el Webhook.
* **`back_urls`:**
  - `success`: `https://servitecnology.com/pedido/{orderId}?status=success`
  - `failure`: `https://servitecnology.com/checkout?status=failure`
  - `pending`: `https://servitecnology.com/pedido/{orderId}?status=pending`
* **`auto_return`:** `'approved'` (para regresar automáticamente al sitio cuando el pago sea aprobado).

### 3.3 Conexión en `src/pages/checkout.astro`
- En el modal de confirmación final (botón "Guardar Datos & Proceder al Pago"):
  1. Guarda/actualiza el perfil en `/api/customers/update`.
  2. Llama a `/api/mercadopago/create-preference`.
  3. Al recibir `initPoint`, redirige al cliente a la pasarela oficial de Mercado Pago o abre el modal de Checkout Pro.
  4. Si las credenciales de Mercado Pago aún no están configuradas en `.env`, el endpoint responde con un modo de prueba/aviso claro sin romper la aplicación.

---

## 4. Archivos a Modificar / Crear

1. **[NEW] `src/lib/mercadopago.ts`:** Inicializador del SDK de Mercado Pago.
2. **[NEW] `src/pages/api/mercadopago/create-preference.ts`:** API Route que valida productos, crea la orden en Supabase y genera el link dinámico de Mercado Pago.
3. **[MODIFY] `src/pages/checkout.astro`:** Conectar el botón de pago final para invocar la creación de la preferencia y redirigir al `init_point`.
4. **[MODIFY] `package.json`:** Instalar la dependencia oficial `mercadopago`.
5. **[MODIFY] `CHANGELOG.md`:** Registrar la implementación técnica de la Fase 2.

---

## 5. Criterios de Aceptación y Verificación

1. El endpoint `/api/mercadopago/create-preference` valida el stock y precios reales contra Supabase sin depender del precio enviado por el frontend.
2. Cada solicitud de pago crea un registro con ID `ST-2026-XXXX` en la tabla `orders` en estado `pendiente`.
3. Se genera la preferencia en Mercado Pago y se obtiene el link de pago dinámico (`init_point`).
4. El cliente es transferido fluidamente a la pantalla de pago de Mercado Pago.
