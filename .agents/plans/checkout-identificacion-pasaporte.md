# Plan Técnico: Validación Condicional de RUT Chileno y Soporte de Pasaporte para Extranjeros en Checkout (SII)

> **Documento:** Plan Técnico de Implementación (Gate 2 SDD)  
> **Ubicación:** `.agents/plans/checkout-identificacion-pasaporte.md`  
> **Módulo:** `src/pages/checkout.astro`, `src/lib/rut.ts`, `src/pages/api/mercadopago/create-preference.ts`  
> **Estado:** Listo para Aprobación Humana (Gate 3) 🛑  
> **Fecha:** 2026-10-01  

---

## 1. Resumen Técnico de Arquitectura y Patrones

### A. Contexto y Objetivos Técnicos
El propósito de este cambio es flexibilizar la identificación del comprador en la Sección 2 del formulario de `/checkout` sin comprometer la rigurosidad tributaria del SII ni la seguridad de la pasarela de pagos Mercado Pago:
1. **Validación Condicional en Frontend y Backend:** Si el usuario selecciona identificarse con **RUT Chileno**, se aplica de forma estricta el algoritmo Módulo 11. Si el usuario selecciona **Pasaporte Extranjero**, se omite el Módulo 11 y se aplica una validación alfanumérica estándar de pasaporte internacional (3 a 20 caracteres).
2. **Claridad Tributaria SII:** Se adecua la comunicación en pantalla. Para pasaportes se informa que la venta se respalda mediante **Boleta Electrónica a Consumidor Final**, conforme a la normativa tributaria chilena para adquirentes sin domicilio tributario en Chile.
3. **Compatibilidad con Mercado Pago (MLC):** En Mercado Pago Chile, los documentos extranjeros se procesan bajo el tipo de documento `Otro`. En ambiente Sandbox, se mantiene la directriz obligatoria de `Otro` + `123456789` para evitar el error `UNDEFINED SOURCE`.
4. **Estética y Cero Alertas Nativas:** Se implementa un selector de pestañas moderno (pills) con Tailwind CSS 4, transiciones suaves y modales oscuros con glassmorphism, cumpliendo la regla de cero alertas nativas (`alert`/`confirm`).

---

## 2. Detalle Archivo por Archivo de Cambios

### 1. `[MODIFY]` `src/lib/rut.ts`
- **Razón del Cambio:** Centralizar la lógica de validación y limpieza de pasaportes y teléfonos internacionales para reutilización tanto en cliente como en servidor.
- **Funciones a Incorporar / Modificar:**
  - `cleanPassport(passport: string): string`: Elimina espacios en blanco y convierte a mayúsculas.
  - `validatePassport(passport: string): boolean`: Valida que la cadena contenga entre 3 y 20 caracteres alfanuméricos (`/^[A-Z0-9\-\.]{3,20}$/i`).
  - `isValidInternationalPhone(phoneStr: string): boolean`: Valida números telefónicos internacionales flexibles (mínimo 7 y máximo 16 dígitos numéricos con soporte opcional de prefijo `+`).

