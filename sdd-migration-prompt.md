# Protocolo y Prompt Maestro: Migración de Repositorios a Estándar SDD (Spec-Driven Development)

Este documento contiene la guía completa y el **Prompt Maestro** reutilizable para transformar cualquier repositorio de software al estándar **Spec-Driven Development (SDD)** con gobernanza de agentes de Inteligencia Artificial.

---

## 1. ¿Qué es SDD y por qué se implementó?

En el desarrollo asistido por IA tradicional ("Cowboy Coding"), la IA suele:
1. Saltar directamente a modificar el código fuente (`src/`, `lib/`, etc.) sin validar requerimientos.
2. Generar regresiones silenciosas al no tener reglas de arquitectura presentes en memoria.
3. Consumir decenas de miles de tokens cargando archivos monolíticos gigantescos (ej. `AGENTS.md` de 800+ líneas o documentos PRP de 4,000+ líneas).
4. Sufrir de *amnesia de contexto*, olvidando edge cases críticos y directrices de testing.

### La Solución SDD:
Se establece una arquitectura de contexto modular basada en **Context Routing** y **4 Hard Code-Gates** innegociables. El código nunca se toca hasta que el "Qué" (Spec) y el "Cómo" (Plan) estén aprobados por un humano, y ninguna tarea se cierra sin pruebas unitarias automatizadas (`Testing Mandate`).

---

## 2. Anatomía del Repositorio SDD

Un repositorio convertido a SDD presenta la siguiente estructura:

```text
mi-proyecto/
├── AGENTS.md                          # 🧭 Centralita de Enrutamiento (Router Maestro)
├── .agents/
│   ├── rules/                         # 🚦 Reglas atómicas por dominio (con YAML frontmatter)
│   │   ├── sdd-workflow.md            # Regla madre del ciclo de 4 pasos
│   │   ├── database.md                # Reglas de base de datos / modelos / migraciones
│   │   ├── frontend-ui.md             # Directrices de componentes, UX y estilos
│   │   └── [dominio-especifico].md    # Reglas específicas de cada subsistema crítico
│   ├── specs/                         # 📋 El "QUÉ": Especificaciones Funcionales (EARS + DoD)
│   ├── plans/                         # 🛠️ El "CÓMO": Planes Técnicos de Implementación
│   └── archive/                       # 📦 Resguardo histórico de documentación monolítica
└── src/ / tests/                      # Código fuente y pruebas automatizadas
```

---

## 3. Los 4 Hard Code-Gates Innegociables

Toda IA que opere en un repositorio SDD está gobernada por 4 puertas estrictas:

1. **Gate 1 (Spec Obligatoria - El "Qué"):**
   - Redactar `.agents/specs/<feat>.md`.
   - Explica el problema de UX/negocio, la solución funcional, la sintaxis EARS y el checklist de **Definition of Done (DoD)**.
   - **PROHIBIDO** incluir código de implementación en este paso.

2. **Gate 2 (Plan Técnico - El "Cómo"):**
   - Redactar `.agents/plans/<feat>.md`.
   - Detalla los archivos a modificar (`[MODIFY]`, `[NEW]`, `[DELETE]`), modelos de datos, contratos de API y suite de tests unitarios que certificarán el DoD.

3. **Gate 3 (Parada Humana Obligatoria):**
   - La IA tiene **TERMINANTEMENTE PROHIBIDO** escribir código en el mismo turno en que propone el Plan.
   - **DEBE** detener su ejecución y esperar el "Aprobado" explícito del desarrollador.

4. **Gate 4 (Testing Mandate & DoD):**
   - Una vez codificado, ejecutar la suite de pruebas unitarias y typechecking del proyecto con 0 errores.
   - Actualizar el estado del Spec a `Completado` y marcar todos los checks `- [x]` del DoD.
   - Adjuntar la salida real de los tests en la bitácora o walkthrough.

---

## 4. Formatos Estándar de Documentación

### A. Plantilla de Especificación Funcional (`.agents/specs/<feature>.md`)
```markdown
# Feature Spec: [Título Claro del Feature / Fix]

> **Ubicación:** `.agents/specs/[nombre-del-feat].md`  
> **Estado:** Borrador | Aprobado por el Usuario | En Implementación | Completado  
> **Fecha:** [Mes Año]  
> **Referencia:** [Enlace al plan técnico](../plans/[nombre-del-feat].md)

---

## 1. Problema y Fricción de Usuario (UX)
Explica la fricción actual, la confusión conceptual, el dolor que experimenta el usuario final o el bug técnico de negocio.

---

## 2. Solución Funcional y Arquitectura de Pantallas
Describe la solución funcional, pantallas involucradas, modales, flujos de usuario y comportamiento del sistema sin código técnico.

---

## 3. Requisitos EARS (Easy Approach to Requirements Syntax)
- **WHEN** [evento gatillador], **THE SYSTEM SHALL** [comportamiento esperado].
- **WHERE** [condición de contexto/rol/estado], **THE SYSTEM SHALL** [comportamiento].
- **IF** [error/excepción], **THEN THE SYSTEM SHALL** [manejo de error/fallback].

---

## 4. Endpoints / Contratos Requeridos (si aplica)
Detalla contratos de datos esperados, Server Actions, endpoints REST/GraphQL o firmas de servicio.

---

## 5. Definition of Done (DoD) Checklist
- [ ] Endpoint / servicio / acción creada o actualizada.
- [ ] Componente UI integrado respetando directrices de diseño.
- [ ] Suite de pruebas unitarias automatizadas (`tests/...`).
- [ ] Cero regresiones en la suite de pruebas y typechecking del proyecto.
```

