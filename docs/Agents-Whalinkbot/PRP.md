# Product Requirements Plan (PRP) - WhatsApp SaaS

Este documento define la hoja de ruta, las funcionalidades basadas en `autowabot_funcionalidades.md`, el estado actual y las implementaciones técnicas a seguir. En este documento, el **Testing** es parte de la *Definición de Terminado* (Definition of Done) para cada fase, asegurando estándares de nivel corporativo. Deberá mantenerse actualizado conforme evolucione el proyecto.

### Integración Continua y Regresión (CI/CD)
Como estándar profesional, todos los tests definidos en cada fase se ejecutan de forma automatizada. Si una fase nueva rompe el código de una fase anterior, el sistema de tests evitará esta "regresión" marcando un fallo inmediatamente. Estos tests servirán de base para futuros pipelines (ej. GitHub Actions).

---

## Fase 0: Arquitectura Base y Panel de Control (Estado Actual) --> COMPLETED
**Objetivo:** Establecer la fundación tecnológica del sistema para soportar procesamiento asíncrono pesado y dotar al usuario de los paneles esenciales de monitoreo.
**Implementación Técnica:**
- Stack Base: Next.js 15, PostgreSQL (Prisma), BullMQ (Redis) y Docker.
- Paneles Base: `/connection`, `/metrics`, `/keywords`, `/groups`, `/messages`.
- Infraestructura de Recepción (Webhooks): Captura de eventos mediante `BullMQ` (`webhookWorker.ts`), logrando procesar grandes volúmenes entrantes sin bloquear el Event Loop.
**Pruebas y QA (Cobertura Necesaria):**
- [x] *Unit Tests:* Validación de parsing de payloads desde Evolution API a la interfaz del sistema.
- [x] *Worker Tests:* Enviar ráfagas simuladas de webhooks a la ruta `/api/webhooks/evolution` y validar que BullMQ encole y procese los trabajos (Jobs) correctamente bajo alta concurrencia (Stress Test).
- [x] *Integration Tests:* Asegurar que los datos ingresados desde el Webhook se insertan correctamente en las tablas `Message` y `Contact`.

## Fase 1: Refactorización de Arquitectura de Rutas (UI/UX) --> COMPLETED
**Objetivo:** Reorganizar la estructura del panel de control utilizando Route Groups para eliminar el segmento `/dashboard/` de las URLs, mejorando la estética de la navegación.
**Implementación Técnica:**
- Renombrar `src/app/dashboard` a `src/app/(dashboard)`.
- Refactorización global de `next/link` y rutas de redirección en middlewares.
**Pruebas y QA (Cobertura Necesaria):**
- [x] *E2E Tests:* Navegación completa autenticada mediante Playwright, haciendo clic en cada opción del menú lateral (`/connection`, `/metrics`, `/groups`) para garantizar que la nueva estructura de Route Group cargue los Layouts sin errores 404.

## Fase 2: Sistema de Calentamiento de Cuentas (WhatsApp Warmer) --> COMPLETED
**Objetivo:** Evitar el baneo inmediato de números nuevos mediante un sistema automático de chat bidireccional, simulando interacción humana para que WhatsApp clasifique el número como "fiable".
**Implementación Técnica:**
- Diferenciación en la BD (`Role` = `MAIN` vs `WARMER`). Límite de 1 MAIN y 2 WARMERs por usuario.
- Interfaz en `/connection` (Visualización del MAIN y su número telefónico) y nueva vista `/warmer` (Gestión, Conexión y Eliminación de WARMERs, y configuración de min/max delays en segundos).
- `warmerWorker.ts` aislado en BullMQ que alterna emisores iterando sobre `currentLineIndex`.
**Pruebas y QA (Cobertura Necesaria):**
- [x] *Unit Tests:* Lógica de turnos (comprobar que la condición par/impar seleccione el emisor correcto) e inyección de delays aleatorios.
- [x] *Integration Tests (Seguridad Crítica):* Consultas a Prisma para confirmar estrictamente que una cuenta `WARMER` no puede ser seleccionada por el worker de campañas masivas (Fase 4).
- [x] *E2E Tests:* Flujo completo desde conectar código QR en `/warmer` hasta establecer configuraciones en el formulario de la UI.

