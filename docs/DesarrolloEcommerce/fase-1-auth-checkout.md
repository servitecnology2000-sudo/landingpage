# Plan de Implementación Detallado: Fase 1
## Autenticación Supabase (Google OAuth), Captura de Datos Obligatorios y Checkout con Cobro en Destino

> **Documento:** Plan Detallado - Fase 1  
> **Ubicación:** `docs/DesarrolloEcommerce/fase-1-auth-checkout.md`  
> **Dependencias:** Supabase Client (`@supabase/supabase-js`), Tabla `customers` (con FK a `auth.users(id)`).  
> **Proveedor Google en Supabase:** ACTIVADO ✅ (`external_google_enabled: true`)  
> **Estado:** IMPLEMENTADO & VALIDADO ✅ (Compilación con 0 errores)

---

## 1. Objetivos de la Fase 1

1. Permitir que cualquier usuario navegue por el catálogo de repuestos y arme su carrito de compras de manera libre como **Invitado**.
2. Al llegar a `/checkout` y hacer clic en **"Continuar con el Pago"**, si el usuario no tiene una sesión activa, solicitar autenticación con **Google OAuth** a través de Supabase Auth.
3. Inmediatamente después de autenticarse con Google, validar si el usuario ya tiene un perfil completo en la tabla `customers`. Si es su primera compra (o faltan datos), exigir el llenado obligatorio de:
   - **RUT Chileno** (validación de formato y obligatoriedad legal para Factura Electrónica SII).
   - **Teléfono móvil de contacto** (para coordinación del transportista / WhatsApp).
   - **Región / Comuna de destino**.
   - **Dirección exacta** (Calle, número, departamento/oficina).
4. Actualizar el selector de entrega en `checkout.astro` para implementar la modalidad **"Envío por Pagar / Cobro en Destino"**:
   - En el total a pagar en la web se cobra **$0 de despacho**.
   - En la interfaz se muestra un desglose con los **valores estimados referenciales** según la comuna/región seleccionada (RM ~$3.990 - $4.990, Regiones ~$5.990 - $9.990) acompañado de un aviso informativo visible.
   - Preservar la opción **Retiro en Oficina Técnica ($0)**.
5. Dejar listo el payload y los datos del comprador validados para pasarlos de forma directa al endpoint de creación de preferencia de Mercado Pago (Fase 2).

---

## 2. Arquitectura de Flujo de Usuario (Paso a Paso)

```text
[Cliente en /repuestos]
        │
        ▼ (Añade productos al carrito)
[Página /checkout como Invitado]
        │
        ├─ Opción Entrega: "Retiro en Oficina ($0)" ó "Envío por Pagar (Cobro en Destino)"
        │
        ▼ (Clic en "Continuar al Pago")
¿Usuario autenticado en Supabase?
   ├── NO ──► Modal emergente / Botón: "Continuar con Google" (OAuth)
   │             │
   │             ▼ (Redirección OAuth exitosa de regreso a /checkout)
   └── SÍ ──► Consultar perfil en tabla public.customers
                 │
                 ├── ¿Faltan RUT, Teléfono o Dirección?
                 │     │
                 │     ▼
                 │   Desplegar formulario obligatorio de datos de despacho/facturación
                 │   Guardar / Actualizar registro en public.customers
                 │
                 └── ¿Datos completos?
                       │
                       ▼
                     Listo para generar la orden y pagar con Mercado Pago (Fase 2)
```

---

## 3. Especificación Técnica de Componentes y Código

### 3.1 Cliente de Supabase Frontend (`src/lib/supabase.ts` y script en cliente)
* Utilizar `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/checkout' } })`.
* Escuchar el estado de autenticación en el cliente con `supabase.auth.onAuthStateChange()`.
* Al detectar sesión:
  - Extraer `user.id`, `user.email` y `user.user_metadata.full_name`.
  - Consultar en `public.customers` por `id = user.id`.
  - Si el registro existe, pre-cargar automáticamente los campos en el formulario del checkout.
  - Si no existe, pre-rellenar el email y nombre provenientes de Google y mantener los campos de RUT, teléfono y dirección listos para que el usuario los ingrese.