---

### B. Plantilla de Plan Técnico (`.agents/plans/<feature>.md`)
```markdown
# Plan Técnico: [Título Claro del Feature / Fix]

> **Ubicación:** `.agents/plans/[nombre-del-feat].md`  
> **Estado:** Borrador | Aprobado | Completado  
> **Fecha:** [Mes Año]  
> **Referencia Spec:** [Especificación Funcional](../specs/[nombre-del-feat].md)

---

## 1. Resumen de la Arquitectura
Resumen conciso del enfoque técnico, patrones de diseño a utilizar, librerías involucradas y consideraciones de seguridad/rendimiento.

---

## 2. Archivos a Modificar / Crear
Detalle archivo por archivo:
- **`[MODIFY]` `ruta/al/archivo.ts`:**
  - Breve descripción del cambio a realizar.
- **`[NEW]` `ruta/al/nuevo-archivo.ts`:**
  - Responsabilidad del nuevo archivo.
- **`[NEW]` `tests/.../archivo.test.ts`:**
  - Casos de prueba específicos que garantizarán el DoD.

---

## 3. Pruebas Unitarias y Verificación
Comandos exactos para verificar la solución:
- Comando de pruebas: `npm test` / `pytest` / `go test`
- Comando de tipos / linter: `npx tsc --noEmit` / `flake8`
```

---

### C. Plantilla de Regla Modular (`.agents/rules/<dominio>.md`)
```markdown
---
description: Reglas y directrices críticas sobre [Dominio / Base de Datos / UI / Integraciones]
trigger: model_decision
---

# Reglas de [Dominio]

## 1. Principios Clave
- [Directriz 1]
- [Directriz 2]

## 2. Trampas Comunes y Gotchas Evitados (Lessons Learned)
- **Anti-patrón:** [Descripción de lo que NO se debe hacer].
- **Solución correcta:** [Cómo debe implementarse].

## 3. Verificaciones Obligatorias
- [Checklist rápido para este dominio].
```

---

### D. Plantilla de Router Maestro (`AGENTS.md` en la raíz)
```markdown
# [Nombre del Proyecto] — Guía de Orquestación de Agentes IA

> Este repositorio opera bajo **Spec-Driven Development (SDD)**.

## 🛠️ Comandos Principales
\`\`\`bash
npm run dev          # Iniciar servidor de desarrollo
npm test             # Ejecutar suite de pruebas automatizadas
npx tsc --noEmit     # Verificación estricta de tipos
\`\`\`

---

## 🧭 Mapa de Arquitectura IA (Context Routing)

> **CRITICAL CONTEXT DIRECTIVE — EL HARD CODE-GATE (SDD):** Este proyecto opera estrictamente bajo **Spec-Driven Development (SDD)**. La IA tiene terminantemente PROHIBIDO escribir o refactorizar código sin cumplir los 4 gates:
> 1. **Gate 1 (Spec Obligatoria):** Todo nuevo feature, refactor o fix complejo exige redactar o actualizar su spec en \`.agents/specs/\`.
> 2. **Gate 2 (Plan Técnico):** No se toca código fuente sin redactar el plan técnico en \`.agents/plans/\`.
> 3. **Gate 3 (Parada Humana Obligatoria):** La IA tiene terminantemente PROHIBIDO escribir código en el mismo turno en que propone el Plan. DEBE detenerse y esperar la aprobación explícita del usuario.
> 4. **Gate 4 (Testing Mandate & DoD):** Ninguna tarea se da por cerrada sin ejecutar las pruebas unitarias y typecheck con 0 errores y actualizar el checklist DoD del spec.
> *Excepción única:* Consultas puramente investigativas/lectura o corrección de typos triviales.

Antes de interactuar con cualquier dominio del sistema, debes leer la regla correspondiente en \`.agents/rules/\`:

1. 🚦 **¿Vas a proponer un nuevo Feat o Fix?**
   - **DEBES LEER:** \`.agents/rules/sdd-workflow.md\`
2. 🗄️ **¿Vas a tocar Base de Datos, Modelos o Migraciones?**
   - **DEBES LEER:** \`.agents/rules/database.md\`
3. 🎨 **¿Vas a tocar Frontend, Componentes o Estilos?**
   - **DEBES LEER:** \`.agents/rules/frontend.md\`
4. ⚙️ **¿Vas a tocar [Otro Dominio Crítico]?**
   - **DEBES LEER:** \`.agents/rules/[dominio].md\`
```