## Fase 3: Refactorización de Landing Page y Captación (Lead Gen) --> COMPLETED
**Objetivo:** Optimizar la conversión comercial replicando estructura competitiva (Casos de uso, Beneficios) con un modal de captación de retardo.
**Implementación Técnica:**
- Mejora de `src/app/page.tsx` con UI/UX moderno (Glassmorphism).
- `LeadCaptureModal`: Componente de react activado por tiempo/scroll para recolectar información de prospectos y almacenarlos.
**Pruebas y QA (Cobertura Necesaria):**
- [x] *E2E Tests:* Simulación del paso de tiempo y validación de aparición del `LeadCaptureModal`. Validación de inputs de formulario y submit.

---

## Fase 3.5: Cobertura de Tests Base (Retroactivo) --> COMPLETED
**Objetivo:** Instalar el entorno de pruebas profesional (Vitest) y asegurar la infraestructura crítica ya construida (Fases 0 a 3) antes de avanzar a procesos masivos más complejos.
**Implementación Técnica:**
- Instalación y configuración de `vitest`, `@testing-library/react`, y soporte para testear endpoints y funciones aisladas de TypeScript.
**Pruebas y QA a Implementar Inmediatamente:**
- [x] *Warmer Logic:* Asegurar alternancia par/impar en `warmerWorker.ts`.
- [x] *Prisma Mocks:* Validar que el rol `WARMER` se excluya correctamente de búsquedas de `MAIN` (Implementado con `vitest-mock-extended`).
- [x] *Parsers:* Extracción correcta de `ownerJid` (número telefónico) aislando el string con `.split("@")[0]`.

---

## Fase 4: Cola de Emisión Masiva y Anti-Ban (Módulos 1 y 2) --> COMPLETED
**Objetivo:** Desarrollar el Módulo de Prospección en Frío garantizando envío masivo sin riesgo de baneos de WhatsApp, aplicando varianzas orgánicas y simulación de tipeo.
**Implementación Técnica:**
- **Rate Limiting:** `campaignWorker.ts` usando BullMQ. Pausas automáticas de 20 a 35 segundos entre ráfagas de procesamiento.
- **Humanización y Varianzas:** Inyección de varianza matemática en `nextPublishDate` ("Humanización %").
- **Tipeo Dinámico:** Uso del estado `presence: "composing"` calculado en base a la longitud del mensaje.
- **Selección de Audiencia Inteligente:** Multi-Select dinámico en base a los `sources` (orígenes) únicos de la tabla de leads, procesados en bloque por PostgreSQL.
- **Rotación de Instancias:** Emisor A manda límite, pausa, Emisor B continúa.
**Pruebas y QA (Test-Driven Development Recomendado):**
- [x] *Unit Tests:* Verificar estrictamente los cálculos matemáticos de los tiempos de pausa y `composing`. Asegurar que límites (ej. max 6 segundos) no se excedan jamás.
- [x] *Unit Tests (Multi-Select):* Aislar y verificar el algoritmo de `buildSourceFilter` en `outreachCron.ts` para garantizar el parsing seguro de Arrays JSON y búsquedas exactas con `IN`.
- [x] *Worker Tests:* Simular 500 envíos encolados, revisar en logs que el worker pausa forzosamente los 30 segundos tras enviar una ráfaga.
- [x] *E2E Tests:* Flujo corregido. Crear y lanzar una campaña masiva desde el frontend a través de `/api/instance?role=MAIN` al worker.
- [x] *Unit/Integration Tests (Métricas):* Refactor de base de datos para nombrar campañas y separar conteos (Grupos vs 1-a-1) y refactorización UI con Tabs para modularizar la vista de rendimiento.

## Fase 5: Scraper de Participantes de Grupos (Módulo 4 Avanzado) --> COMPLETED
**Objetivo:** Aprovechar las comunidades como fuente de prospección. Extracción automática.
**Implementación Técnica:**
- `GroupScraperWorker` dedicado a consumir `/group/findGroupMetaData` (reemplazado de forma robusta por `/group/fetchAllGroups`).
- Filtro de administradores y guardado en bloque (*Bulk Insert*) en tabla `Lead`. Extracción segura sorteando ocultamiento de IDs de privacidad (`@lid`).
**Pruebas y QA:**
- [x] *Integration Tests:* Mock de un payload de Evolution API con 5,000 participantes. Verificar que la inserción a PostgreSQL no tumbe la BD y retorne el conteo exacto de leads filtrados.

