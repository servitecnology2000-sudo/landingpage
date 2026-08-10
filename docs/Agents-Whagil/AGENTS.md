# AgenteIA Workspace — Multi-Project Orchestration

> **This directory contains a single Git repo** that forms a client-server SaaS for WhatsApp automation.
> **NEVER** run `npm`, `git`, `npx` from the `vps/` root. Always set `workdir` to the correct subproject.
> **CRITICAL CONTEXT DIRECTIVE (PRP):** Whenever you start coding, planning features, modifying architecture, or debugging core flows, you **MUST consult and review the canonical PRP at `.claude/PRPs/whatsapp-automation-prp.md`** before proposing changes to align with the canonical system context.
> **OBLIGACIÓN DE DOCUMENTACIÓN CONTINUA:** Al completar cualquier nueva funcionalidad (`feat`), corrección (`fix`) o refactorización arquitectónica, la IA **TIENE LA OBLIGACIÓN INNEGOCIABLE** de actualizar tanto `AGENTS.md` (bajo `Critical Gotchas` o secciones técnicas) como `.claude/PRPs/whatsapp-automation-prp.md` con los nuevos patrones o esquemas. Ninguna tarea está terminada hasta que ambos archivos estén sincronizados al día.
> **OBLIGACIÓN DE PRUEBAS AUTOMATIZADAS (`TESTING MANDATE`):** Antes de concluir y reportar cualquier trabajo o generar el archivo `walkthrough.md`, la IA **DEBE EJECUTAR OBLIGATORIAMENTE** la verificación de pruebas correspondientes (`npm test` o `npm run test:unit`, además de `npx tsc --noEmit`). Si los cambios o adiciones lo ameritan, se deben crear y ejecutar pruebas unitarias/de integración en Vitest. En `walkthrough.md` se debe adjuntar el comando ejecutado y la salida/resumen real de la prueba (ej. `Test Files X passed, Tests Y passed`).


```text
~/Developer/agenteia/whatsapp-saas/
├── .claude/   ← Cerebro SDD y PRPs canónicos de Claude Code
├── skills/    ← Ecosistema universal de habilidades de IA y symlinks IDE (.cursor, .roo, etc.)
├── src/       ← Frontend / API (Next.js 16, React 19, Supabase, Tailwind, Vercel AI SDK)
├── vps/       ← VPS stack (Evolution API + Redis + Cron Pinger via Docker Compose)
├── supabase/  ← Migraciones de base de datos, seeders, snapshots y esquemas
├── public/    ← Activos estáticos del frontend
├── scripts/   ← Scripts centralizados de mantenimiento, setup/ y testing/ (borradores temporales)
│   └── testing/ ← Todos los borradores, scripts rápidos de prueba/queries a DB y utilidades temporales de desarrollo (e.g. get_sales, check_db) DEBEN ir aquí. NUNCA en la raíz.
└── docs/      ← Central universal de conocimiento: desarrollo/, compliance/, arquitectura/, prompts/ y negocio/
```

> [!IMPORTANT]
> **ORDEN EN LA RAÍZ DEL PROYECTO:** Está estrictamente prohibido crear archivos sueltos de prueba, scripts de queries, utilidades rápidas de node, o archivos `.sql`/`.ts`/`.js` de debugging en la raíz del proyecto. Cualquier herramienta, script de diagnóstico, prueba rápida de conexión o script para consultar la base de datos (e.g., `query.js`, `check_db.ts`, `test_contact.js`) **DEBE ser creado exclusivamente dentro del directorio `scripts/testing/`** para mantener la raíz limpia y organizada.


**Communication (Evolution API — Current):**
1. SaaS creates Evolution instances via REST (`POST /instance/create`) with per-instance webhooks.
2. Evolution receives WhatsApp messages and sends webhooks to SaaS `/api/webhooks/whatsapp-qr`.
3. The webhook bridges to `/api/agent/qr` (AI pipeline), receives the reply, and sends it back via Evolution REST API (`humanizedSend()`).


---

## Commands

### whatsapp-saas (run from the root `whatsapp-saas/`)

```bash
npm run dev          # Dev server (auto-detects port 3000-3006)
npm run build        # Production build (uses --webpack)
npm run start        # Start production server
npm run lint         # ESLint (eslint-config-next)
npm test             # Run Vitest test suites across unit and integration projects
npm run test:unit    # Run Capa 1 pure unit tests (<2000ms, node env)
npm run test:integration # Run Capa 2 real integration tests (60000ms timeout)
```

- No dedicated `typecheck` script — use `npx tsc --noEmit`
- Path alias: `@/*` → `./src/*`
- Feature-first architecture: `src/features/[feature]/` contains components, hooks, services, types, store

### VPS Stack (run from `vps/` locally, or `/opt/whatsapp-saas/vps` on VPS)

> **CRITICAL:** On the VPS, the project is strictly located at `/opt/whatsapp-saas/vps`. DO NOT run commands, check docker containers, or perform rebuilds/restarts in any other directory.

```bash
# Executed inside /opt/whatsapp-saas/vps on the VPS
docker compose up -d              # Start Evolution API + Redis + Cron Pinger
docker compose up -d --build      # Rebuild after code changes
docker compose logs -f evolution-api  # Stream Evolution logs
docker compose restart evolution-api  # Restart (does NOT rebuild)
```

---

## Critical Gotchas

### Next.js 16 — Dynamic route params are Promises
```ts
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ...
}
```
Old Next.js 14 sync params syntax will fail the build.

### Next.js 16 — MCP Server enabled
`next.config.ts` has `experimental.mcpServer: true`. The MCP endpoint lives at `/_next/mcp`.

### Next.js 15+ — `after()` for Background Tasks & Vercel Timeouts
When executing background tasks triggered by an API route (like reindexing catalogs or processing heavy Webhooks), use `import { after } from 'next/server'` (stable in Next 15) to return an immediate HTTP response to the client (unblocking the UI) while keeping the Vercel function alive. 
- **CRITICAL VERCEL RULE:** `after()` **does NOT bypass Vercel's hard timeout** limits (usually 60 seconds for Pro tier, unless `maxDuration` is exported). If a batch job (like reindexing 300+ items with OpenAI embeddings) takes longer than 60s, Vercel will silently kill the execution midway, leaving the database in an inconsistent state. For huge batch operations, either:
  1. Trigger them locally via a direct script (`npx tsx scripts/testing/...`) using Production keys (`PLATFORM_ENCRYPTION_KEY`).
  2. Implement a proper queue (e.g. QStash/Inngest) or rely on chunking from the frontend.

### Next.js — Aggressive fetch caching & Dynamic Rendering
Server Components that read mutable DB state (polling, status checks) need `export const fetchCache = 'force-no-store'` or `revalidatePath()` in Server Actions. Without this, stale cached data shows suspended users as active.
Additionally, pages using client-side Realtime subscriptions that depend on server-side `tenantId` lookups MUST use `export const dynamic = 'force-dynamic'` to prevent Vercel from caching a `null` tenant ID during build time.

### Kitchen Page Architecture & Product Toggles
The Kitchen page (`/kitchen/[tenantId]`) is a public route (no auth required) used by physical stores (on tablets) to view real-time incoming orders. It relies on two boolean flags in `tenant_ai_settings`:
1. `food_orders_enabled`: Enables the real-time "Comandas & Pedidos" board.
2. `product_display_enabled`: Enables the "Productos" tab, a toggle board for Seller Pro tenants (without inventory) to enable/disable items from their AI's `system_prompt` on the fly.

**Crucial Product Toggle Logic**: 
When toggling products on/off, the application modifies the *actual text* of `whatsapp_connections.system_prompt` using string matching against `prompt_product_items.original_line`. We use LLM (`parsePromptProducts`) *only once on-demand* (via "Sincronizar") to extract the list of products into `prompt_product_items` to avoid constant LLM costs and ensure deterministic string-matching operations.

### Supabase Migrations & DB Actions — Always use MCP natively
> **CRITICAL DB DIRECTIVE:** Antes de diseñar un esquema, crear una migración o escribir políticas RLS, **TIENES LA OBLIGACIÓN** de leer y aplicar los patrones establecidos en `.claude/agents/supabase-admin.md` y `.claude/agents/backend-specialist.md`.

When creating/modifying SQL migrations, or querying the database, ALWAYS use the `supabase-mcp-server` tools (`apply_migration`, `execute_sql`, `list_projects`, etc.) as your **first and primary option**. 
**DO NOT** try to extract passwords or database URIs from `.env.local` to run `npx supabase db push` or `psql` commands in the local terminal. The MCP server is already authenticated and natively handles multiple environments (staging, production) via `project_id`. Only resort to local terminal commands if the MCP tool explicitly fails and provides no other path forward.

