<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know (Next.js 15+)

> **CRITICAL RULE FOR AI AGENTS**: 
> You MUST ALWAYS update this `AGENTS.md` document whenever you implement any relevant architectural changes, new patterns, or structural modifications to the project. This document serves as the absolute source of truth for the project's architecture and must be kept up-to-date.

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Project Tech Stack & Architecture

- **Framework**: Next.js 15 (App Router) + React 19
- **Database**: PostgreSQL with Prisma ORM
- **Background Jobs & Event Processing**: BullMQ + Redis. Workers run in a dedicated `saas_worker` Docker container via `src/workers/index.ts`. 
  - *Note on Webhooks*: To prevent `504 Gateway Time-out` errors, Next.js API routes (like the Evolution API webhook) MUST NOT perform heavy synchronous DB operations. Incoming webhooks must simply be added to a BullMQ queue (e.g., `webhookQueue`) and respond immediately with HTTP 200. The actual processing logic must reside in a dedicated worker (e.g., `webhookWorker.ts`).
- **WhatsApp API**: Evolution API v2 (Dockerized)
- **Styling**: TailwindCSS v4 + Lucide React

## Evolution API v2 Webhooks & Read Receipts

When processing `messages.update` events for read receipts (delivered/read status), AI agents must adhere to the following Evolution API v2 specifications:
1. **Instance Settings Requirement**: The instance must be created or updated with `readMessages: true` and `readStatus: true`. If these are set to `false`, Evolution API will completely drop incoming read receipts from Baileys and the `MESSAGES_UPDATE` webhook will never fire.
2. **Payload Structure**: The payload structure for `MESSAGES_UPDATE` in Evolution API v2 differs from raw Baileys. It uses `keyId` instead of `key.id` for the WAMID, and `status` at the root of the update object instead of `update.status`.
   - **Correct parsing**: `const wamid = updateObj.keyId || updateObj.key?.id;` and `const statusVal = updateObj.status || updateObj.update?.status;`
3. **Status Codes**: Evolution API translates Baileys numeric codes into its own string or numeric values. You must handle both for maximum compatibility.
   - **Delivered**: `statusVal === "DELIVERY_ACK"` or `statusVal === 2` (or Baileys `3`).
   - **Read**: `statusVal === "READ"` or `statusVal === "PLAYED"` or `statusVal === 3` (or Baileys `4`, `5`).

## Evolution API Instance Disconnect (Known Bug & Fix)

When disconnecting a WhatsApp instance via `/api/instance/logout`, agents must be aware of the following gotchas:
1. **Zombie Baileys Sessions**: Evolution API v2 can enter a state where the Baileys session is corrupted — `connectionState` reports `"open"` but the phone shows no linked device. In this state, both `DELETE /instance/logout/{name}` (returns `500 Connection Closed`) and `DELETE /instance/delete/{name}` (returns `400 Bad Request`) will fail.
2. **Direct Axios Required**: The logout endpoint (`src/app/api/instance/logout/route.ts`) must use `axios` directly with `process.env.EVOLUTION_SERVER_URL` and `process.env.EVOLUTION_API_KEY` — the same pattern as `src/app/api/whatsapp/instance/route.ts`. Do NOT use the `evolutionApi` wrapper from `src/lib/evolution.ts` for critical lifecycle operations.
3. **Double Strategy (Logout + Delete)**: The endpoint must attempt both `logout` and `delete` sequentially. `logout` cleanly closes the Baileys socket; `delete` destroys the instance record and cached session from the Evolution DB. Both are needed because either can fail independently.
4. **Nuclear Recovery**: If both API calls fail (zombie state), the only fix is direct SQL on the `evolution` PostgreSQL database: delete from `Message`, `Chat`, `Contact`, `Setting`, `Webhook`, and `Instance` tables for the affected instance ID, then `docker restart saas_evolution_api`.

## Hot Reload vs Background Workers (Docker)

We use `docker-compose.override.yml` to map volumes directly to the host for real-time development.
- **UI / API Routes**: Any change in `src/app` or `src/components` triggers Next.js Fast Refresh automatically.
- **Background Workers**: Files like `src/workers/campaignWorker.ts` or `cronWorker.ts` run in the completely separate `saas_worker` container. They do NOT run inside Next.js. **If you modify a worker, hot reload will not apply. You MUST rebuild the containers by running `docker compose up -d --build saas_app saas_worker` to apply changes.**

## Browser Caching & Static Assets (Next.js)

When replacing static image assets in the `public/` directory (like `icon.png` or `logo.png`), browsers and Next.js aggressively cache the old image based on its URL.
- **Cache Busting Rule**: DO NOT just overwrite the image file and expect the user to see it. You MUST physically rename the file (e.g., from `icon.png` to `whalink-logo-rounded.png`) and update all `<img src="...">` and metadata references in the codebase to point to the new filename. This is the only guaranteed way to force a cache bypass in production.