## Fase 5.5: Administración de Base de Prospectos (CRUD) --> COMPLETED
**Objetivo:** Dotar a la vista `/leads` de un control administrativo total, permitiendo gestión y depuración masiva del pipeline de ventas.
**Implementación Técnica:**
- Desarrollo de API Endpoints seguros (`PATCH`, `DELETE`) para modificación individual y borrado masivo.
- UI completa en `/leads` con selección múltiple (checkboxes), borrado por lotes, creación manual mediante modal, y edición directa.
- **Importación CSV Centralizada:** Botón e interfaz nativa en `/leads` para cargar bases de datos externas (`Nombre, Teléfono, Email`), procesadas asíncronamente con protección contra duplicados.
- **División por Lotes Seguro:** Algoritmo en Backend que divide borrados masivos e importaciones CSV en porciones de 1,000 registros previniendo timeouts y Statement Too Long errors en PostgreSQL.
**Pruebas y QA:**
- [x] *Integration Tests:* Simulador de carga `leadsCrud.test.ts` con 5,000 IDs de prueba asegurando matemáticamente que la base de datos divida el trabajo en exactamente 5 interacciones optimizadas con Prisma.


## Fase 5.6: Modernización de Alertas y Confirmaciones UI/UX --> COMPLETED
**Objetivo:** Erradicar todos los mensajes nativos del navegador (`window.alert`, `window.confirm`) y sustituirlos por notificaciones y modales asincrónicos modernos con Glassmorphism, mejorando sustancialmente la Experiencia de Usuario (UX).
**Implementación Técnica:**
- Instalación e integración de `react-hot-toast` mediante un Provider global en `layout.tsx`.
- Creación de un Custom Hook asíncrono `useConfirm` acoplado a un Modal de Tailwind CSS v4 para reemplazar funciones síncronas bloqueantes.
- Refactorización masiva en las 6 vistas previamente construidas (`/connection`, `/leads`, `/scraper-groups`, `/warmer`, `/outreach`, `/messages`) asegurando que ninguna alerta antigua sobreviva.
**Pruebas y QA:**
- [x] *Unit/Component Tests:* Verificar que el componente `ToasterProvider` y el modal `ConfirmDialog` se rendericen correctamente y respondan a interacciones de usuario.

## Fase 5.7: Unión Masiva a Grupos por Enlace (Add-on) --> COMPLETED
**Objetivo:** Permitir al usuario unirse automáticamente a múltiples grupos de WhatsApp pegando una lista de enlaces de invitación en bloque, utilizando exclusivamente su cuenta principal (MAIN) y aplicando un delay individual y pausas aleatorias de cooldown para proteger la cuenta contra baneos.
**Implementación Técnica:**
- Pestañas con diseño Glassmorphic en `/groups` para cambiar entre el listado sincronizado y la nueva sección.
- Entrada de texto libre (`<textarea>`) que extrae automáticamente códigos de invitación mediante expresión regular `/chat\.whatsapp\.com\/([a-zA-Z0-9_-]+)/g`.
- Endpoint `POST /api/groups/join` que valida y filtra estrictamente la instancia principal (`MAIN`).
- Worker de BullMQ (`groupJoinWorker.ts`) con retardo aleatorio de 2-5s entre cada grupo y cooldown de 45-120s cada 10 uniones.
- Panel de estado y registro detallado con polling automático e inserción/actualización directa en la tabla `GroupConfig` de Prisma.
**Pruebas y QA:**
- [x] *Regex parsing validation:* Extracción correcta de códigos desde bloques de texto mixtos (chats, URLs limpias, parámetros de consulta).
- [x] *Instance verification:* Bloqueo estricto del inicio de uniones si no hay instancia MAIN o si está desconectada.
- [x] *Anti-ban control:* Pausa aleatoria controlada entre uniones y activación del temporizador de cooldown en Redis.