### 2. `[MODIFY]` `src/pages/checkout.astro`
- **Razón del Cambio:** Proveer la interfaz gráfica interactiva del selector de identificación y adaptar la lógica reactiva del formulario y del modal de confirmación.
- **Bloques Afectados:**
  - **Sección 2 (HTML):**
    - Agregar píldoras interactivas sobre el campo de identificación:  
      `[ 🇨🇱 RUT Chileno (Persona / Empresa) ]` y `[ 🌐 Pasaporte Extranjero (Boleta SII) ]`.
    - Atributos dinámicos en el label `#rut-label` y el input `#rut`:
      - Label: `RUT Chileno (Persona o Empresa) *` vs `Número de Pasaporte Extranjero *`.
      - Placeholder: `Ej: 12.345.678-9` vs `Ej: A12345678 o PAS987654`.
    - Mensajes de error dinámicos `#rut-error`: mensaje para RUT vs mensaje para pasaporte.
    - Banner informativo SII: Actualizar dinámicamente el texto indicando si se emitirá Factura/Boleta (RUT) o Boleta Electrónica a Consumidor Final (Pasaporte).
  - **Modal de Confirmación (`#confirm-modal`):**
    - Desplegar la etiqueta adecuada (`RUT (SII):` o `Pasaporte (Boleta SII):`) junto al valor formateado.
  - **Script de Cliente:**
    - Variable de estado `currentDocType: 'rut' | 'pasaporte' = 'rut'`.
    - Manejadores de clic en píldoras: alternar estado activo, cambiar labels/placeholders, reiniciar clases de error y bordes.
    - Validación en tiempo real (`input` event):
      - Si `currentDocType === 'rut'`: aplicar `formatRut()` y `isValidChileanRut()`.
      - Si `currentDocType === 'pasaporte'`: aplicar `cleanPassport()` y `validatePassport()`.
    - Validación en botón "Continuar al Pago":
      - Evaluar según `currentDocType`. Si es RUT, invocar validación Módulo 11; si es Pasaporte, validar longitud y caracteres alfanuméricos.
      - Validación de teléfono: aceptar celular/fijo chileno si es RUT, o formato internacional/chileno si es Pasaporte.
    - Envío de payload a `/api/mercadopago/create-preference`:
      - Enviar `identification_type: currentDocType` y `rut: rutVal`.

### 3. `[MODIFY]` `src/pages/api/mercadopago/create-preference.ts`
- **Razón del Cambio:** Validar en servidor el documento de acuerdo con el tipo de identificación enviado y configurar el payer para Mercado Pago.
- **Bloques Afectados:**
  - Extracción de `customerPayload.identification_type` (default `'rut'`).
  - Lógica condicional de validación:
    - Si `identification_type === 'pasaporte'`:
      - Validar con `validatePassport(rut)`. Si es inválido, responder con 400 (`'El número de pasaporte ingresado es inválido.'`).
      - Omitir `validateRut()`.
    - Si `identification_type === 'rut'`:
      - Ejecutar `validateRut(rut)`. Si es inválido, responder con 400 (`'El RUT ingresado no es válido según el algoritmo del SII (Módulo 11).'`).
  - Payer Identification en Mercado Pago:
    - En producción: si es pasaporte, asignar `type: 'Otro'`, `number: customer.rut`.
    - En sandbox: mantener `type: 'Otro'`, `number: '123456789'` (regla Sandbox MLC).

### 4. `[MODIFY]` `src/pages/api/orders/create.ts`
- **Razón del Cambio:** Asegurar que el endpoint de creación directa de pedidos también admita órdenes con identificación de pasaporte sin fallar en validación de campos obligatorios.

### 5. `[MODIFY]` `tests/lib/rut-validator.test.ts`
- **Razón del Cambio:** Agregar pruebas unitarias exhaustivas para las nuevas funciones `validatePassport` y `cleanPassport`.
- **Casos de Prueba:**
  - Pasaportes válidos (ej. `A12345678`, `PAS-98765`, `123456789`, `B-492.102`).
  - Pasaportes inválidos (cadenas vacías, caracteres especiales prohibidos, menos de 3 caracteres, más de 20 caracteres).

### 6. `[MODIFY]` `tests/checkout/guest-checkout.test.ts`
- **Razón del Cambio:** Validar la integración del endpoint `/api/mercadopago/create-preference` con pedidos de invitados que usan pasaporte.
- **Casos de Prueba a Añadir:**
  - `debe procesar exitosamente un pedido de Invitado con Pasaporte Extranjero sin exigir validación de Módulo 11`: Envía `identification_type: 'pasaporte'` y un pasaporte válido, verificando respuesta 200 y creación de orden.
  - `debe rechazar con 400 si identification_type es pasaporte pero el valor está vacío o es inválido`.
  - `debe mantener el rechazo estricto de Módulo 11 cuando identification_type es rut y el RUT es inválido`.

---

## 3. Comandos de Verificación Exactos

Una vez aprobado este plan, se ejecutarán los siguientes comandos para certificar el Gate 4:

```bash
# 1. Ejecución de la suite completa de pruebas unitarias y de integración
npm test

# 2. Compilación y verificación estricta de tipos de Astro y Vite
npm run build
```

Ambos comandos deben reportar **cero errores** y **cero regresiones**.
