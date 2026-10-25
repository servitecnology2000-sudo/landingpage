# Plan Técnico de Implementación — Autenticación OTP, Bloqueo 24h y Recuperación Segura

**Estado:** Propuesta Técnica — Aprobado con Contrapropuesta B y Recuperación Segura (Gate 2 / SDD)  
**Spec Asociada:** [SPEC-ADMIN-OTP-001](file:///c:/servitecnology/landingpage/.agents/specs/admin-otp-auth.md)  
**ID del Documento:** `PLAN-ADMIN-OTP-001`  

---

## 1. Resumen Técnico de Arquitectura y Seguridad

Este plan actualiza y detalla la implementación de seguridad para el mesón administrativo (`/meson-servitecnology-st`) integrando:
1. **Autenticación en dos etapas (2FA):** Contraseña maestra -> OTP de 6 dígitos.
2. **Cuenta única autorizada:** `jesusleon@servitecnology.com` para OTP, alertas y recuperación.
3. **Bloqueo de 24 horas:** Al 3er intento fallido consecutivo (fase contraseña o fase OTP).
4. **Procedimiento de Recuperación de Emergencia:** Enlace firmado de un solo uso con caducidad de 15 minutos enviado a `jesusleon@servitecnology.com`.
   - **Regla estricta:** Desbloquea la cuenta y resetea fallos, pero **NUNCA crea una sesión ni permite entrar directo al mesón**. Exige una nueva autenticación completa (Password + OTP).
5. **Sesiones de Servidor con Hash Exclusivo:** La cookie `admin_session` almacena un token aleatorio de 32 bytes (`session_token`), mientras que la tabla `admin_sessions` almacena **únicamente su hash SHA-256**. Se elimina por completo `ADMIN_SECRET` de las cookies.
6. **Eliminación Total de Rutas Alternativas:** Todos los endpoints bajo `/api/admin/*` validan exclusivamente mediante sesión de servidor. Cero bypasses.
7. **Auditoría Inmutable (Append-Only):** Tabla `admin_security_audit_logs` con trigger de PostgreSQL que bloquea `UPDATE` y `DELETE`.

---

## 2. Detalle Archivo por Archivo

### 2.1 Archivos Nuevos

#### `[NEW]` `supabase/migrations/20261012_admin_otp_security.sql`
* **Responsabilidad:** Script DDL con las 5 tablas de seguridad:
  1. `admin_security_state`: Contador unificado de fallos, marcas de bloqueo de 24h, incidentes y control de alertas.
  2. `admin_recovery_tokens`: Tokens de recuperación de 15 minutos con hash SHA-256 (`recovery_token_hash`) y estado de consumo (`used`).
  3. `admin_otp_tokens`: Desafíos OTP de 6 dígitos con hash SHA-256, expiración de 10 min y límite de 3 verificaciones.
  4. `admin_sessions`: Sesiones administrativas activas con hash SHA-256 (`session_token_hash`) y estado de revocación.
  5. `admin_security_audit_logs`: Pistas de auditoría con trigger Append-Only (bloqueo de UPDATE/DELETE).
* **Seguridad:** Habilita RLS en todas las tablas y restringe el acceso al rol `service_role`.

#### `[NEW]` `src/lib/admin-security.ts`
* **Responsabilidad:** Módulo central de control de acceso y seguridad:
  - `checkLockout(email: string, ip: string)`: Comprueba si existe bloqueo activo de 24h en base de datos.
  - `recordAuthFailure(email: string, ip: string)`: Operación atómica en `admin_security_state`. Incrementa fallos; al 3er fallo activa bloqueo de 24h y genera incidente.
  - `resetAuthFailures(email: string)`: Resetea contador a 0 exclusivamente tras autenticación 2FA exitosa.
  - `createRecoveryChallenge(email: string, incidentId: string)`: Genera token de 32 bytes hex, almacena su hash SHA-256 en `admin_recovery_tokens` con vigencia de 15 min. Retorna el enlace de recuperación.
  - `consumeRecoveryChallenge(rawToken: string)`: Operación atómica que valida el hash, marca `used = true`, verifica vigencia (<15 min), levanta el bloqueo (`locked_until = NULL`) y resetea fallos a 0. **No emite sesión**.
  - `createAdminSession(email: string, ip: string, userAgent: string)`: Genera token de 32 bytes hex y persiste su hash SHA-256 en `admin_sessions`.
  - `validateAdminSession(rawToken: string)`: Compara `SHA-256(rawToken)` contra `session_token_hash` en `admin_sessions` verificando `expires_at > NOW()` y `revoked = false`.
  - `revokeAdminSession(rawToken: string)`: Marca la sesión como revocada (`revoked = true`) en Supabase.
  - `logSecurityAudit(event: string, email?: string, ip?: string, metadata?: Record<string, any>)`: Inserción en tabla Append-Only.

#### `[NEW]` `src/lib/otp.ts`
* **Responsabilidad:** Generador y validador de OTP de 6 dígitos:
  - Generación de código de 6 dígitos criptográfico (`crypto.randomInt(100000, 1000000)`).
  - Hashing seguro SHA-256 del código antes de persistirlo en `admin_otp_tokens`.
  - Verificación atómica con consumo único (`used = true`).
  - Cooldown de 60 segundos por desafío para reenvío.

#### `[NEW]` `src/pages/meson-servitecnology-st/recuperar.astro`
* **Responsabilidad:** Controlador del procedimiento de recuperación de emergencia:
  - Lee el parámetro `token` de la URL (`/meson-servitecnology-st/recuperar?token=...`).
  - Invoca `consumeRecoveryChallenge(token)` en `admin-security.ts`.
  - Si es válido: Levanta el bloqueo de la cuenta, registra el evento en auditoría y redirige a `/meson-servitecnology-st/login?recovered=true` mostrando el mensaje: *"Bloqueo levantado exitosamente. Por favor, inicia sesión con tu contraseña y código OTP."*
  - **No emite cookie de sesión ni otorga acceso directo al mesón.**
  - Si es inválido o expiró (>15 min): Muestra pantalla de error de seguridad genérica informando que el enlace es inválido o ya fue utilizado.

#### `[NEW]` `tests/admin/admin-security-otp.test.ts`
* **Responsabilidad:** Suite de pruebas automatizadas con Vitest cubriendo 14 casos obligatorios:
  1. Dos intentos fallidos no activan bloqueo.
  2. Tercer intento fallido activa bloqueo de exactamente 24 horas.
  3. Autenticación correcta es rechazada si existe bloqueo vigente.
  4. Bloqueo persiste tras recargar, borrar cookies o cambiar de navegador.
  5. Solicitud o reenvío de OTP no reinicia contador general de fallos.
  6. Endpoints administrativos rechazan solicitudes sin sesión de servidor o revocadas.
  7. Concurrencia atómica (múltiples solicitudes simultáneas no eluden el límite de 3 fallos).
  8. Idempotencia de alerta (exactamente un correo por bloqueo a `jesusleon@servitecnology.com`).
  9. Si SMTP falla, bloqueo de 24h permanece intacto y la alerta queda pendiente para recuperación.
  10. Expiración de 24h calculada en el servidor (con mock time).
  11. Enlace de recuperación de 15 min levanta el bloqueo y resetea fallos exitosamente.
  12. Enlace de recuperación consumido o vencido no permite desbloqueo y no emite sesión.
  13. Enlace de recuperación nunca genera sesión de acceso directo (exige re-autenticación con contraseña y OTP).
  14. Correos y logs no exponen contraseñas, OTP, tokens de sesión ni secretos.

---

### 2.2 Archivos Modificados

#### `[MODIFY]` `src/lib/mailer.ts`
* **Razón del cambio:** Agregar funciones de envío de seguridad:
  1. `sendAdminOtpEmail({ email, code, expiresMinutes })`: Despacho del código OTP de 6 dígitos.
  2. `sendAdminLockoutAlertEmail({ incidentId, email, ip, lockedUntil, attempts, recoveryUrl })`: Despacho de alerta a `jesusleon@servitecnology.com` con timestamp Chile CLT, IP confiable y botón con enlace seguro de recuperación de 15 min.
* **Aislamiento:** Las funciones existentes de comercio electrónico permanecen **100% intactas**.

#### `[MODIFY]` `src/pages/meson-servitecnology-st/login.astro`
* **Razón del cambio:** Implementar flujo de dos etapas y manejo de bloqueo/recuperación:
  - Verificación previa de bloqueo en servidor (`checkLockout`). Si está bloqueado, muestra aviso de seguridad genérico con fecha/hora de término.
  - Mensaje de confirmación cuando llega con `?recovered=true` tras desbloquearse.
  - Etapa 1: Valida que el correo sea `jesusleon@servitecnology.com` y comprueba contraseña maestra. Al 3er fallo consecutivo, activa bloqueo y dispara alerta con enlace de recuperación.
  - Etapa 2: Formulario de 6 dígitos con temporizador de 10 min y espera de 60s para reenvío.
  - Al acertar OTP: Genera sesión en `admin_sessions` con hash y emite cookie aleatoria `admin_session`.

#### `[MODIFY]` `src/pages/meson-servitecnology-st/logout.astro`
* **Razón del cambio:** Revocación real de sesión en servidor.
* **Bloques afectados:** Lee cookie `admin_session`, ejecuta `revokeAdminSession(token)` en Supabase y elimina la cookie.

#### `[MODIFY]` `src/layouts/AdminLayout.astro`
* **Razón del cambio:** Validación de sesión de servidor.
* **Bloques afectados:** Reemplaza `cookie.value === adminSecret` por `validateAdminSession(cookie.value)`. Si la sesión es inválida o revocada, redirige a login.

#### `[MODIFY]` Endpoints Administrativos (`src/pages/api/admin/*`)
* **Razón del cambio:** Validación exclusiva de sesiones de servidor.
* **Endpoints afectados:**
  - `src/pages/api/admin/orders/update-status.ts`
  - `src/pages/api/admin/customers/save.ts`
  - `src/pages/api/admin/customers/delete.ts`
  - `src/pages/api/admin/galeria/upload.ts`
  - `src/pages/api/admin/banners/upload.ts`
  - `src/pages/api/admin/banners/update.ts`
  - `src/pages/api/admin/banners/delete.ts`
* **Comportamiento:** Valida la sesión calculando `SHA-256(cookieToken)` en `admin_sessions`. Se elimina cualquier bypass basado en `ADMIN_SECRET` o cabeceras estáticas.

---

### 2.3 Archivos Deliberadamente NO Modificados (Inviolables)

* `src/pages/index.astro` y `src/components/Hero.astro` (0 diff contra git HEAD).
* Catálogo de repuestos (`/repuestos`, `src/components/RepuestosBannersCarousel.astro`, etc.).
* Flujo de compra y pasarela de pago (`src/pages/checkout.astro`, `src/pages/api/mercadopago/*`).
* Portal de clientes (`src/pages/mis-pedidos.astro`, `src/pages/api/account/*`).

---

## 3. Comandos de Verificación Exactos

```bash
# 1. Pruebas específicas de seguridad, OTP, bloqueo 24h y recuperación
npx vitest run tests/admin/admin-security-otp.test.ts tests/admin/auth-guard.test.ts

# 2. Pruebas de endpoints administrativos y regresión
npx vitest run tests/admin/orders-api.test.ts tests/admin/customers-api.test.ts tests/admin/banners-api.test.ts tests/lib/mailer.test.ts

# 3. Suite completa de pruebas del repositorio
npx vitest run

# 4. Compilación de producción (Astro SSR)
npm run build

# 5. Comprobación de integridad de la portada (debe ser 0 diff)
git diff --stat src/pages/index.astro src/components/Hero.astro
```

---

## 4. Estrategia de Migración y Rollback

1. **Revisión de Migración SQL:**
   Se generará el archivo `supabase/migrations/20261012_admin_otp_security.sql`. El usuario podrá inspeccionar el script y ejecutarlo en el SQL Editor de Supabase antes de desplegar.
2. **Pausa Humana (Gate 3):**
   Ninguna línea de código en `src/` será modificada hasta que el usuario dé su aprobación explícita al plan técnico y la especificación.
3. **Mecanismo de Reversión (Rollback):**
   Si ocurre cualquier inconveniente con la entrega de correo o la base de datos, el sistema mantendrá una variable de entorno de contingencia (`ADMIN_BYPASS_OTP_EMERGENCY=true`) que requeriría acceso manual al panel de Vercel para deshabilitar temporalmente el OTP sin alterar la base de datos.