## Fase 5.8: Monitoreo con Instancia Virtual (Bot Central) --> COMPLETED
**Objetivo:** Permitir a los clientes (tenants) monitorear grupos sin tener que escanear un código QR. Utilizan el número de WhatsApp del Superadmin como Bot Central, que se agrega a sus grupos y ellos gestionan las alertas de forma aislada.
**Implementación Técnica:**
- Adición de rol `VIRTUAL` en `prisma/schema.prisma` para separar instancias virtuales (Bot Central) de instancias físicas (`MAIN`, `WARMER`).
- Desarrollo de API `/api/whatsapp/virtual` y `/api/whatsapp/status` para manejar la UI con sistema de pestañas (Tabs: "Usar mi Número (QR)" vs "Usar Bot Central").
- **Auto-Reclamo Inteligente:** Integración en `webhookWorker.ts` del evento `group-participants.update` de Evolution API. Cuando un usuario registrado (validado por su `phoneNumber` virtual) añade al bot a un grupo, el sistema automáticamente vincula el `GroupConfig` a su Instancia Virtual en background sin requerir comandos de texto.
- **Alertas Aisladas:** Procesamiento de `MESSAGES_UPSERT` para buscar palabras clave sólo dentro del contexto de la Instancia Virtual asignada al grupo, enviando alertas inmediatas a través de la instancia del Superadmin.
**Pruebas y QA:**
- [x] *Unit/Worker Tests:* Testeado con Vitest en `src/tests/webhookWorker.test.ts`.
- [x] Auto-reclamo exitoso: Validado que si un participante autorizado añade al bot (`action: add`), se crea un `GroupConfig` atado a su `virt_123` con `scanEnabled: true`.
- [x] Procesamiento de Palabras Clave: Validado que los mensajes entrantes disparan `keywordHit.create` e invocan a `sendMessage` a través de `superadmin_inst` si coinciden con los keywords del inquilino aislado.

## Fase 5.9: Redundancia Bot Central (Red de Nodos) --> COMPLETED
**Objetivo:** Eliminar el punto único de fallo (SPOF) del Bot Central permitiendo que el SuperAdmin conecte múltiples números de WhatsApp simultáneamente para evadir baneos.
**Implementación Técnica:**
- **Deduplicación de Webhooks (Redis):** Filtro `SETNX` por WAMID para que si varios bots centrales leen el mismo mensaje de un grupo, solo se le envíe una alerta al cliente y se bloqueen los demás.
- **Sincronización Automática (Humanizada):** Nuevo `botCentralSyncWorker` que, al vincular un nuevo número de bot, se une paulatinamente a todos los grupos de la tabla `GlobalInviteLink` respetando los retardos anti-spam de `SystemSettings`.
- **UI de SuperAdmin:** Rediseño completo de `/connection` para SuperAdmin mostrando una cuadrícula (Grid) interactiva de instancias activas.
**Pruebas y QA:**
- [x] *Unit/Worker Tests:* Testeado con scripts `test-webhook-dedup.ts`, `test-global-link-upsert.ts` y `test-sync-worker-delays.ts`.
- [x] Interfaz condicional validada correctamente para usuarios con rol `SUPERADMIN`.
## Fase 6: Lead Sourcing desde B2B / Google Maps (Módulo 3) --> COMPLETED
**Objetivo:** Generación activa de leads corporativos locales usando fuentes públicas (Google Places API).
**Implementación Técnica:**
- Desarrollo de Arquitectura BYOK (Bring Your Own Key) para la API de Google Maps evitando abuso de cuotas.
- **Seguridad At-Rest:** Cifrado simétrico avanzado (AES-256-CBC) para proteger la API Key de cada usuario en la base de datos PostgreSQL, implementado mediante `crypto` nativo de Node.js.
- Vista `/sourcing` con formulario de consulta, selección de País y límites estrictos (Min 5, Max 500) implementada con diseño Glassmorphism.
- Worker asíncrono BullMQ `b2bScraperWorker.ts` procesa las consultas masivas a Google Places en segundo plano, evitando bloqueos de Next.js.
- Validaciones estrictas de números de teléfono utilizando `libphonenumber-js/core` con base de datos de metadatos `max`, descartando automáticamente teléfonos fijos para evitar enviar WhatsApps inválidos, e incluyendo reglas forzadas (ej. Chile = obligatorio `+569`).
- Origen Dinámico: Cada lead extraído se guarda con una etiqueta única (Ej: `Restaurantes en Providencia - 14-06-2026, 0:55:00`) para agruparlos en futuras campañas.
**Pruebas y QA:**
- [x] *Mock Tests:* Aislar la API externa para no gastar créditos. Testear el mapeo de datos al formato interno del SaaS.
- [x] *E2E Tests:* Formulario de prospección.