### Supabase RLS Performance & Infinite Recursion ("Auth RLS Initialization Plan")
1. **Performance (CPU Degradation):** Never use `auth.uid()` or other `auth.<function>()` calls directly within `USING` or `WITH CHECK` clauses of RLS policies if the table expects high concurrent reads (e.g. `tenant_users`, `whatsapp_connections`). This forces PostgreSQL to evaluate the function per-row, triggering the "Auth RLS Initialization Plan" warning and causing massive CPU spikes / Sequential Scans. **Rule:** Always wrap auth calls in a sub-select: `(select auth.uid())`.
2. **Infinite Recursion:** If an RLS policy calls an RPC function (e.g., `get_user_tenant_id()`) that in turn queries a table protected by RLS (e.g., `tenant_users`), you MUST define the RPC function with `SECURITY DEFINER SET search_path = public`. Failing to do so executes the function as `SECURITY INVOKER`, creating an infinite RLS evaluation loop that silently crashes queries and returns empty data.


### Supabase Realtime & Broadcast Bridge — The Vercel Edge Limitation
Supabase Realtime (`postgres_changes`) evaluates RLS policies in the WAL engine per-subscriber. In Vercel Edge environments, this evaluation often fails silently or drops events when updates are made via the `service_role` key (bypassing RLS) but consumed by clients with `authenticated` roles relying on `get_user_tenant_id()`.
- **DB Rule:** Always ensure tenant-lookup functions used in RLS are `SECURITY DEFINER` with an explicit `search_path`.
- **Client Rule (Conversations):** For direct inserts (like `whatsapp_messages`), subscribe without server-side filters and perform tenant isolation in the client-side callback (`if (payload.new.tenant_id !== currentId) return`).
- **Broadcast Bridge Rule (CRM):** For server-driven updates (like the AI classifier changing a contact's CRM status), **do not use `postgres_changes`**. It has proven unreliable. Instead, use the **Broadcast Bridge** pattern: the server must emit a direct `Broadcast` event (`crm-broadcast:${tenantId}`) immediately after the DB update. The client listens to this broadcast. Use a `visibilitychange` event listener on the client to refetch data when the user returns to the tab as a zero-cost safety net, avoiding expensive continuous polling.

### Reportes de ROI y Filtrado de Fechas (Transactional Source of Truth)
Cualquier reporte, dashboard o consulta SQL (ej. `get_sales_funnel_stats`) que filtre métricas financieras (ventas, ingresos) o conversiones (citas) por **rango de fechas**, **DEBE** consultar obligatoriamente las tablas transaccionales (`sales`, `appointments`) y filtrar por la columna `created_at`. 
- **NUNCA** utilices el acumulado histórico de la tabla de contactos (`contacts.total_spent`) filtrado por `last_interaction_at` para reportes acotados por tiempo, ya que un usuario que compró el mes pasado y vuelve a hablar hoy arrastrará incorrectamente todo su valor histórico al día de hoy.

### Vercel Timezone & Date Filtering (Double Shift Bug)
Al filtrar fechas (ej. rangos de Fechas Personalizadas para Reportes) en endpoints de Next.js alojados en Vercel, recuerda que **el entorno de ejecución es estrictamente UTC**.
- Si utilizas `date-fns-tz` para parsear un string de fecha local enviado por el frontend (ej. `2026-07-25`), **NUNCA utilices `toZonedTime()` sobre el objeto Date parseado**. Si lo haces, Node.js parseará el string como `00:00 UTC` y `toZonedTime` lo desplazará erróneamente hacia atrás (ej. -4 horas para Caracas, cayendo en el día anterior).
- **Regla Estricta para Fechas Personalizadas:** Parsea el año, mes y día de forma manual desde el string (`split('-')`) e instáncialos mediante `new Date(year, month - 1, day, 0, 0, 0, 0)` para crear un objeto Date cuyos campos locales representen puramente la hora objetivo. Luego, pasa este objeto directamente a `fromZonedTime(fakeDate, tenantTimezone)` para obtener la hora UTC absoluta que se enviará a PostgreSQL.

### Supabase GoTrue Auth API (`listUsers()`) — Límite de 50 usuarios & Rendimiento Serverless
Nunca utilices `supabaseAdmin.auth.admin.listUsers()` en endpoints de Next.js para cruzar o mostrar datos de usuarios (`auth.users`) en masa (como tablas de tenants, admin dashboard o CRM).
1. GoTrue devuelve por defecto solo **50 usuarios por página** (`page: 1, perPage: 50`).
2. Descargar todos los perfiles a Node.js sobrecarga la memoria de las funciones serverless en Vercel.
3. Si la clave `SUPABASE_SERVICE_ROLE_KEY` en un entorno Preview/Staging es incorrecta, GoTrue arroja `401 Unauthorized` ocultando los datos en silencio.
**Regla:** Para consultas que crucen `tenant_users` con `auth.users`, utiliza siempre funciones RPC SQL (`SECURITY DEFINER` con `search_path = public, auth`) que hagan el `JOIN` directamente dentro del motor PostgreSQL (ej. `public.get_admin_tenant_owners()`).

### Meta Graph API Versioning — Unified Standard (v25.0)
All code interacting with the Meta Graph API (WhatsApp Business Platform, Instagram Messaging, Token Validation, Webhooks) MUST strictly use **v25.0** (e.g., `https://graph.facebook.com/v25.0/...`). Do not mix API versions (`v18.0`, `v21.0`) across files. Maintaining a single unified version across the SaaS prevents legacy deprecation bugs and technical debt.

### YouTube API — Granular Scopes Validation
When users connect their YouTube accounts via Google OAuth, Google's "Granular Permissions" allow them to uncheck specific permissions (like "Manage your YouTube videos") while still authorizing the app profile. 
- **Rule:** The OAuth callback (`api/auth/youtube/callback`) MUST explicitly validate that the `youtube.upload` scope is present in the `tokenData.scope` string before saving the credentials to the database. If it's missing, the connection must be aborted and the user redirected with an error (e.g. `?error=missing_youtube_scopes`). Failing to do this results in zombie accounts that throw 403 Insufficient Scope errors when attempting to publish.

### YouTube API — Automatic Shorts Formatting
When publishing to YouTube, the API does not require or accept a format parameter to distinguish between standard Videos and Shorts. YouTube automatically categorizes a video as a "Short" if it is vertical (or square) and under 60 seconds.
- **UI Rule:** Do not show format selectors (like "Feed/Reel/Story" or "Normal/Short") when a user is scheduling a post exclusively for YouTube. The API upload endpoint handles both automatically.

### Evolution API — Architecture & Key Rules
The WhatsApp QR channel now runs on **Evolution API v2.3.7** (single shared service) instead of individual Docker containers per tenant.
- **Instance naming:** `tenant_{tenantId_short}_{botId_short}` (built by `buildInstanceName()` in `evolution-api.ts`).
- **Webhooks are PER-INSTANCE** (not global). Configured in `createInstance()` with events: `QRCODE_UPDATED`, `CONNECTION_UPDATE`, `MESSAGES_UPSERT`, `MESSAGES_UPDATE`.
- **Global webhook is DISABLED** in docker-compose.yml because it appends event suffixes to URLs, breaking our single endpoint.
- **`humanizedSend()`** simulates human behavior: marks as read → typing indicator → delay → send text → stop typing.
- **LID Addressing:** WhatsApp sends `remoteJid` with LID format (`xxx@lid`). Always prefer `remoteJidAlt` which contains the actual phone number.

### Evolution API — Webhook Auth (Dual Key)
The webhook accepts API keys from **both** HTTP headers AND JSON body (Evolution stores keys differently depending on version).
Two valid keys are accepted: `EVOLUTION_API_KEY` (current) and `EVOLUTION_WEBHOOK_SECRET` (legacy instances).

### Deleting WhatsApp connections — destroy Evolution instance first
Any SaaS endpoint that deletes a `whatsapp_connections` row MUST call `deleteInstance(instanceName)` from `evolution-api.ts` **before** the DB delete. Otherwise orphan instances consume resources on the VPS.

### Tenant state changes cascade to secondary fields
Endpoints that suspend/reactivate tenants must also update `whatsapp_connections.status` and `health_status`. If status is `inactive` but the webhook doesn't know, it returns 404 on incoming messages.

### Evolution API auth
All Evolution API REST calls are authenticated via `apikey` header using `EVOLUTION_API_KEY`. Configured in `evolution-api.ts` via `DEFAULT_HEADERS`.

### `whatsapp_connections` is a unified multi-channel table
The table `whatsapp_connections` is in reality a **unified channels table**. It stores connections for WhatsApp, Instagram, Facebook Messenger, and any future channel, differentiated by the `connection_type` column (`meta_api`, `meta_embedded`, `qr_baileys`, `trial`, `instagram`, `instagram_official`, `instagram_byoa`, `messenger_official`, `messenger_byoa`). Do NOT create separate tables per platform — use `connection_type` filters instead.

### Instagram BYOA (Bring Your Own App) — Dual Webhook Architecture
The system supports two Instagram connection modes to ensure resilience against Meta App Review rejection:
1. **`instagram_official`** — Uses the platform's central Meta App. All tenants share a single global webhook at `/api/webhooks/instagram`.
2. **`instagram_byoa`** — Each tenant provides their own Meta App credentials (`meta_app_id`, `meta_app_secret`, `meta_verify_token`). Each connection gets a unique dynamic webhook at `/api/webhooks/instagram/[connection_id]`.

Both modes share the same core processing pipeline in `src/lib/instagram/webhook-pipeline.ts`. The BYOA webhook validates `X-Hub-Signature-256` using the per-connection `meta_app_secret` stored in the DB. The global webhook validates using `META_APP_SECRET` from env. Both webhooks handle all 4 pipelines: DMs, Comments, Deletes, and Edits.

**Key files:**
- `src/lib/instagram/webhook-pipeline.ts` — Shared processing logic (4 pipelines)
- `src/lib/instagram/hmac-validation.ts` — HMAC-SHA256 signature verification
- `src/app/api/webhooks/instagram/route.ts` — Global webhook (official)
- `src/app/api/webhooks/instagram/[connection_id]/route.ts` — Dynamic BYOA webhook
- `src/app/api/connections/route.ts` — Connection creation (includes `instagram_byoa` block)

### Omnichannel Webhook & QStash Deduplication (Anti-Bot Loop)
All messaging channels (WhatsApp Official, WhatsApp QR, Instagram, and Facebook Messenger) utilize **QStash** to debounce incoming message streams (4-second delay) and perform atomic deduplication.
Meta and Evolution API frequently deliver duplicate webhook HTTP requests concurrently or within milliseconds for a single incoming message. Checking the database via `SELECT` for duplicate `provider_message_id` before inserting is vulnerable to race conditions (Time-of-Check to Time-of-Use).
- **CRITICAL FIX:** When enqueueing the delayed AI processing job to QStash (in `webhook-pipeline.ts` for Instagram/Messenger, and `route.ts` for WhatsApp Official/QR), the system passes the `Upstash-Deduplication-Id` header populated with the unique message ID (`messageId` / `mid`). QStash natively drops duplicates with the same ID within a 24-hour window, guaranteeing the AI `AgentWorker` is invoked exactly once per incoming message and preventing double AI responses.

### Meta 24-Hour Messaging Window & Remarketing CRON Filtering
Meta enforces a strict **24-hour messaging window** for Instagram Direct and Facebook Messenger.
1. **Private Replies vs DMs:** Sending a Private Reply to an Instagram comment does NOT open a 24-hour messaging window. Only an `inbound` DM from the user opens the 24-hour window.
2. **CRON Remarketing Guard:** The CRON engine (`/api/cron/remarketing`) MUST check whether contacts on Meta channels (`instagram_official`, `instagram_byoa`, `messenger_official`, `messenger_byoa`) have an `inbound` message AND if that message occurred within the last 24 hours (`1440` minutes). If no `inbound` message exists or if >24h have elapsed, the CRON skips remarketing to avoid API HTTP 400 rejection errors and `failed` message insertions.
3. **Inbox UI Indicator:** Messages with `status === 'failed'` in `whatsapp_messages` are rendered in `/conversations` with a red warning badge (`AlertCircle`) and tooltip *"No entregado"* to clearly indicate delivery failure to tenants.


### Facebook Messenger BYOA & Official — Dual Webhook Architecture
The system supports both official and BYOA connection modes for Facebook Messenger (`messenger_official` and `messenger_byoa`):
1. **`messenger_official`** — Uses the central Meta App. All tenants share a single global webhook at `/api/webhooks/messenger`.
2. **`messenger_byoa`** — Each tenant provides their own Meta App credentials (`meta_app_id`, `meta_app_secret`, `meta_verify_token`). Each connection gets a dynamic webhook at `/api/webhooks/messenger/[connection_id]`.

Both modes share the core processing pipeline in `src/lib/messenger/webhook-pipeline.ts` for handling DMs (which are enqueued to QStash) and Facebook Page comments (`feed` event). The dispatcher (`src/lib/whatsapp/dispatch.ts`) routes outbound messages via `graph.facebook.com/v25.0/me/messages` using the Page Access Token.

**Key files:**
- `src/lib/messenger/webhook-pipeline.ts` — Shared processing logic for Messenger DMs (enqueues to QStash) and feed comments
- `src/lib/messenger/comment-processor.ts` — Facebook Page comment processing and auto-replies
- `src/app/api/webhooks/messenger/route.ts` — Global webhook (official)
- `src/app/api/webhooks/messenger/[connection_id]/route.ts` — Dynamic BYOA webhook

### TikTok Content Posting API — Sandbox Restrictions & Async Polling
1. **Sandbox Privacy Restrictions:** While the TikTok App is unapproved (Sandbox mode), the API will reject any video published with `PUBLIC_TO_EVERYONE`. You MUST use `privacy_level: 'SELF_ONLY'`.
2. **Logical Parameter Conflicts:** If `privacy_level` is `SELF_ONLY`, you MUST set `disable_duet: true`, `disable_comment: true`, and `disable_stitch: true`. Passing `false` causes the API to throw a generic "Please review our integration guidelines" error.
3. **Target Account Privacy:** Even with `SELF_ONLY`, the destination TikTok account MUST be manually set to "Private Account" in the mobile app settings. Otherwise, the API throws `[unaudited_client_can_only_post_to_private_accounts]`.
4. **Asynchronous Publishing:** `PULL_FROM_URL` initialization is asynchronous. The API returns a `publish_id`. The Vercel Publisher CRON (`/api/cron/publisher`) must actively poll the `/v2/post/publish/status/fetch/` endpoint using the token stored in `whatsapp_connections.metadata->>'oauth_access_token'` to move the post from `publishing` to `published` when the status changes to `PUBLISH_COMPLETE`.

### Bot Rate Limiting — Universal Protection Architecture
1. **Anti-Loop (per contact):** All outbound webhooks (`whatsapp`, `whatsapp-qr`, `instagram`, `messenger`) pause the bot if a single contact receives >5 outbound messages in 2 minutes. This prevents bot-vs-bot loops.
2. **Global Rate Limit (per tenant):** All outbound webhooks check `tenant_ai_settings.max_outbound_per_minute` (default: 20). If a tenant exceeds this across ALL contacts in 60 seconds, new messages are silently dropped. This prevents runaway bots from burning Meta/Evolution API quotas.
3. **Local Rate Limiter (Web Chat):** The synchronous `/api/web-chat/messages` endpoint checks inbound messages (`<15` per minute). Exceeding this returns HTTP 429 to prevent malicious script saturation on the widget, protecting LLM quotas.

### Instagram DM Sending — Token-dependent endpoint routing
EAAS tokens (from OAuth) send via `graph.facebook.com/{PAGE_ID}/messages`. IGAA tokens (from dashboard) send via `graph.instagram.com/{IG_ACCOUNT_ID}/messages`. The code in `sendAndStore()` auto-detects the token type and picks the correct ID. The webhook `entry.id` uses an **IGSID** that differs from the Graph API's `ig_instagram_account_id`—the field `ig_igsid` in `whatsapp_connections` stores this mapping (auto-learned on first webhook via fallback lookup). Full details: `whatsapp-saas/docs/meta-instagram-config-setup.md`.

### Meta App Permissions — Production App (1267963898334770) has Advanced Access
The production Meta App `whagil` (ID: `1267963898334770`) has **Advanced Access** approved for: `instagram_manage_messages`, `instagram_basic`, `pages_show_list`, `pages_read_engagement`, `business_management`, `whatsapp_business_messaging`, `public_profile`. This means:
- **NO manual webhook switch activation** is needed per IG account. Webhooks activate automatically via OAuth.
- **NO `pages_messaging` permission** is required — the webhook is configured at APP level, not per-page.
- **NO post-connection manual steps** in Meta Dashboard are needed for new tenants.
- Full details: `whatsapp-saas/docs/estado-actual-meta-instagram-permisos.md`

### Instagram IGSID ≠ IG Business Account ID — Chicken-and-Egg Bug (FIXED)
Meta uses an "Instagram Scoped ID" (IGSID) in webhook `entry.id` that can **differ** from the `ig_instagram_account_id` returned by OAuth. When they differ and `ig_igsid` is null (new connection), the webhook lookup fails completely. The auto-learn mechanism can't trigger because the connection is never found.
- **Fix:** Fallback lookup in `webhook-pipeline.ts` searches for connections with `ig_igsid IS NULL`. If exactly one is found, it uses it and auto-learns the IGSID.
- **NEVER** assume IGSID equals `ig_instagram_account_id`. Always store and lookup via `ig_igsid`.

### Instagram Cross-Delivery Protection (Multi-Account Same App)
When multiple IG accounts share the same Meta App and global webhook, Meta may deliver outbound messages from Account A as inbound webhooks on Account B (without `is_echo`). Two protections in `webhook-pipeline.ts`:
1. **Duplicate mid check:** Prevents same webhook event from being processed twice.
2. **Cross-delivery check:** If incoming text (≥20 chars) matches a recent outbound from another connection within 60 seconds, it's dropped.

### Instagram Comment Duplicate Webhooks & Concurrency Lock
Meta frequently delivers duplicate webhook events for Instagram Comments (e.g. during retries or concurrent status updates), which caused the bot to respond twice to the same comment if fixed rules were configured.
- **The Bug:** If two webhooks for the same comment hit the server simultaneously, both bypassed the `count` checks before either could save the audit record in `instagram_comments`, executing the DM and reply twice. This was exacerbated by the `auto_response_delay_seconds` (jitter).
- **The Fix:** At the very start of `processIncomingComment` (before jitter delay), we implement a **Concurrency Lock** by explicitly attempting a direct `INSERT` into `instagram_comments` with `response_type: 'processing'`. If another webhook is already processing it, this throws a `23505` (Unique Constraint Violation) on the `(tenant_id, instagram_comment_id)` index, allowing us to safely abort the duplicate.

### Instagram Message Integrity — Unsend & Edit Webhooks
Instagram sends deletions and edits via non-standard webhook fields:
1. **Unsend (Delete):** Field `is_deleted: true` inside the `message` object. We use a **Soft Delete** pattern: the record remains but `is_deleted` becomes `true` and content is masked to "[Mensaje eliminado]" to avoid breaking Supabase Realtime `UPDATE` listeners.
2. **Edit:** Field **`message_edit`** (Top-level field in the messaging event, NOT inside `message`). Structure: `messaging: [{ message_edit: { mid: "...", text: "...", num_edit: 1 } }]`.
   - **Critical:** Never look for `is_edited` inside the `message` object; it doesn't exist for Instagram. Always check for the `message_edit` field at the sibling level of `message`.

### Instagram Cross-Tenant Routing Bug & Fallback Protection (FIXED)
When querying `whatsapp_connections` in global webhooks (Instagram/Messenger) based on `recipientId` or `pageId`, **NEVER** append `.eq('status', 'active')` to the primary lookup query. 
- **The Bug:** If a tenant is suspended (`status = inactive`), filtering by `active` causes the lookup to miss the suspended connection. The webhook pipeline then assumes the ID is unknown and triggers the "Chicken-and-Egg Fallback Lookup" (which searches for any active connection with a `NULL` IGSID). This causes a random active tenant to **hijack/steal** the IGSID of the suspended account, routing all future messages to the wrong inbox even after the original tenant is reactivated.
- **The Fix:** Find the connection first without filtering by status. Then, check `if (connection.status !== 'active') return;` to abort cleanly.

### WhatsApp Message Integrity — Edit & Revoke Webhooks
WhatsApp Cloud API sends edits and revokes (unsends) via the `messages` array:
1. **Revoke (Unsend):** Field `type: "revoke"`. Contains a `revoke` object with `original_message_id`. We use the same **Soft Delete** pattern as Instagram (`[Mensaje eliminado]`).
2. **Edit:** Field `type: "edit"`. Contains an `edit` object with `original_message_id` and a `message` object containing the updated `text` or `image.caption`.
   - **Pipeline:** Unlike Instagram's top-level field, WhatsApp events arrive inside the standard `messages` array but are intercepted by the parser to prevent them from being treated as new inbound messages.

### Webhook Race Condition — Status Updates (Delivered vs Read)
Both Meta Cloud API and Evolution API emit message status updates (`sent`, `delivered`, `read`) asynchronously. This leads to a severe race condition: if a user opens a chat immediately, the `delivered` and `read` webhooks arrive at the SaaS backend almost simultaneously. 
- **The Bug:** If the `delivered` webhook finishes processing *after* the `read` webhook, it overwrites the `whatsapp_messages.status` back to `delivered`, artificially reducing the Open Rate KPIs on the dashboard.
- **The Fix:** Whenever updating a message to `delivered` via a webhook, you MUST include a conditional clause to ensure it doesn't downgrade an already read message: `await supabase.from('whatsapp_messages').update({ status: 'delivered' }).eq('provider_message_id', msgId).neq('status', 'read')`.

### AI Providers & API Keys Encryption
All AI Provider API keys (`OPENAI_API_KEY`, etc.) are stored **encrypted** in the database (`platform_ai_providers.api_key_encrypted`).
- **Rule:** If you are running local scripts (e.g. `scripts/testing/...`) that need to interact with the LLM using the database's credentials, you **MUST** ensure the `.env.local` contains the correct `PLATFORM_ENCRYPTION_KEY` matching the environment database you are targeting. Otherwise, the script will throw a `Failed to decrypt data` error.

### Afiliados y Revendedores (Resellers)
El programa de partners está completamente integrado en la aplicación bajo las rutas `/reseller/*` y configurado vía el SuperAdmin (`/admin/resellers`). 
- **Generación de Comisiones:** Las comisiones NUNCA se generan al momento del registro del tenant. Se generan **exclusivamente al procesar un pago real** (Webpay/Lemon Squeezy), leyendo el `reseller_id` desde la tabla `referrals`. Esto previene el fraude por cuentas gratuitas (trials). El monto de la comisión se calcula sobre el total pagado (ej. 30%) y queda en estado `pending` por 7 días como medida anti-reembolsos. La lógica centralizada está en `src/lib/reseller/commission-engine.ts`.
- **Registro y Atribución:** El link de afiliado (`/r/[código]`) setea la cookie `whagil_ref` por 30 días. En el proceso de Sign Up, si esta cookie está presente, se crea automáticamente un registro en `referrals` conectando al `tenant_id` recién creado con el `reseller_id`.
- **Churn de Referidos:** Si la suscripción de un tenant expira y el CRON de facturación suspende al tenant, el script debe invocar obligatoriamente `markReferralChurned(tenantId)` para detener la generación futura de comisiones para el revendedor.

### Facturación y Cobros Recurrentes (`/billing` vs `/settings`)
La gestión de planes, métodos de pago, cobros automáticos (Transbank Webpay Oneclick Mall y Lemon Squeezy para extranjeros) e historial de facturas está completamente segregada en la ruta `/billing` (`src/app/(main)/billing/page.tsx`). NUNCA agregues componentes ni lógica de contratación en `/settings`.
- **Excepción de Redirección (TenantStatusWatcher):** El componente `TenantStatusWatcher.tsx` expulsa a usuarios suspendidos hacia `/suspended`, PERO excluye explícitamente la ruta `/billing` tanto por `pathname` en cliente como por el header `x-pathname` inyectado por `middleware.ts`. Esto permite a un cliente suspendido entrar exclusivamente a `/billing` para asociar su tarjeta o pagar y reactivarse.
- **Botones de Contratación (`PlanSelector.tsx`):** Los botones para contratar o mejorar un plan ("Contratar con Webpay Oneclick / Plus / Lemon Squeezy") solo deben ser visibles si el tenant está actualmente en plan `trial` (`tenant.plan === 'trial' || !tenant.plan`). Si ya tiene un plan de pago, solo puede cambiarlo contactando a soporte o a través del SuperAdmin.
- **Uso y Bolsas de Mensajes:** La card "Uso de Mensajes" (contador de consumo IA y botón de compra de bolsa de mensajes extra de $9.000 para 1.000 mensajes) ha sido trasladada por completo de `/settings` a `/billing`. 
  - **Filtro de Mes Obligatorio:** Cualquier consulta o actualización de la tabla `usage_tracking` debe incluir obligatoriamente el filtro `.eq('month', currentMonth)` (formato `YYYY-MM`), previniendo errores de violación de restricción única o lecturas de ciclos de facturación anteriores.
  - **Flujo de Retorno:** Los Webhooks y flujos de redirección de pago tras comprar bolsas en Transbank apuntan a `/billing?webpay_status=...`. El panel `/billing` captura estos parámetros e inyecta la alerta visual del estado de pago, limpiando luego la query string con `replaceState`.
- **Cobro Automático Recurrente en CRONs (`subscriptions` / `check-subscriptions`):** Los endpoints de CRON (`/api/cron/subscriptions` configurado en `vercel.json` diario a las 1 AM UTC y `/api/cron/check-subscriptions`) verifican suscripciones expiradas (`expires_at`). Antes de proceder a suspender un tenant, si la suscripción tiene `auto_renew: true`, `payment_provider === 'webpay_oneclick'` y un `active_inscription_id`, el CRON ejecuta automáticamente un cobro en 1-clic (`MallTransaction.authorize`). Si es aprobado (`response_code === 0`), renueva automáticamente `expires_at` según el `billing_cycle`, genera el recibo en `payment_receipts` y recarga el cupo en `usage_tracking` sin interrumpir el servicio.

### Asignación Canónica de Límites de Uso (`CANONICAL_PLAN_LIMITS`)
Cuando un tenant adquiere un plan, cambia de plan en el panel de admin (`reset-limits`), se le ejecuta el commit/webhook de pago, o inicia un nuevo mes (`checkUsage`), los límites de mensajes IA NUNCA deben asignarse con fallbacks duros aleatorios (`|| 300` o `|| 100`).
- **Regla:** Siempre se debe utilizar la función canónica `getPlanLimit(plan, dbLimit)` desde `src/lib/usage/tracking.ts`.
- **Límites Oficiales (`CANONICAL_PLAN_LIMITS`):** `starter: 3000`, `seller_pro: 10000`, `seller_pro_inv: 20000`, `scheduling: 8000`, `instagram: 5000`, `link_pro: 500`, `trial: 300`, `enterprise: 30000`. Si `plan_limits` de la base de datos devuelve un valor nulo o inferior al canónico del plan, `getPlanLimit` impone automáticamente el valor canónico oficial.

### AI CRM Classifier Guard (`classifyConversationAction`)
Calls to `classifyConversationAction(tenantId, contactId, transcript)` originating from `/api/agent` during background moderation tasks or comment sentiment checks pass `contactId: null` or `'null'`. The function MUST guard against `!contactId || contactId === 'null'` before querying Supabase `contacts` table to prevent PostgreSQL 22P02 invalid UUID syntax errors.

### Ciclo de Vida del Estado Post-Venta (`sale_closed` & Tag `Facturado`)
- **Matriz de 3 Intenciones:**
  1. **Saludo Neutro ("Hola", "Buenas"):** MANTIENE `sale_closed = true` y etiqueta `Facturado`. El bot saluda amablemente indagando si consulta por el pedido anterior o cotización nueva. Bloquea `cerrar_venta`.
  2. **Seguimiento/Despacho/Factura ("¿Cómo va mi pedido?", RUT boleta):** MANTIENE `sale_closed = true` y `Facturado`. La IA responde sobre despacho o boleta. Bloquea `cerrar_venta`.
  3. **Nueva Cotización Explícita ("Quiero 10 tazones", "¿Tienen gorras?"):** RESETEA `sale_closed = false`, cambia `crm_status` a `siguiendo` y reemplaza la etiqueta `Facturado` por `Por Facturar`. Permite invocar `cerrar_venta` al confirmar el nuevo pago.
- **Ocultamiento Dinámico y Server-Side Guard de Herramientas Críticas:** Para evitar que el LLM alucine o justifique erróneamente cierres de venta duplicados ante saludos post-venta, el sistema implementa **3 capas de defensa**:
  1. **Capa 1 — `isSaleClosed` en `agent/route.ts`:** El flag `isSaleClosed` se calcula como `sale_closed === true || tags.includes('Facturado')`. **NO incluye `status==='cerrado'`** porque el campo `status` refleja el pipeline CRM (puede ser `'cerrado'` de una venta anterior) y no debe bloquear herramientas para NUEVAS ventas. Solo `sale_closed` (flag de bloqueo) y el tag `Facturado` controlan el toolkit. El `closedSalePrompt` se inyecta siempre que `hasBilledTag` sea true.
  2. **Capa 2 — `classifier.ts` (Reglas Post-2026-07-22):** El clasificador resetea `sale_closed=false` y remueve `Facturado` cuando `crm_status === 'siguiendo'` (interés real del cliente). **NO requiere** que el LLM sugiera explícitamente el tag `Por Facturar`; el schema define `'siguiendo'` como "interés real" lo que es suficiente para distinguir de saludos neutros (`'nuevo'`). Un saludo neutro mantiene `sale_closed=true` y `Facturado`. Un seguimiento de pedido (`'cerrado'` o `'nuevo'`) también mantiene.
  3. **Capa 3 — Re-consulta DB en `cerrar_venta.execute()`:** Inmediatamente antes de ejecutar el cierre, se hace una consulta fresh a la DB para leer `sale_closed` y `tags` actuales. Si alguno indica venta cerrada, la herramienta retorna error. Esta es la última barrera ante race conditions donde el estado cambió entre el inicio de la request y la ejecución.
- **Regla de desbloqueo post-venta:** `sale_closed` solo se baja a `false` en DOS casos: (a) el contacto se marca como `'perdido'` explícitamente, o (b) la lógica de tags del clasificador remueve `Facturado` y lo reemplaza por `Por Facturar` por detección de nueva intención de compra (`isExplicitNewPurchase = wasBilledBeforeClassification && !newTags.includes('Facturado')`).
- **⚠️ PROHIBIDO: handleSaleClosed desde el clasificador:** NUNCA se debe llamar a `handleSaleClosed()` desde `classifier.ts`. El clasificador opera con datos stale del `contact` (leídos al inicio) y no tiene `inboundMessageId`, lo que anula la deduplicación transaccional. La "RED DE SEGURIDAD" original fue eliminada (2026-07-22) por ser la **causa raíz de ventas duplicadas fantasma** (registros con `inbound_message_id = NULL` y notas "Sin ID de mensaje"). La herramienta `cerrar_venta` en `agent/route.ts` es la ÚNICA forma legítima de registrar ventas.
- **Resolución de Monto y Registro en Dashboard:** En `handleSaleClosed` (`sale-closed.ts`), si el `amount` no es enviado o es `0` (ej. en flujos de comandas o pedidos en pantalla), el sistema consulta automáticamente la última orden de `food_orders` para rescatar el `total_amount` real y registrar el monto correspondiente en la tabla `sales` y en el acumulado `total_spent` del contacto. Esto garantiza que las ventas sumen siempre en los KPIs del Dashboard.
- **Alertas de WhatsApp al Dueño vía Matrix Bot Superadmin:** Todas las notificaciones por WhatsApp dirigidas al dueño del negocio (ventas cerradas en `notifySaleToOwner` y escalamiento en `notifyEscalation`) se despachan **exclusivamente a través del Matrix Bot del tenant Superadmin** (`qr_baileys`). En `dispatchMatrixMessage` (`escalation.ts`), la consulta filtra explícitamente por `connection_type = 'qr_baileys'` e `is_active` para asegurar la salida por la línea Baileys activa del SaaS.
- **Deduplicación Transaccional Pura:** La protección contra cobros o cierres duplicados se delega exclusivamente a la base de datos PostgreSQL mediante una restricción única (`UNIQUE`) sobre el ID del mensaje del webhook (`inbound_message_id` en la tabla `sales`). Si el cliente pide otro ítem a los 2 minutos (generando un nuevo mensaje), se procesa limpiamente. Si ocurre un reintento del mismo webhook (mismo ID), la base de datos lo bloquea en silencio.
### Consistencia de UI/UX y Esquema de Colores (Estándar Slate)
Cualquier nuevo desarrollo de interfaces de usuario (UI), paneles de administración, portal de revendedores, o nuevos módulos debe seguir estrictamente el mismo esquema de colores y estilos visuales basados en **Slate** establecido en `/admin/arco` para mantener coherencia en toda la plataforma:
1. **Fondo Principal/Cuerpo:** Usar `bg-slate-950` con `text-white` para el cuerpo o contenedor principal de la página.
2. **Tarjetas y Secciones (Cards):** Usar `bg-slate-900` con borde `border border-slate-800` (o `border-slate-850`).
3. **Paneles Internos, Inputs y Selects:** Usar fondo `bg-slate-950` con borde `border border-slate-800` (o `border-slate-850`) y foco en indigo `focus:border-indigo-500` / `focus:ring-indigo-500/50`.
4. **Botón de Regresar:** Estilo idéntico a `/admin/arco`: `p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors text-white` con el ícono `ArrowLeft`.
5. **Botones Principales (Primary Buttons):** Usar `bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors`.
6. **Botones Secundarios:** Usar `bg-slate-800 hover:bg-slate-750 text-white transition-colors` o el estilo simple de acción `bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors`.
7. **Jerarquía de Textos y Colores:**
   - Títulos principales: `text-white` o gradiente `bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent`.
   - Etiquetas/Descripciones: `text-slate-400`.
   - Textos de ayuda/Metadatos: `text-slate-500` o `text-slate-600`.
   - Placeholders de inputs: `placeholder:text-slate-700`.

---

## Shared Environment Variables

| Variable | whatsapp-saas (Vercel) | VPS (`vps/.env`) |
|----------|------------------------|------------------|
| Evolution URL | `BOT_MANAGER_URL` / `EVOLUTION_API_URL` | — (localhost:8080 internal) |
| Evolution Key | `EVOLUTION_API_KEY` | `EVOLUTION_API_KEY` (= `AUTHENTICATION_API_KEY`) |
| Legacy Webhook Key | `EVOLUTION_WEBHOOK_SECRET` | — |
| SaaS URL | `NEXT_PUBLIC_SITE_URL` | `SAAS_API_URL` |
| Webhook secret | `SAAS_WEBHOOK_SECRET` | `SAAS_WEBHOOK_SECRET` |
| Supabase URL | `NEXT_PUBLIC_SUPABASE_URL` | — |
| Supabase key | `SUPABASE_SERVICE_ROLE_KEY` | — |
| CRON secret | `CRON_SECRET` | `CRON_SECRET` |

**Golden rule:** Never change an endpoint URL in Vercel without updating the corresponding webhook config in Evolution instances.

---

## Where to read more

| Task | Read first |
|------|-----------|
| UI, DB, subscriptions, prompts, webhooks | `CLAUDE.md` (golden path, Tailwind, Supabase, auto-blindaje) |
| **Meta App permissions, IGSID, cross-delivery** | **`docs/estado-actual-meta-instagram-permisos.md`** |
| Evolution API integration & current bugs | `docs/Evolutionapi/estado-actual-evolution-integration.md` |
| Evolution migration plan & audits | `docs/Evolutionapi/` (5+ docs) |
| **Architecture, Feature blueprints & Core flows (MANDATORY)** | **`.claude/PRPs/whatsapp-automation-prp.md`** |

---

## Bot Architectures & "Cerebros"

El sistema opera bajo 4 modos de bot (`bot_mode`) que determinan las capacidades, herramientas y lógica de post-procesamiento. Es **CRÍTICO** mantener el aislamiento entre ellos para evitar regresiones.

| Modo | Nombre UI | Archivos Clave | Capacidades / Lógica Especial |
|------|-----------|----------------|-------------------------------|
| `general` | Asistente General | `api/agent/route.ts`, `classifier.ts` | Solo sigue el `system_prompt` personalizado. Sin herramientas. |
| `scheduling` | Agendamiento y Citas | `getSchedulingTools.ts`, `cron/reminders/route.ts`, `classifier.ts` | Herramientas de reserva/cancelación. CRON de recordatorios de citas. |
| `sales_inventory` | Ventas con Inventario | `rag-search.ts`, `sale-closed.ts`, `classifier.ts` | Búsqueda RAG en catálogo ERP. Herramienta `cerrar_venta`. NO toca la columna `tags`. |
| `sales_simple` | Ventas Simples | `classifier.ts`, `cron/remarketing/route.ts`, `sale-closed.ts` | **Reglas Militares de Etiquetas**. Sin RAG. CRON de seguimiento comercial. ÚNICO modo que escribe `tags`. |

### Mapa de Archivos (Rutas completas dentro de `whatsapp-saas/src/`)

| # | Archivo | Ruta completa | Rol | Usado por |
|---|---------|---------------|-----|-----------|
| 1 | `route.ts` (Orquestador) | `app/api/agent/route.ts` | Puerta de entrada. Recibe el mensaje, ensambla prompt + tools según `botMode`, invoca LLM, y dispara clasificador. | **Todos** |
| 2 | `llm-service.ts` | `lib/ai/llm-service.ts` | Selecciona modelo LLM por plan. Inyecta SOPs de seguridad y el `SALES_TOOL_SOP` (solo si es ventas). | **Todos** |
| 3 | `classifier.ts` | `lib/ai/classifier.ts` | Post-procesamiento asíncrono. Analiza la transcripción y mueve tarjetas (`crm_status`), extrae datos y gestiona tags. | **Todos** (pero tags solo `sales_simple`) |
| 4 | `scheduling-tools.ts` | `lib/ai/tools/scheduling-tools.ts` | Factory de herramientas IA: `consultar_disponibilidad`, `reservar_cita`, `modificar_estado_cita`, `listar_servicios`, `actualizar_cliente`. | Solo `scheduling` |
| 5 | `rag-search.ts` | `lib/ai/rag-search.ts` | Búsqueda semántica de productos con pgvector. Formatea contexto `[CONTEXTO_PRODUCTO]` para el LLM. | Solo `sales_inventory` |
| 6 | `sale-closed.ts` | `lib/services/sale-closed.ts` | Servicio de cierre de venta: registra en `sales`, actualiza contacto, notifica al dueño por WA. Respeta aislamiento de tags por `botMode`. | `sales_simple` y `sales_inventory` |
| 7 | `remarketing/route.ts` | `app/api/cron/remarketing/route.ts` | CRON de seguimiento comercial: envía mensajes de "Dejado en Visto" y "Seguimiento Automático". Filtra por `bot_mode === 'sales_simple'`. | Solo `sales_simple` |
| 8 | `reminders/route.ts` | `app/api/cron/reminders/route.ts` | CRON de recordatorios de citas: envía recordatorio X minutos antes de la cita. Filtra por `bot_mode === 'scheduling'`. | Solo `scheduling` |

### Flujo de Ejecución (Ciclo de Vida de un Mensaje)

```
Mensaje WhatsApp entrante
       │
       ▼
  [route.ts] ─── Lee bot_mode de tenant_ai_settings
       │
       ├── bot_mode = 'scheduling'?
       │      → Inyecta schedulingPrompt + getSchedulingTools()
       │
       ├── bot_mode = 'sales_inventory'?
       │      → Ejecuta RAG (rag-search.ts) → Inyecta productContext
       │      → Inyecta herramienta cerrar_venta (→ sale-closed.ts)
       │
       ├── bot_mode = 'sales_simple'?
       │      → Inyecta herramienta cerrar_venta (→ sale-closed.ts)
       │      → NO hace RAG
       │
       └── bot_mode = 'general'?
              → Solo system_prompt personalizado, sin herramientas
       │
       ▼
  [llm-service.ts] ─── buildSystemPrompt() + Safety SOPs
       │
       ▼
  LLM genera respuesta (con posible tool calling)
       │
       ▼
  [classifier.ts] ─── Analiza transcripción DESPUÉS de la respuesta
       │
       ├── Mueve tarjeta CRM (criterio dinámico por bot_mode)
       ├── Extrae datos (email, dirección, RUT)
       ├── Solo si sales_simple: gestiona tags + reglas militares
       └── Calcula total_spent si crm_status = 'cerrado'
```

**CRONs (ejecución independiente, no por mensaje):**

> ⚠️ **Vercel Hobby Limit:** Vercel no permite CRONs con frecuencia menor a 24h en su plan gratuito.
> Los CRONs sub-24h viven en `vps/cron-pinger/` como un contenedor Node.js que hace ping a los endpoints del SaaS.
> Solo los CRONs diarios (`retention`, `subscriptions`) usan `vercel.json`.

```
vps/cron-pinger (setInterval cada 10 min)
       │
       ├── /api/cron/reminders              → Solo scheduling   → Recordatorios de citas
       ├── /api/cron/auto-cancel            → Solo scheduling   → Auto-cancelar citas sin confirmar
       ├── /api/cron/post-appointment-followup → Solo scheduling → Seguimiento post-cita
       ├── /api/cron/remarketing            → Solo sales_simple → Visto + Seguimiento
       ├── /api/cron/subscriptions          → Todos             → Expiración de suscripciones (cada 1h)
       └── /api/cron/evolution-health       → Todos (QR)        → Health check de instancias

vercel.json (CRONs nativos, solo diarios)
       │
       ├── /api/cron/retention              → Diario a las 10:00 UTC
       └── /api/cron/subscriptions          → Diario a la 01:00 UTC (respaldo)
```

### Reglas de Oro para Desarrollo IA:
1. **Aislamiento en `classifier.ts`**:
   - **Etiquetas**: Cualquier cambio en etiquetas de estado o "limpieza automática" debe estar envuelto en `if (bot_mode === 'sales_simple')`. Los otros bots NO usan etiquetas ni deben ver alterada su columna `tags`.
   - **Movimiento de Tarjetas (`crm_status`)**: El criterio para mover una tarjeta a "Cerrado" es dinámico:
     - En `scheduling` significa **Cita Agendada**.
     - En `sales_inventory` significa **Venta de Catálogo confirmada**.
     - En `sales_simple` significa **Pago/Datos de envío recibidos**.
   - Esto evita que un bot de agendamiento falle al mover tarjetas por no detectar un "pago".
2. **Aislamiento en CRONs**: 
   - `api/cron/remarketing`: SOLO procesa tenants con `sales_simple`.
   - `api/cron/reminders`: SOLO procesa tenants con `scheduling`.
3. **CRONs sub-24h van en cron-pinger (VPS)**: Cualquier nuevo CRON que deba ejecutarse con frecuencia menor a 24 horas, debe agregarse en `vps/cron-pinger/index.js` y el endpoint real en `src/app/api/cron/`. NO agregar a `vercel.json` si la frecuencia es sub-diaria.
4. **Visibilidad de Funciones Premium**: 
   - La opción de **Restablecer Inventario de IA (Borrar Catálogo)** en Configuración General (`/settings`) está estrictamente limitada al plan **`seller_pro_inv`**. No debe ser visible para usuarios con el plan base `seller_pro`.
4. **Arquitectura de Modelos LLM y Reglas de Canales**:
   - **Modelos de IA:** Todos los planes de la plataforma utilizan **`gemini-2.5-flash-lite`** como modelo de lenguaje principal (el cual maneja RAG, búsquedas en catálogo, visión de comprobantes de pago e interpretación de audios con costos mínimos). Se utiliza **`gpt-4o-mini`** como fallback global si Gemini falla. Las redirecciones a modelos costosos (como `chat_model_premium`) están deshabilitadas en `llm-service.ts`.
   - **Meta 1.000 Conversaciones Gratuitas:** Meta entrega **1.000 conversaciones reactivas (iniciadas por el cliente) gratuitas al mes por cada WABA**. Dado que nuestros bots responden reactivamente a los chats entrantes, casi la totalidad del tráfico no genera cobros de Meta para el SaaS.
   - **Campañas Proactivas sin LLM:** El envío de campañas masivas (mensajes proactivos de salida) utiliza plantillas estáticas pre-aprobadas por Meta y **NO utiliza LLM** (cero consumo de tokens). Para despacharse, el cliente debe asociar un método de pago directo en su cuenta de Meta/Facebook Business, por lo que Meta le cobra las conversaciones de salida a él directamente.
   - **Ventana de 24 Horas:** Las respuestas y mensajes automáticos de seguimiento/remarketing se realizan estrictamente dentro de la ventana de 24 horas de Meta. No se inician chats automatizados de forma proactiva fuera de esa ventana para cumplir con las políticas anti-spam.
   - El soporte Multimodal (Audio/Visión) deduce dinámicamente formatos (ej. MP4 vs OGG) en `speech-service.ts` según la red social.
5. **Validación y Pruebas Automatizadas Obligatorias (Modelo Híbrido con Vitest)**:
   - **Evaluación Obligatoria en cada Fix/Feat**: Por cada corrección de errores (`fix`) o nueva característica (`feat`), el agente **DEBE analizar y determinar explícitamente** qué capa de nuestra **Estrategia Híbrida de Pruebas (`vitest.config.ts`)** requiere nuevos tests o modificación de los existentes:
     1. **Capa 1 — Pruebas Unitarias Puras (`tests/unit/`)**: Para lógica matemática, criptográfica (`verifyMetaSignature`), parsers de webhooks (`parseInstagramDeleteEvents`, etc.) o conversiones horarias (`time-utils.ts`). Se ejecutan en entorno `node` ultrarrápido sin acceso a red ni a la base de datos (`npm run test:unit`).
     2. **Capa 2 — Pruebas de Integración Reales (`tests/integration/` o `scripts/testing/`)**: Para validación de contratos entre módulos, CRONs, webhooks, bases de datos Supabase o llamadas LLM/API (`npm run test:integration` con `testTimeout: 60000ms`).
   - **Plan de Verificación Explícito**: La sección "Verification Plan" de cada plan de implementación debe incluir obligatoriamente el comando exacto de terminal para ejecutar las pruebas automatizadas (ej: `npm test`, `vitest run tests/unit/nombre.test.ts` o scripts en `scripts/testing/`). Se debe priorizar la validación automatizada sobre la manual interactiva en el navegador.
   - **Uso de `.env.local` para Pruebas**: Los scripts de prueba y comandos deben siempre utilizar las variables de entorno de `.env.local` que no estén comentadas (ej. cargándolas con `dotenv` o corriendo contra la API en el servidor de desarrollo local `http://localhost:3000` si es posible, o conectando a Supabase directamente para scripts independientes).
   - **Aislamiento Estricto en Staging**: Todas las pruebas y scripts locales que involucren la base de datos deben ejecutarse **única y exclusivamente contra la base de datos de Staging** (`njegucpkhdlnzlqvuntd`). Queda terminantemente prohibido ejecutar pruebas o scripts de test contra la base de datos de Producción (`wtutgggapffysxxnzouz`). Todo script de test debe incluir una salvaguarda a nivel de código que valide el `NEXT_PUBLIC_SUPABASE_URL` y aborte la ejecución inmediatamente con un error si este contiene el ID de producción (`wtutgggapffysxxnzouz`).
   - **🚨 ALERTA DE PRODUCCIÓN**: Las variables de entorno no comentadas en `.env.local` deben tratarse con extrema precaución, ya que son consideradas las variables de producción del sistema. Ten sumo cuidado al ejecutar pruebas o scripts modificadores para no alterar, duplicar o borrar datos reales. Los scripts de prueba y limpieza deben estar diseñados de forma quirúrgica para borrar EXCLUSIVAMENTE los registros creados durante el test (utilizando identificadores únicos de prueba como UUIDs temporales o prefijos específicos, ej. `test-landing-lead-temp@whagil.com`) y jamás ejecutar queries destructivas masivas (como `DELETE` sin filtros explícitos). Si de alguna manera se corre peligro de pérdida de datos reales, el agente debe detenerse e informar primero al usuario.
---

## Multi-Environment & Supabase Policy

Antes de realizar cualquier cambio, debes verificar siempre en qué rama Git te encuentras. Esto determina el proyecto de Supabase al que debes aplicar cambios y migraciones.

| Rama | Entorno | Supabase Project ID |
|------|---------|---------------------|
| `main` | Producción | `wtutgggapffysxxnzouz` |
| Cualquier otra | Staging | `njegucpkhdlnzlqvuntd` |

> **OBLIGACIÓN DE BÚSQUEDA CRUZADA:** Cuando se solicite buscar, depurar o borrar un usuario/tenant manualmente, el Agente IA **DEBE SIEMPRE** listar los proyectos con `list_projects` y buscar el registro en **AMBAS bases de datos** (Producción y Staging) para identificar en cuál de los dos entornos se registró realmente, evitando falsos negativos.

### Regla de Oro para Migraciones — PARIDAD OBLIGATORIA
Ambas bases de datos (Staging y Producción) **DEBEN ser idénticas en esquema en todo momento**. Toda migración **DEBE** aplicarse en **AMBAS** bases de datos sin excepción, independientemente de la rama Git activa. Si una migración falla en una de las dos, el Agente **DEBE** reportar el error inmediatamente y NO considerarla completada hasta que ambas estén sincronizadas.

1.  **Crear Archivo:** Siempre crea un archivo `.sql` en `supabase/migrations/` con un timestamp descriptivo.
2.  **Aplicar en Staging PRIMERO:** Usa el MCP `execute_sql` (o `apply_migration`) con el ID de Staging (`njegucpkhdlnzlqvuntd`).
3.  **Aplicar en Producción INMEDIATAMENTE DESPUÉS:** Usa el MCP `execute_sql` (o `apply_migration`) con el ID de Producción (`wtutgggapffysxxnzouz`).
4.  **Verificar paridad:** Tras aplicar, confirma que la tabla/columna existe en **ambos** proyectos antes de marcar la tarea como completada.

### 🚨 Fallback: Conexión Manual (Si el MCP falla)
Si el servidor MCP de Supabase falla (ej. por errores de validación de esquema como `invalid_union`), el Agente de IA tiene autorización para omitirlo y usar directamente la API de Supabase o la CLI inyectando el Personal Access Token.

**Verificar última migración remota aplicada vía API:**
```bash
curl -s "https://api.supabase.com/v1/projects/<PROJECT_ID>/database/migrations" \
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" | jq '.[-1]'
```

**Aplicar migraciones vía CLI (alternativa al MCP):**
Si se cuenta con el Password de base de datos, se puede usar el CLI:
```bash
SUPABASE_ACCESS_TOKEN=<SUPABASE_ACCESS_TOKEN> npx supabase db push \
  --db-url "postgresql://postgres.<PROJECT_ID>:<DB_PASSWORD>@<REGION>.pooler.supabase.com:6543/postgres"
```

**Ejecutar Consultas SQL Crudas (Management API):**
Si el agente necesita leer el esquema o ejecutar sentencias SQL directas (como lo hacía el MCP en el fondo):
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/<PROJECT_ID>/database/query" \
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM public.tenant_ai_settings LIMIT 5;"}'
```

**Consultas de Datos vía REST (PostgREST):**
Para consultar o modificar registros en las tablas de forma sencilla sin SQL crudo, usando la Service Role Key almacenada en `.env.local`:
```bash
curl -s "https://<PROJECT_ID>.supabase.co/rest/v1/<TABLE_NAME>?select=*" \
  -H "apikey: <SUPABASE_SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"
