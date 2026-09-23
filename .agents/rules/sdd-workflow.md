---
description: Regla madre de gobernanza del ciclo Spec-Driven Development (SDD) y los 4 Hard Code-Gates innegociables
trigger: model_decision
---

# Regla Madre: Flujo de Trabajo SDD (Spec-Driven Development)

Este repositorio opera estrictamente bajo el estándar **Spec-Driven Development (SDD)**. Está terminantemente prohibido modificar código fuente sin haber completado y certificado los 4 pasos del ciclo.

---

## 1. Los 4 Hard Code-Gates Innegociables

```text
[Requerimiento] ──> [Gate 1: Spec EARS + DoD] ──> [Gate 2: Plan Técnico] ──> [Gate 3: Parada Humana] ──(Aprobado)──> [Gate 4: Código + Tests 0 errores]
```

### 🚪 Gate 1: Especificación Funcional Obligatoria (El "Qué")
- **Archivo:** `.agents/specs/<feature-o-fix>.md`
- **Contenido obligatorio:**
  1. Problema y Fricción de Usuario (UX) o justificación técnica de negocio.
  2. Solución Funcional y Arquitectura de Pantallas/Flujos (sin código).
  3. Requisitos en sintaxis **EARS** (*WHEN... THE SYSTEM SHALL...*, *WHERE...*, *IF... THEN...*).
  4. Contratos de datos o endpoints requeridos (firmas conceptuales).
  5. Checklist de **Definition of Done (DoD)**.
- **Restricción estricta:** **PROHIBIDO** incluir código de implementación en este documento.

### 🚪 Gate 2: Plan Técnico de Implementación (El "Cómo")
- **Archivo:** `.agents/plans/<feature-o-fix>.md`
- **Contenido obligatorio:**
  1. Resumen técnico de la arquitectura, patrones, seguridad y rendimiento.
  2. Detalle explícito archivo por archivo:
     - `[MODIFY]` `ruta/archivo.ext`: Razón del cambio y bloques afectados.
     - `[NEW]` `ruta/archivo.ext`: Responsabilidad del nuevo archivo.
     - `[DELETE]` `ruta/archivo.ext`: Justificación de eliminación.
     - `[NEW]` `tests/.../archivo.test.ts`: Pruebas específicas que certificarán el DoD.
  3. Comandos de verificación exactos (`npm test`, `npm run build`).

### 🛑 Gate 3: Parada Humana Obligatoria (Human-in-the-Loop)
- La IA tiene **TERMINANTEMENTE PROHIBIDO** escribir o modificar código de implementación en el mismo turno en el que propone el Plan Técnico.
- La IA **DEBE** detener su ejecución, presentar el enlace al Plan y esperar la aprobación explícita del desarrollador (ej. *"procede"*, *"aprobado"*).
- *Excepción única:* Tareas puramente investigativas (lectura, explicación de arquitectura) o corrección de erratas tipográficas triviales de una línea.

### 🧪 Gate 4: Testing Mandate y Certificación del DoD
- Tras recibir la aprobación humana y aplicar los cambios:
  1. Ejecutar la suite automatizada: `npm test` (Vitest).
  2. Ejecutar la compilación y verificación de tipos: `npm run build` (Astro build).
  3. Ambos comandos deben concluir con **cero errores** y **cero regresiones**.
  4. Actualizar el archivo `.agents/specs/<feature-o-fix>.md`:
     - Cambiar `Estado: En Implementación` a `Estado: Completado`.
     - Marcar todos los ítems del DoD como cumplidos: `- [x]`.
  5. Adjuntar evidencia real de la ejecución de pruebas en el reporte final.

---

## 2. Trampas Comunes y Gotchas Evitados (Lessons Learned)

- **Anti-patrón (Cowboy Coding):** Saltar a editar archivos en `src/` ante la primera orden del usuario.
  - **Solución SDD:** Redactar Spec (Gate 1) -> Plan (Gate 2) -> Detenerse (Gate 3).
- **Anti-patrón (Amnesia de Contexto):** Olvidar reglas de negocio o crear regresiones silenciosas.
  - **Solución SDD:** Consultar siempre la regla modular correspondiente en `.agents/rules/` antes de diseñar la solución.
- **Anti-patrón (Cierre sin Pruebas):** Dar por finalizada una tarea diciendo *"debería funcionar"*.
  - **Solución SDD:** Ninguna tarea se cierra sin la salida real de `npm test` y `npm run build` demostrada en terminal.

---

## 3. Checklist Rápido de Validación para la IA
- [ ] ¿Existe una Spec con EARS y DoD en `.agents/specs/`?
- [ ] ¿Existe un Plan técnico detallado en `.agents/plans/`?
- [ ] ¿Se respetó la parada humana antes de tocar el código?
- [ ] ¿Pasaron el 100% de los tests en Vitest sin regresiones?
- [ ] ¿Se marcó el DoD como completado en la Spec?