## Fase 7: Dashboard Avanzado por Campaña & Métricas de Apertura --> COMPLETED
**Objetivo:** Reestructurar la vista `/metrics` para que pase de ser "Global" a ser "Específica por Campaña", añadiendo métricas de Apertura (Read Receipts) y gestión de ciclo de vida (eliminación).
**Implementación Técnica:**
- **Rediseño UI en `/metrics`:** 
  - Selector de campañas (Grupos y 1-a-1). Las tarjetas de métricas se actualizarán dinámicamente según la campaña seleccionada.
  - Botón de eliminación con confirmación (Modal Glassmorphism) que ejecute un borrado en cascada (elimina campaña y todos sus logs).
- **Tracking de Apertura (Read Rate):**
  - Actualizar Prisma schema: Añadir `DELIVERED` y `READ` al enum `LogStatus`.
  - Capturar el evento `messages-update` en el Webhook de Evolution API (`webhookWorker.ts` / `route.ts`) para actualizar el log a "Leído" cuando los doble-checks se pongan azules.
**Pruebas y QA:**
- [x] *Component Tests:* Verificar que al seleccionar diferentes campañas cambien las métricas mostradas en pantalla.
- [x] *Integration Tests:* Simular webhook de lectura y verificar actualización de estado en DB.

## Fase 8: Feedback en Tiempo Real (SSE + Redis Pub/Sub) --> PENDING
**Objetivo:** Dotar de "vida" a las vistas existentes (`/messages`, `/outreach`, `/metrics`, y `/sourcing`) para reflejar el progreso de los envíos en tiempo real mediante Server-Sent Events (SSE).
**Análisis de Escalabilidad (SaaS Multitenant):**
- *Server-Sent Events (SSE) + Redis Pub/Sub (✅ Recomendado):* La solución ideal. Ya tenemos Redis corriendo. El Worker publicará los eventos de progreso en Redis, y Next.js mantendrá una conexión SSE muy ligera de un solo sentido (Servidor -> Cliente) para actualizar la UI. No satura la base de datos y es muy eficiente en recursos del VPS en lugar de hacer Polling o WebSockets complejos.
**Implementación Técnica:**
- **Streaming SSE:** Crear endpoint genérico (`/api/realtime`) suscrito a Redis Pub/Sub para empujar actualizaciones a la UI sin saturar PostgreSQL.
- Consumir el stream SSE desde los componentes React usando `useEffect` nativo o SWR, actualizando barras de progreso, listados y métricas instantáneamente.
**Pruebas y QA:**
- [ ] *Load Testing:* Conectar múltiples clientes simulados para garantizar que el streaming de eventos SSE no sature la memoria del contenedor de Next.js.
- [ ] *E2E Tests:* Disparar evento en background worker y confirmar que un cliente en la UI actualiza el porcentaje de progreso de campañas o extracciones sin refrescar la página.

## Fase 9: Sistema de Suscripciones y Control de Límites Multitenant --> COMPLETED
**Objetivo:** Implementar las cuotas de uso (Rate Limiting y Row Limits) según el plan contratado por el tenant (PRO vs MAX) para proteger los recursos del SaaS y monetizar correctamente.
**### Pasos de Implementación

- [x] **Actualizar Prisma Schema**: Añadir enum `Plan` (`PRO`, `MAX`, `MVP_10990`) al modelo `User`.
- [x] **Crear motor de límites (`src/lib/limits.ts`)**: Mapear cada plan con sus topes (ej. Max 20,000 leads para PRO).
- [x] **Integración de Pasarela de Pagos**:
  - [x] Investigar y documentar flujos de Transbank y Lemon Squeezy en `implementation_plan.md`.
  - [x] Implementar webhooks / endpoints para procesar upgrades.