---

# 🚀 PROMPT MAESTRO PARA COPIAR Y PEGAR EN OTRA IA

> **Instrucciones:** Copia el bloque siguiente y pégalo en el chat de tu agente de IA (Antigravity, Claude Code, Cursor, Copilot Workspace o ChatGPT) en la raíz del nuevo proyecto que deseas transformar a SDD.

```markdown
Actúa como un Ingeniero Principal de Software y Arquitecto de Sistemas experto en Gobernanza de Contexto para Agentes de Inteligencia Artificial.

Tu misión es transformar completamente este repositorio al estándar de ingeniería **Spec-Driven Development (SDD)** con Arquitectura de Context Routing y 4 Hard Code-Gates.

Realiza la migración siguiendo rigurosamente estos 6 pasos ordenados:

---

### FASE 1: Auditoría e Inventario del Proyecto
1. Inspecciona el repositorio actual (`package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, etc.):
   - Identifica el lenguaje, frameworks, suite de tests existente (`vitest`, `jest`, `pytest`, etc.) y linter/typechecker.
   - Detecta los dominios o subsistemas principales del proyecto (ej: backend/api, UI/frontend, base de datos/ORM, servicios de terceros, workers/colas, automatizaciones).
   - Localiza documentación previa dispersa (`docs/`, `PRPs/`, `AGENTS.md` legacy, `README.md`, etc.).

---

### FASE 2: Creación de la Estructura `.agents/`
Crea la siguiente estructura de directorios en la raíz del repositorio:
- `.agents/rules/`
- `.agents/specs/`
- `.agents/plans/`
- `.agents/archive/`

---

### FASE 3: Limpieza y Preservación de Memoria Histórica
1. Si existen archivos de contexto gigantescos o monolíticos (ej. un `AGENTS.md` de cientos de líneas, PRPs extensos o documentación obsoleta):
   - Muévelos a `.agents/archive/` para no perder su historia pero limpiar por completo la ventana de tokens activa.

---

### FASE 4: Extracción de Reglas Modulares de Dominio
1. En `.agents/rules/sdd-workflow.md`, implementa la regla madre del flujo de 4 pasos (Spec -> Plan -> Parada Humana -> Ejecución + Tests).
2. Para cada dominio crítico detectado en la Fase 1 (ej: base de datos, frontend, integraciones de terceros, worker/motor de automatización):
   - Crea un archivo `.agents/rules/<dominio>.md`.
   - Cada regla debe incluir encabezado YAML frontmatter:
     ```yaml
     ---
     description: Reglas críticas y anti-patrones para [dominio]
     trigger: model_decision
     ---
     ```
   - Extrae en viñetas claras las mejores prácticas, trampas comunes (gotchas) y decisiones de arquitectura del proyecto.

---

### FASE 5: Construcción del Router Maestro (`AGENTS.md` en la raíz)
Reescribe o crea el archivo `AGENTS.md` en la raíz del proyecto. Debe ser conciso (~80-120 líneas), altamente estructurado y contener:
1. **Mapa del Directorio:** Resumen visual del árbol de carpetas del repositorio.
2. **Comandos Principales:** Comandos exactos para dev, build, tests y typecheck/lint detectados en la Fase 1.
3. **Estrategia de Ramas:** Directrices de git (`main`, `staging`, ramas de features).
4. **CRITICAL CONTEXT DIRECTIVE — EL HARD CODE-GATE (SDD):**
   - **Gate 1 (Spec Obligatoria):** Todo nuevo feature/fix exige redactar spec en `.agents/specs/` con formato EARS y Definition of Done (DoD).
   - **Gate 2 (Plan Técnico):** Prohibido tocar código fuente sin plan técnico detallado en `.agents/plans/`.
   - **Gate 3 (Parada Humana Obligatoria):** La IA tiene TERMINANTEMENTE PROHIBIDO escribir código en el mismo turno en que propone el Plan. DEBE detenerse y pedir aprobación explícita al usuario.
   - **Gate 4 (Testing Mandate & DoD):** Prohibido cerrar tareas sin ejecutar tests automatizados con 0 errores y tildar el DoD.
5. **Context Routing Map:** Tabla de decisión que guíe a la IA a leer la regla correspondiente en `.agents/rules/<archivo>.md` según lo que el usuario le pida.

---

### FASE 6: Validación y Reporte
1. Comprueba que no queden rutas rotas ni archivos duplicados.
2. Preséntame un reporte de lo realizado indicando:
   - Los dominios identificados y las reglas creadas en `.agents/rules/`.
   - Los comandos de testing y typechecking configurados.
   - La estructura final de `.agents/`.
   - La confirmación de que a partir de este momento cualquier nueva tarea debe pasar por los 4 Gates.

¡Comienza ahora mismo con la FASE 1 y realiza la transformación!
```