## AI Agent Skills & Best Practices

The agent skills for this project are installed in the `.agents/skills/` directory.
> **CRITICAL RULE FOR AI AGENTS**: You MUST ALWAYS read the `SKILL.md` files located in the `.agents/skills/` directory before writing code, modifying architecture, or making decisions. These skills contain the official guidelines and best practices for this project.

## Testing & Documentation Workflow

- **PRP Updates (Product Requirements Plan):** `docs/PRP.md` is the absolute source of truth for tracking project phases.
- **Rule 1:** ALWAYS update `docs/PRP.md` immediately after executing tests to reflect the test results in the corresponding phase's checkbox list.
- **Rule 2:** ALWAYS update `docs/PRP.md` immediately after a Phase is concluded, changing its status from `PENDING` to `COMPLETED`.

When modifying this codebase, AI agents must adhere to the guidelines (such as `vercel-react-best-practices`) found in the skills folder:
1. **Performance**: Eliminate async waterfalls. Use `Promise.all()` for independent operations.
2. **Server Components**: Default to Server Components to reduce client-side JS. Use `"use client"` only when hooks or interactivity are needed.
3. **Linting & Strictness**: The project uses strict ESLint rules (Next.js 16.3 preview config). Do not ignore TypeScript types. If Prisma fields like `sleepStartHour` appear as lint errors, it is usually a local IDE cache issue; ensure `npx prisma generate` has been run and the IDE restarted.
4. **Test Scripts**: Any temporary or test scripts created during debugging or development MUST be placed inside the `scripts/` directory to keep the root directory clean.
5. **UI Alerts & Modals (Glassmorphism)**: NEVER use native `window.alert` or `window.confirm`. ALWAYS use `toast` from `react-hot-toast` for notifications, and the custom hook `useConfirm` (from `src/hooks/useConfirm.tsx`) for any user confirmations. This maintains the asynchronous, non-blocking Glassmorphism aesthetic.

## VPS Deployment Workflow

- **VPS Deployment Path**: The system is deployed on the VPS (`vmi2731999`) under the user `leonuser` at the path: `/home/leonuser/whabot` (`~/whabot`).
To deploy changes to the production VPS:
1. Commit and push all changes to the `main` branch on GitHub.
2. The VPS has an intelligent deployment script located at `./deploy.sh`.
3. Running `./deploy.sh` directly on the VPS (`cd ~/whabot && ./deploy.sh`) will automatically:
   - `git pull` the latest changes.
   - Detect if the modified files require a full Next.js rebuild (`docker compose up -d --build saas_app`) or just a quick restart (`docker compose restart saas_app`).
   - Automatically apply any pending Prisma migrations using a lightweight Alpine Node container before restarting.
4. Agents can deploy directly by running the command `ssh -p 4422 leonuser@37.60.243.110 'cd ~/whabot && ./deploy.sh'` on the terminal if the user requests it.
5. **Database Migrations on VPS**: Next.js in "Standalone" mode purges `libc6-compat` and Prisma CLI engines to save space. Therefore, **NEVER** attempt to run `npx prisma migrate deploy` directly inside the `saas_nextjs` container. Instead, launch a temporary throwaway container to execute the migration from the outside:
   ```bash
   docker run --rm --network whabot_saas_network --env-file .env -v $(pwd):/app -w /app node:22-alpine sh -c "apk add --no-cache openssl libc6-compat && npm install prisma@5.22.0 && npx --yes prisma migrate deploy"
   ```
## Security & Dependency Management

- **Next.js Version Lock**: The project is intentionally locked to **Next.js 15.5.x**. This version includes critical security patches (like the fix for the RCE vulnerability GHSA-9qr9-h5gf-34mp) while maintaining compatibility with our current authentication flow (`next-auth` v4).
- **No Blind Major Upgrades**: AI agents MUST NOT blindly upgrade the project to Next.js 16. Upgrading to v16 introduces breaking changes to caching, Server Components, and asynchronous APIs (`cookies()`, `headers()`) which completely break `next-auth` v4. A migration to v16 must only be done in a dedicated, planned phase.
- **Periodic Security Audits**: Agents should periodically run `npm audit` to check for vulnerabilities in sub-dependencies. Apply patches using minor or patch versions only (`^` or `~`), avoiding major version bumps for core libraries like `next`, `react`, or `next-auth`.
- **Local Volume Shadowing Caveat**: Because `docker-compose.override.yml` mounts `.:/app`, the host's `node_modules` and `.next` directories override the ones built inside the container. **CRITICAL**: Whenever an AI agent modifies `package.json` to update a dependency, the agent MUST instruct the user to run `rm -rf .next node_modules package-lock.json && npm install` locally before restarting their containers to prevent "Internal Server Error" crashes caused by stale caches.

<!-- END:nextjs-agent-rules -->