- [x] **Bloquear APIs (Backend)**: Modificar `POST /api/leads/import`, `POST /api/instance` y `GET /api/sourcing` para retornar `403 Upgrade Required` si el usuario supera la cuota.
- [x] **UI Locking**: Crear la ruta `/billing` para hacer upgrade, y añadir "Lock UI" a botones bloqueados.
- [x] **Automated Tests**:
  - [x] Ejecutar vitest y crear pruebas específicas en `limits.test.ts`.
  - [x] Simular un usuario PRO intentando sobrepasar su cuota de leads.
  - [x] Simular a un usuario MAX comprobando que se le permiten operaciones exclusivas.
- [x] *Integration Tests:* Intentos forzados de creación de campañas directas para asegurar que el backend bloquee accesos no permitidos.

## Fase 9.1: Cuentas de Prueba Gratuitas (Free Trials 3 Días) --> COMPLETED
**Objetivo:** Permitir a los nuevos usuarios registrados experimentar con el Plan MAX durante 72 horas para engancharlos al SaaS, asegurando el bloqueo absoluto de sus cuotas si el tiempo expira.
**Implementación Técnica:**
- Adición de `trialEndsAt DateTime?` a la base de datos de usuarios en Prisma.
- Modificación del motor de límites (`limits.ts`) para forzar un límite absoluto de cero (`0` o `false`) si `trialEndsAt` ha expirado.
- Limpieza de `trialEndsAt` a `null` mediante Webhooks una vez que los pagos con tarjeta son confirmados por Transbank y Lemon Squeezy.
- Renovación de la UI en el Layout principal protegiendo el panel con un Modal "Lock-Screen" en caso de expiración.

## Fase 9.2: Prevención de Abuso de Registros (Shadow Trials por IP) --> COMPLETED
**Objetivo:** Prevenir que un mismo prospecto cree múltiples cuentas seguidas para evadir la barrera de pago.
**Implementación Técnica:**
- Captura de IP mediante Headers HTTP de Next.js (`x-forwarded-for`, `x-real-ip`).
- Registro persistente del fingerprinting IP en Prisma (`registerIp String?`).
- Implementación de Shadow Trial: Si la IP ya ha sido registrada previamente, permitir el nuevo registro de usuario pero asignarle `trialEndsAt: null` desde el inicio para que su cuenta nazca bloqueada y sea forzado al Checkout en Facturación de forma expedita.

## Fase 9.3: Rebranding & Dashboard Superadmin --> COMPLETED
**Objetivo:** Transición de marca a "Whalinkbot", mejora de logotipos interactivos (bypassing the aggressive Next.js browser cache) y enriquecimiento del panel del Superadmin.
**Implementación Técnica:**
- **Rebranding Completo:** Actualización global a "Whalinkbot". Generación y redondeo por script (`sharp`) de esquinas del nuevo logo, y renombrado de archivo estático en `public/` para asegurar el reseteo de caché de navegador de los clientes de forma obligatoria.
- **Control de Menús por Plan:** Bloqueo y reubicación en UI de ciertas rutas (ej. `/leads` limitado exclusivamente al plan MAX, resituación visual del "Calentador (Warmer)").
- **Mejora del Panel de Superadmin:** Modificación de `src/app/api/admin/users/route.ts` y tabla de UI para integrar y renderizar "Fecha Registro" y "Fecha Corte" (extrayendo desde los nuevos modelos de Subscription implementados).

---

