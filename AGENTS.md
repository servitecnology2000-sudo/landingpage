# SERVITECNOLOGY — Centralita de Orquestación de Agentes IA (Router Maestro)

> Este repositorio opera bajo el estándar **Spec-Driven Development (SDD)** con gobernanza de 4 Hard Code-Gates y Context Routing modular.

---

## 🛠️ Comandos Principales

```bash
astro dev --background   # Iniciar servidor Astro en segundo plano
astro dev stop           # Detener servidor en segundo plano
npm run dev              # Iniciar servidor de desarrollo en primer plano
npm test                 # Ejecutar suite completa de pruebas (Vitest)
npm run build            # Compilar bundle de producción y verificar tipos
```

---

## 🌲 Mapa del Repositorio

```text
landingpage/
├── AGENTS.md                  # 🧭 Centralita de Enrutamiento (Router Maestro)
├── .agents/
│   ├── rules/                 # 🚦 Reglas atómicas de dominio (YAML frontmatter)
│   ├── specs/                 # 📋 El "QUÉ": Especificaciones Funcionales (EARS + DoD)
│   ├── plans/                 # 🛠️ El "CÓMO": Planes Técnicos de Implementación
│   └── archive/               # 📦 Historial archivado (CHANGELOG y AGENTS legacy)
├── src/
│   ├── components/            # Componentes UI reutilizables
│   ├── layouts/               # Layouts base (Main, AdminLayout)
│   ├── lib/                   # Utilidades y servicios (Supabase, MP, mailer, rut)
│   └── pages/                 # Rutas SSR/estáticas y endpoints API (/api/*)
├── supabase/migrations/       # Migraciones DDL versionadas en SQL
└── tests/                     # Suite de pruebas automatizadas (Vitest)
```

---

## 🌿 Estrategia de Ramas Git

- `main`: Rama de producción vinculada a despliegues automáticos en Vercel.
- `staging`: Entorno de homologación y validación previa.
- `feat/*` / `fix/*`: Ramas de trabajo asociadas a una especificación en `.agents/specs/`.

---

## 🚨 CRITICAL CONTEXT DIRECTIVE — EL HARD CODE-GATE (SDD)

> [!CAUTION]
> **REGLA INNEGOCIABLE DE GOBERNANZA:**
> La IA tiene **TERMINANTEMENTE PROHIBIDO** modificar o crear código de producción sin haber cumplido los 4 gates:
>
> 1. **Gate 1 (Spec Obligatoria):** Redactar `.agents/specs/<feat>.md` con formato EARS y Definition of Done (DoD). Sin código.
> 2. **Gate 2 (Plan Técnico):** Redactar `.agents/plans/<feat>.md` detallando archivos afectados (`[MODIFY]`, `[NEW]`, `[DELETE]`) y estrategia de testing.
> 3. **Gate 3 (Parada Humana Obligatoria):** La IA tiene **TERMINANTEMENTE PROHIBIDO** escribir código en el mismo turno del Plan. DEBE detenerse y esperar la aprobación explícita del usuario.
> 4. **Gate 4 (Testing Mandate & DoD):** No se cierra ninguna tarea sin ejecutar `npm test` y `npm run build` con 0 errores y certificar todos los checks del DoD en la spec.
>
> *Excepción única:* Consultas de lectura/investigación pura o correcciones tipográficas triviales de una línea.

---

## 🧭 Mapa de Enrutamiento de Contexto (Context Routing Map)

Antes de realizar cambios o proponer soluciones en un dominio específico, la IA **DEBE LEER** la regla atómica correspondiente en `.agents/rules/`:

| Dominio / Acción Solicitada | Archivo de Regla a Consultar | Foco Principal |
| :--- | :--- | :--- |
| 🚦 **Nuevo Feature, Fix o Refactor** | [`.agents/rules/sdd-workflow.md`](file:///.agents/rules/sdd-workflow.md) | Ciclo de 4 gates, plantillas EARS y criterios de parada |
| 🗄️ **Base de Datos, SQL y Supabase** | [`.agents/rules/database.md`](file:///.agents/rules/database.md) | DDL autónomo (`apply-migration.mjs`), RLS, tablas y storage |
| 🎨 **Frontend, Astro, Tailwind o UX** | [`.agents/rules/frontend.md`](file:///.agents/rules/frontend.md) | **Cero alerts nativos**, modales modernos, Schema.org |
| 💳 **Mercado Pago, Pagos y Stock** | [`.agents/rules/mercadopago-pagos.md`](file:///.agents/rules/mercadopago-pagos.md) | Sandbox MLC (`Otro` 123456789), webhooks y cancelación |
| 🔒 **Panel Admin, CRM y Logística** | [`.agents/rules/admin-crm.md`](file:///.agents/rules/admin-crm.md) | `/meson-servitecnology-st`, RUT validator, courier tracking |
| 🧪 **Testing, Build y Certificación** | [`.agents/rules/testing-calidad.md`](file:///.agents/rules/testing-calidad.md) | Vitest, Astro build, cero regresiones y tracking DoD |