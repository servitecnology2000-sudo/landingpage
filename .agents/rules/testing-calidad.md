---
description: Directrices de pruebas automatizadas con Vitest, verificación de compilación y estándares de calidad
trigger: model_decision
---

# Reglas de Testing, Calidad y Certificación

Toda modificación al código fuente en este repositorio debe pasar por validación automatizada rigurosa antes de ser considerada concluida.

---

## 1. Suite de Pruebas Automatizadas (Vitest)

- **Comando de Ejecución:**
  ```bash
  npm test
  ```
- **Alcance de la Suite:**
  - `tests/sanity.test.ts`: Integridad base del entorno.
  - `tests/lib/`: Validaciones de RUT, analytics, fechas y Nodemailer.
  - `tests/checkout/`: Reserva atómica de stock, checkout de invitado, cancelación y Mercado Pago.
  - `tests/admin/`: Guardias de autenticación, endpoints CRM y actualización de estados logísticos.
  - `tests/account/`: Portal Mis Pedidos y vinculación retroactiva.
  - `tests/legal-compliance.test.ts` & `tests/seo-audit.test.ts`: Normativas legales y SEO.

---

## 2. Compilación y Chequeo de Tipos (Astro Build)

- **Comando de Compilación:**
  ```bash
  npm run build
  ```
- **Criterio de Aceptación:** La compilación debe generar los bundles de servidor y cliente (`dist/`, `.vercel/output/`) sin advertencias críticas ni errores sintácticos.

---

## 3. Principio de Cero Regresiones

- Si una nueva característica o corrección rompe pruebas previas, la tarea **NO está terminada**.
- Toda nueva ruta o endpoint crítico debe acompañarse de su correspondiente archivo de test en `tests/<dominio>/`.

---

## 4. Trazabilidad en SDD (Sustitución de Changelog Monolítico)

- En la arquitectura SDD, el registro de avance se formaliza en el **checklist Definition of Done (DoD)** de cada especificación funcional en `.agents/specs/<feat>.md`.
- El historial detallado de cambios se preserva mediante commits descriptivos en Git (`feat: ...`, `fix: ...`, `refactor: ...`), eliminando la sobrecarga de tokens que causaban los changelogs monolíticos.

---

## 5. Verificaciones Obligatorias
- [ ] ¿Se ejecutó `npm test` y el 100% de los tests pasó exitosamente?
- [ ] ¿Se ejecutó `npm run build` con salida exitosa?
- [ ] ¿Se actualizaron todos los checks del DoD en la spec correspondiente?