## Fase 10: Nodos Móviles Android (Add-on Anti-Baneo Premium) --> PENDING
**Objetivo:** Desarrollar una aplicación móvil Android que actúe como un nodo físico controlado por el SaaS, enviando mensajes directamente desde la app oficial de WhatsApp (mediante clics automatizados) para evadir las detecciones de Baileys/Evolution API y reducir el riesgo de baneo a casi cero.
**Implementación Técnica:**
- **App Android (Servicios de Accesibilidad):** Creación de un APK (con React Native/Expo + Módulos Nativos o Kotlin) que utilice *Accessibility Services* para simular toques en la interfaz nativa de WhatsApp. Se abre el chat vía `Intent`, se localiza el botón "Enviar" por su ID de vista (View ID) o descripción de contenido, y se simula el tap.
- **Conexión Bidireccional (SaaS <-> Nodo):** Sistema de comunicación basado en SSE, WebSockets o Long Polling para que la app móvil consuma la cola de envíos asignada por el `campaignWorker.ts` del VPS.
- **Reporting Centralizado:** Endpoint `/api/mobile/webhook` en el SaaS para que el teléfono notifique cada envío "DELIVERED" y se mantengan actualizadas las métricas del usuario en `/metrics`.
- **Monitorización y Prevención de Cambios de Interfaz (UI):** Implementar un webhook o scraper interno que escuche actualizaciones en repositorios de terceros como **WABetaInfo** o los feeds RSS de **APKMirror**, emitiendo alertas cuando haya cambios en los botones o layouts de WhatsApp para parchar el APK antes de que afecte a la campaña.
  - *Script de Scrapeo (Node.js):* Desarrollar un worker dedicado que escrapee periódicamente la web de WABetaInfo (categoría Android) buscando palabras clave de cambios en la UI.
  - *Selectores Dinámicos:* La app Android no tendrá los identificadores (View IDs) "hardcodeados". Al consultar la cola de mensajes, el VPS le inyectará los selectores actuales. Así, ante un cambio de interfaz, se actualiza un campo en la base de datos del SaaS y miles de Nodos Móviles se auto-parchan al instante sin requerir reinstalación del APK.

---

## Fase 11: Blindaje Anti-Ban de 3 Capas (Spintax Nativo, Rotación de Enlaces y Límite de Seguridad) --> COMPLETED
**Objetivo:** Proteger los números de WhatsApp de los clientes frente a las heurísticas de detección de SPAM estático y velocidad de Meta.
**Implementación Técnica:**
- [x] **Motor Spintax Anidado y Rotación de URLs (`src/utils/spintax.ts`):** Parser recursivo para `{Variación A|Variación B}` e inyección automática de parámetros dinámicos en URLs para romper hashes MD5 duplicados.
- [x] **Integración en Worker (`campaignWorker.ts`):** Procesamiento de `text` y `caption` antes del envío a Evolution API.
- [x] **Tope Estricto de 2 Horas y Asistente UI (`page.tsx` & `/api/messages`):** Bloqueo en API y Frontend para campañas a grupos con repetición menor a 120 minutos, y recuadro de asistencia de redacción.
- [x] **Pruebas Unitarias (`scripts/test-spintax.ts`):** Verificación exitosa de parseo recursivo y adjunto de parámetros sin errores.

---

## Fase 12: Publicación Delegada (Campañas Cloud - Plan MAX) --> PENDING
**Objetivo:** Permitir a los usuarios del Plan MAX enviar campañas a grupos sin conectar su propio número de WhatsApp (código QR), delegando el envío a la Red de Nodos (Bot Central) del SuperAdmin para reducir a cero el riesgo de baneo del cliente.
**Implementación Técnica:**
- **Separación de Lógica y UI (Aislamiento de Regresiones):** Creación de una ruta y vista completamente independiente (ej. `/cloud-campaigns` o `/bot-campaigns`) y un menú "Campañas Cloud MAX". Esto asegura que la lógica probada de `/messages` (Plan PRO) se mantenga intacta.
- **Endpoint Independiente:** Creación de `/api/campaigns/cloud` que interceptará los mensajes y validará que el usuario tenga un `InstanceRole` tipo `VIRTUAL` y una suscripción `MAX` activa.
- **Balanceo de Carga (Round Robin):** Modificación en `campaignWorker.ts` para que, si detecta una campaña "Cloud/Delegada", asigne el envío a una de las instancias `SUPERADMIN` disponibles, validando los límites de envío diarios por número para evitar el baneo de la red central.
- **Auto-Responder Genérico en Bot Central:** Modificación en `webhookWorker.ts`. Si un número de la red `SUPERADMIN` recibe un Mensaje Directo (DM), responderá automáticamente indicando al usuario que debe regresar al grupo y contactar al enlace de WhatsApp que venía en el anuncio, mitigando la pérdida de contexto.
- **Inyección Automática de Link:** Inyectar automáticamente el enlace `wa.me` del cliente en el Spintax del mensaje para asegurar el retorno de la conversión.

