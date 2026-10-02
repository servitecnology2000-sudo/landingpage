# Especificación Funcional: Validación Condicional de RUT Chileno y Soporte de Pasaporte para Extranjeros en Checkout (SII)

> **Documento:** Especificación Funcional (Gate 1 SDD)  
> **Ubicación:** `.agents/specs/checkout-identificacion-pasaporte.md`  
> **Módulo:** `/checkout` (Sección 2: Datos del Comprador & Facturación SII) y Endpoints de Pasarela / Órdenes  
> **Estado:** Completado ✅  
> **Fecha:** 2026-10-01  

---

## 1. Problema y Fricción de Usuario (UX) / Justificación de Negocio

Actualmente, en la **Sección 2: "Datos del Comprador & Facturación SII"** del formulario de compra en `/checkout`, el sistema exige de forma invariable y obligatoria el ingreso de un **RUT chileno**, validado algorítmicamente mediante **Módulo 11** tanto en el navegador como en el backend (`/api/mercadopago/create-preference` y `/api/orders/create`).

### Fricciones Identificadas:
1. **Bloqueo Infranqueable para Extranjeros:** Clientes internacionales, turistas, técnicos y residentes en tránsito que no poseen RUN/RUT chileno quedan totalmente incapacitados de adquirir repuestos en la plataforma, ya que el algoritmo rechaza cualquier número de pasaporte o documento extranjero con el mensaje *"RUT inválido. Verifica el dígito verificador"*.
2. **Normativa Tributaria del SII en Chile:** Conforme a la legislación del Servicio de Impuestos Internos (SII), si bien la **Factura Electrónica** con crédito fiscal IVA requiere obligatoriamente un RUT chileno válido (Persona Natural o Razón Social), la ley chilena permite e instruye la emisión de **Boleta Electrónica de Ventas y Servicios a Consumidor Final Extranjero**, individualizando al adquirente mediante su número de **Pasaporte** o documento de identidad de su país de origen.
3. **Pérdida de Conversiones:** Usuarios extranjeros que desean pagar con tarjetas internacionales a través de Mercado Pago abandonan el checkout debido a la rigidez del campo.

---

## 2. Solución Funcional y Arquitectura de Pantallas/Flujos (Sin Código)

### A. Selector de Tipo de Documento en Sección 2
En la Sección 2 ("Datos del Comprador & Facturación SII"), se incorporará un selector visual tipo pestañas/píldoras (pill-toggle) accesible y adaptativo:
- **Opción 1: 🇨🇱 RUT Chileno (Persona o Empresa)** *(Activa por defecto)*
- **Opción 2: 🌐 Pasaporte / Extranjero (Boleta SII)**

### B. Comportamiento Dinámico según la Opción Seleccionada

1. **Cuando el usuario selecciona "RUT Chileno":**
   - **Etiqueta del Campo:** `RUT Chileno (Persona o Empresa) *`
   - **Placeholder:** `Ej: 12.345.678-9`
   - **Regla de Validación:** Algoritmo estricto de Módulo 11 (cuerpo de 7-8 dígitos + dígito verificador 0-9 o K). Autoformateo visual `XX.XXX.XXX-X`.
   - **Banner Informativo SII:** Informa que con RUT chileno se puede emitir tanto Factura Electrónica (con RUT de empresa o persona) como Boleta Electrónica.
   - **Teléfono:** Valida número móvil chileno (+56 9...) o fijo nacional de 9 dígitos.

2. **Cuando el usuario selecciona "Pasaporte":**
   - **Etiqueta del Campo:** `Número de Pasaporte / Documento Extranjero *`
   - **Placeholder:** `Ej: A12345678 o PAS987654`
   - **Regla de Validación:** **EXENCIÓN TOTAL** del cálculo de Módulo 11. Se valida que sea una cadena alfanumérica válida (mínimo 3 caracteres, máximo 20 caracteres, permitiendo guiones o puntos pero sin caracteres de control o vacíos).
   - **Banner Informativo SII:** Se actualiza dinámicamente indicando:  
     *"Para compras con Pasaporte extranjero se emitirá Boleta Electrónica conforme a las directrices del SII para consumidor final."*
   - **Teléfono:** Flexibiliza la validación telefónica para permitir números internacionales con código de país (mínimo 7 dígitos, prefijo `+` opcional) para la coordinación de despacho/entrega.

3. **Transición y Limpieza:**
   - Al alternar entre ambas opciones, se limpian los estados de error visuales previos (`border-red-500` y textos de advertencia) sin borrar los datos no relacionados (nombre, email).

### C. Modal de Confirmación Previo al Pago
El modal de confirmación (`#confirm-modal`) reflejará de forma clara y fidedigna la modalidad elegida:
- Si es RUT: `RUT (SII): 12.345.678-9`
- Si es Pasaporte: `Pasaporte (Extranjero - Boleta SII): [NÚMERO]`