```

---

## Deployment notes

- **SaaS** deploys to Vercel (Next.js). Branch `test-meta-app` deploys to Preview URL.
- **VPS Stack** runs on Contabo VPS (`37.60.243.110:4422`, user `leonuser`) at `/opt/whatsapp-saas/vps` via Docker Compose:
  - **CRITICAL PATH:** The VPS project directory is `/opt/whatsapp-saas/vps`. Only manage docker, rebuild, restart, and inspect containers inside this directory. Do not interact with any other paths.
  - `evolution-api` — Evolution API v2.3.7 (single container, all tenant instances)
  - `redis` — Session cache for Evolution
  - `cron-pinger` — Periodic ping to SaaS CRON endpoints
- **Nginx** on VPS reverse-proxies `bot.leonesconsulting.com` → `127.0.0.1:3001` (Evolution)
- **GitHub Actions** deploys `vps/` directory to the VPS on push to `main`
- Never test code by modifying `main` directly on the VPS

### VPS Deploy after code changes:
```bash
ssh -p 4422 leonuser@37.60.243.110
cd /opt/whatsapp-saas/vps
git pull origin <branch>
docker compose up -d --build  # Rebuilds cron-pinger; Evolution uses official image
```

### Reactivación de Cuentas Suspendidas (Pago Mes Vencido)
Si un tenant se encuentra suspendido (`status = suspended` o inactivo), **NO debe utilizarse `PlanSelector` ni la creación de un nuevo intent de suscripción regular (`subscribe-create`)**, ya que esos métodos asumen la creación de un nuevo negocio o obligan al pago automático (Oneclick). En su lugar, el sistema dispone del endpoint **`/api/webpay/pay-overdue`**. Este endpoint genera un cobro único mediante Webpay Plus regular permitiendo pagar 1, 6 o 12 meses adeudados sin forzar la asociación de tarjeta. Las compras de bolsas de mensajes deben estar estrictamente bloqueadas para cuentas suspendidas, mostrando una alerta visual que requiera regularizar el pago del plan primero.

### Multi-Sale (Recurring Purchases) & Tool Injection 
To support multiple complete sales flows within the same WhatsApp chat session without duplicate inserts or tool hallucinations:
1. **Tool Injection (`agent/route.ts`)**: `cerrar_venta` and `crear_comanda` MUST be unconditionally injected for `sales_simple` and `sales_inventory` bot modes, regardless of whether the database thinks `sale_closed` is true or false. Stripping the tools forces the LLM to hallucinate confirmations without triggering the backend logic.
2. **Classifier (`classifier.ts`)**: The prompt MUST instruct the LLM to aggressively transition `crm_status` to `'siguiendo'` if the *latest* messages indicate a new purchase intention ("quiero otra cosa"), even if there is a previous `¡VENTA EXITOSA!` in the transcript history.
3. **Guard Bypass (`sale-closed.ts`)**: The 15-minute anti-duplicate guard allows legitimate back-to-back sales ONLY if `contact.sale_closed === false`. If it evaluates to `true` (e.g. classifier hasn't caught up, or duplicate message), it MUST return `[SILENT_DUPLICATE]` without returning a new `customConfirmationMessage` to prevent the LLM from outputting duplicate success texts.

### Arquitectura Robusta del Carrito de Compras (Máquina de Estados)
Para evitar alucinaciones matemáticas y dobles ventas, el carrito ahora reside en la base de datos PostgreSQL (`shopping_carts`), y la IA es una mera operadora.
- **Herramientas de venta estructurada:** La IA está sujeta al campo `conversation_stage` en la tabla `contacts` (BROWSING, CHECKOUT_ADDRESS, CHECKOUT_PAYMENT, CLOSED). 
- **Restricción de herramientas por fase:**
  - Si el estado es `BROWSING`, las herramientas de `confirmar_pago` están bloqueadas. La IA usa `iniciar_checkout` que transiciona el estado y bloquea temporalmente el carrito.
  - Si el estado es `CHECKOUT_*`, la IA NO puede usar `agregar_al_carrito` ni `quitar_del_carrito`. Solo puede recabar método de pago y llamar a `confirmar_pago`.
- **Restricción de categorías genéricas:** La IA tiene prohibido usar `agregar_al_carrito` si el cliente menciona un nombre de categoría genérico (ej. "Cereal"). Debe preguntar primero.

### Reportes Omnicanal y Métricas Globales del CRM
Las tablas centrales del negocio (`contacts`, `appointments`, `sales`) son **omni-canal y globales por tenant**, no tienen columnas de `channel` ni `connection_id`. 
- **El Error Común:** Al construir consultas SQL RPC para calcular el ROI o funnel de ventas de un canal específico (ej. "Web Chat"), NO puedes simplemente consultar `contacts` de forma directa, porque eso te devolverá los contactos de *todos* los canales (sumando ventas de WhatsApp, IG, etc).
- **La Solución Arquitectónica:** Para filtrar el CRM por un canal específico, DEBES hacer un cruce (JOIN o EXISTS) con la tabla `whatsapp_messages` (`m.contact_id = c.id`) verificando que el contacto haya intercambiado al menos un mensaje a través de una conexión (`connection_id`) que pertenezca a dicho canal (`whatsapp_connections.connection_type`).

### Métricas de Oportunidad de Venta y Aislamiento de Ingresos (potential_revenue)
El sistema ahora calcula "Oportunidades de Venta" para los canales en modo Consultor (Support), sumando los precios de los productos por los que el cliente muestra interés. 
- **La Regla de Aislamiento:** NUNCA debes sumar estimaciones de oportunidad o cotizaciones en la columna `total_spent` de `contacts`. Esa columna es estrictamente para ventas cerradas reales que impactan los ingresos (`total_revenue`). Las oportunidades de venta estimadas deben guardarse y consultarse EXCLUSIVAMENTE mediante la columna `potential_revenue` en `contacts`.
- **Comportamiento del Clasificador:** En cada mensaje, el LLM lee la transcripción entera. Si extrae un `sale_amount` (suma de los productos mencionados), este valor pisa (overwrite) el `potential_revenue` anterior. NUNCA utilices `+=` con `potential_revenue` en `classifier.ts`, ya que el LLM recalcula el total acumulado de la conversación.

### PL/pgSQL: Ambigüedad en Columnas de RETURNS TABLE
Al utilizar funciones RPC en Supabase (PostgreSQL) que devuelven tablas (`RETURNS TABLE (..., potential_revenue NUMERIC)`), si utilizas un sub-query o un CTE (ej. `contact_stats`) que consulta una tabla física que también tiene una columna con el **mismo nombre exacto** (`contacts.potential_revenue`), PostgreSQL arrojará el error silencioso: `42702: column reference is ambiguous`.
- **La Solución Estricta:** Siempre que sumes, cuentes o devuelvas una columna dentro de la función que comparta nombre con un valor de salida del `RETURNS TABLE`, DEBES utilizar el alias explícito de la tabla/CTE (ej. `SUM(contact_stats.potential_revenue)`) en el `SELECT` final. De lo contrario, la función fallará con un HTTP 500 y todos los reportes del frontend caerán a cero.

### Vercel Hobby Cron Limits & VPS Fallback Architecture (Pinger)
El plan gratuito de Vercel (Hobby) tiene una restricción estricta: **Solo permite ejecutar cada CRON 1 vez al día (máximo 2 crons en total en la cuenta)**. Si intentas desplegar un `vercel.json` con expresiones cronónicas de mayor frecuencia (ej. `0 * * * *` para ejecución cada hora), Vercel rechazará toda la compilación y **bloqueará el despliegue** con un error de validación de esquema.
- **La Solución (Arquitectura Pinger):** Cualquier tarea en segundo plano que requiera mayor frecuencia (ej. el publicador de Meta que corre cada 10 minutos, o remarketing) **NO DEBE** figurar en `vercel.json`. En su lugar, el endpoint de la API (`/api/cron/...`) debe ser llamado por el servicio `cron-pinger` que corre en el contenedor Docker del VPS (`vps/cron-pinger/index.js`), utilizando simples `setInterval`.
- **CRONs Diarios Restantes:** Los únicos CRONs permitidos en `vercel.json` son aquellos estrictamente diarios (ej. facturación/suscripciones o limpieza de retención diaria de almacenamiento a las 02:00 AM).

### UI/UX Modernization (Toasts & Modals)
Para mantener un estándar premium en la aplicación, **está estrictamente prohibido el uso de las funciones nativas del navegador `window.alert()` y `window.confirm()`** en cualquier nueva interfaz de usuario.
- **Alertas y Notificaciones:** Utilizar siempre la librería `sonner`. Importa `toast` (`import { toast } from 'sonner'`) y dispara alertas con `toast.success()` o `toast.error()`. El `<Toaster />` global ya está inyectado en `layout.tsx`.
- **Diálogos de Confirmación:** Para acciones destructivas (como eliminar registros), en lugar de `confirm()`, importa y utiliza el componente `<ConfirmModal>` ubicado en `src/components/modals/ConfirmModal.tsx`. Controla su visibilidad mediante un estado local booleano o guardando el ID del elemento a eliminar.

### Renderizado Multimedia en React (Video vs Imagen)
Al construir interfaces que previsualizan archivos multimedia subidos al bucket de Supabase (ej. el Autopublicador), **nunca asumas ciegamente que el archivo es una imagen**. Si un usuario sube un archivo `.mp4` y lo renderizas en un tag `<img src="...">`, el navegador mostrará el ícono de "imagen rota". 
- **La Solución:** Siempre evalúa el tipo de medio (`media_type === 'VIDEO'` o revisa la extensión del `media_url`) y renderiza condicionalmente un tag `<video controls className="...">` en lugar del tag `<img>`.

### YouTube Comments Moderation — Architecture & API Limits
YouTube moderation (unlike Meta Webhooks) relies on an active polling mechanism because the YouTube Data API v3 does not natively support webhooks for comments.
- **Polling Pipeline:** The `cron-pinger` running on the VPS invokes `/api/cron/youtube-comments` every 5 minutes. This bypasses Vercel's Hobby plan limitation (which only allows daily crons).
- **Idempotency:** Because of active polling, the system MUST deduplicate comments. The `youtube_comments` table records every processed comment (`tenant_id`, `youtube_comment_id`). Any comment present in this table is skipped.
- **Authentication:** The Google API Node client (`googleapis`) natively refreshes the `access_token` automatically if instantiated with a `refresh_token`. The CRON passes `conn.metadata.oauth_refresh_token` to `oauth2Client.setCredentials()` on every run.
- **AI Classification:** The classification utilizes an internal fetch to `/api/agent` (prompting the `classifyCommentSentiment` internal endpoint). If a comment is deemed `DELETE`, the script calls `youtube.comments.setModerationStatus({ id: [commentId], moderationStatus: 'rejected' })`.

### YouTube API — `allThreadsRelatedToChannelId: 'me'` Bug & Owner Comments
When fetching YouTube comments via `youtube.commentThreads.list`, do **NOT** use `allThreadsRelatedToChannelId: 'me'`. This throws a 404 error ("The channel identified by the parameter could not be found") for certain brand accounts and sub-channels.
- **Rule 1 (Dynamic Channel ID):** Always fetch the authenticated user's actual channel ID first using `youtube.channels.list({ mine: true })`, and pass that explicit `channelId` to `allThreadsRelatedToChannelId`.
- **Rule 2 (Owner Exclusion):** When iterating through `threads`, you **MUST** exclude comments authored by the channel owner (`topLevelComment.authorChannelId?.value === channelId`) before passing them to the AI. Failing to do this causes the AI to moderate (delete/hide) the owner's own pinned comments or Call to Actions, mistaking promotional links for spam.