### 3.2 Modal de Autenticación Rápida en `src/pages/checkout.astro`
* Crear un modal o sección colapsable con diseño premium de Servitecnology (estilo HUD tecnológico, bordes cian/esmeralda, fondo oscuro con blur).
* Botón con logo oficial de Google: *"Iniciar sesión con Google para finalizar la compra"*.
* Texto explicativo: *"Tu cuenta te permitirá consultar el estado de tu pedido, seguimiento del flete y facturación electrónica de forma automática."*

### 3.3 Formulario Obligatorio de Facturación y Logística (SII)
* **Validación de RUT:** Función JavaScript para validar el formato y dígito verificador del RUT chileno (módulo 11), evitando RUTs falsos que impidan emitir la factura.
* **Mapeo a la Base de Datos (`public.customers`):**
  ```typescript
  interface CustomerPayload {
    id: string; // auth.users.id
    full_name: string;
    email: string;
    phone: string;
    rut: string;
    address: string;
  }
  ```

### 3.4 Rediseño del Selector de Entrega (Cobro en Destino)
* **Opción 1: Retiro en Oficina ($0)**
  - Ubicación: Santiago Centro.
  - Costo: $0.
* **Opción 2: Envío por Pagar a Domicilio / Sucursal (Cobro en Destino)**
  - Selector de Región (Región Metropolitana vs Otras Regiones de Chile).
  - Selector de Comuna.
  - **Caja de Valor Estimado Referencial:**
    - RM (Comunas centrales): Estimado ~$3.990 CLP
    - RM (Comunas periféricas): Estimado ~$4.990 CLP
    - Regiones cercanas (V / VI): Estimado ~$5.990 - $6.990 CLP
    - Regiones extremas (Norte / Sur): Estimado ~$7.990 - $9.990 CLP
  - **Aviso destacado:**  
    > *"Modalidad Cobro en Destino: En este pedido pagarás únicamente el valor de los repuestos ($0 de flete en la web). El valor del envío mostrado es un estimado referencial que cancelarás directamente a la empresa de transporte (Starken / Chilexpress) al momento de la entrega."*

---

## 4. Archivos a Modificar / Crear

1. **[MODIFY] `src/pages/checkout.astro`:**
   - Incorporar lógica de Supabase Auth en el script del cliente.
   - Reestructurar el selector de envíos a la modalidad "Cobro en Destino" con tabla referencial de costos.
   - Agregar el modal/banner de inicio de sesión con Google.
   - Validar que antes de proceder al pago, el cliente tenga sesión y datos guardados en `customers`.
2. **[NEW] `src/pages/api/customers/update.ts` (API Route):**
   - Endpoint protegido para guardar o actualizar el perfil de cliente en `public.customers` validando la sesión del usuario.
3. **[MODIFY] `CHANGELOG.md`:**
   - Registrar la implementación de la Fase 1 una vez concluida.

---

## 5. Criterios de Aceptación y Verificación

1. Un usuario no logueado puede entrar a `/checkout`, ver sus productos y seleccionar su comuna/modalidad de entrega.
2. Al intentar avanzar, se le solicita autenticarse con Google.
3. Al loguearse con Google, sus datos (nombre y email) se detectan automáticamente.
4. Si no ha ingresado RUT, teléfono o dirección, el sistema le impide continuar hasta que los complete.
5. Al completarlos, los datos quedan guardados en la tabla `customers` de Supabase vinculados a su `auth.users(id)`.
6. El resumen del pedido muestra claramente:
   - Subtotal repuestos: `$X.XXX`
   - Envío (Cobro en Destino): `$0` (con nota del estimado referencial).
   - Total a pagar en web: `$X.XXX`