### D. Conciliación con Mercado Pago (Payer Identification)
- Para adquirentes con RUT: Mercado Pago Payer Identification envía `type: 'RUT'` y el número correspondiente.
- Para adquirentes con Pasaporte: Mercado Pago Payer Identification envía `type: 'Otro'` y el número de pasaporte (o `123456789` en ambiente Sandbox según la Regla de Oro de Sandbox MLC).

---

## 3. Requisitos en Sintaxis EARS

- **[EARS-001] WHERE** el usuario visualiza la Sección 2 del `/checkout`, **THE SYSTEM SHALL** presentar un selector visible de dos opciones: `RUT Chileno` (predeterminado) y `Pasaporte Extranjero`.
- **[EARS-002] WHEN** el usuario selecciona `RUT Chileno`, **THE SYSTEM SHALL** exigir y validar obligatoriamente el formato chileno y el dígito verificador según el algoritmo Módulo 11 del SII.
- **[EARS-003] WHEN** el usuario selecciona `Pasaporte Extranjero`, **THE SYSTEM SHALL NOT** aplicar la validación de Módulo 11 y **THE SYSTEM SHALL** validar que el número de pasaporte contenga entre 3 y 20 caracteres alfanuméricos válidos.
- **[EARS-004] WHEN** el usuario alterna el tipo de documento, **THE SYSTEM SHALL** actualizar dinámicamente la etiqueta, el placeholder, las notas explicativas del SII y limpiar cualquier mensaje de error preexistente del campo.
- **[EARS-005] IF** el usuario con `Pasaporte Extranjero` ingresa un teléfono con código internacional válido, **THEN THE SYSTEM SHALL** aceptar el teléfono para la coordinación logística.
- **[EARS-006] WHEN** el usuario hace clic en `Continuar al Pago`, **THE SYSTEM SHALL** desplegar en el modal de verificación el tipo de documento exacto (RUT o Pasaporte).
- **[EARS-007] WHEN** el frontend envía la orden a `/api/mercadopago/create-preference`, **THE SYSTEM SHALL** validar en servidor el documento según el `identification_type` declarado (`rut` o `pasaporte`), rechazando únicamente las violaciones a su categoría correspondiente.
- **[EARS-008] WHERE** la orden se procesa en modo Sandbox de Mercado Pago, **THE SYSTEM SHALL** mantener el documento `Otro` / `123456789` para evitar el error `UNDEFINED SOURCE` de Mercado Libre.

---

## 4. Contratos de Datos y Firmas Conceptuales

### A. Payload de Creación de Preferencia (`/api/mercadopago/create-preference`)
```typescript
interface CustomerPayload {
  full_name: string;
  email: string;
  phone: string;
  identification_type: 'rut' | 'pasaporte'; // Opcional por compatibilidad retroactiva, default 'rut'
  identification_number: string;            // Número de RUT o Pasaporte
  rut?: string;                             // Alias conservado para retrocompatibilidad
  auth_user_id?: string | null;
  address?: string;
  commune?: string;
  region?: string;
}
```

### B. Validaciones en `src/lib/rut.ts`
- `validatePassport(passportStr: string): boolean`: Valida longitud (3-20) y caracteres alfanuméricos `^[A-Za-z0-9\-\.]{3,20}$`.
- `cleanPassport(passportStr: string): string`: Remueve espacios y normaliza a mayúsculas.
- `validateIdentification(type: 'rut' | 'pasaporte', value: string): boolean`: Función unificada de validación.

### C. Estructura en Base de Datos (`customers`)
- Columna `rut` almacena el documento de identificación formal (RUT chileno o Pasaporte).
- Columna `document_type` almacena `'rut' | 'pasaporte'` con valor por defecto `'rut'`.

---

## 5. Definition of Done (DoD)

- [x] Selector interactivo de identificación (`RUT Chileno` vs `Pasaporte Extranjero`) implementado en la Sección 2 de `src/pages/checkout.astro`.
- [x] La validación de Módulo 11 sólo se ejecuta cuando la opción `RUT Chileno` está activa.
- [x] La opción `Pasaporte` permite caracteres alfanuméricos internacionales (3 a 20 caracteres) y exime el cálculo de Módulo 11.
- [x] Los textos y placeholders cambian reactivamente en tiempo real según la selección.
- [x] El banner del SII informa adecuadamente la emisión de Boleta Electrónica para pasaportes extranjeros.
- [x] El modal de confirmación refleja con precisión si se trata de un RUT o un Pasaporte.
- [x] El backend (`/api/mercadopago/create-preference`) admite y valida condicionalmente según `identification_type`.
- [x] Se añaden pruebas unitarias y de integración en `tests/lib/rut-validator.test.ts` y `tests/checkout/guest-checkout.test.ts`.
- [x] `npm test` ejecuta y aprueba el 100% de la suite de pruebas sin ninguna regresión (0 errores, 130 tests pasados).
- [x] `npm run build` compila con 0 errores de TypeScript y empaqueta el bundle satisfactoriamente.
