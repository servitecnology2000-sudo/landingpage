# Especificación de Requisitos del Sistema (SRS) — Autenticación OTP, Bloqueo de 24h y Recuperación Segura del Mesón Administrativo

**Estado:** En Planificación — Aprobado con Contrapropuesta B y Recuperación Segura (Gate 1 / SDD)  
**ID del Documento:** `SPEC-ADMIN-OTP-001`  
**Módulo:** Seguridad, Autenticación 2FA, Control de Abusos y Recuperación (`/meson-servitecnology-st`)  
**Fecha:** 2026-10-11  

---

## 1. Problema y Justificación de Negocio

El acceso administrativo al mesón (`/meson-servitecnology-st`) gestiona catálogo de productos, compras de clientes, datos personales, facturación SII y conciliación bancaria.

El esquema previo basado únicamente en una contraseña maestra compartida (`ADMIN_SECRET`) en una cookie estática presenta riesgos de seguridad severos:
1. Vulnerabilidad frente a filtraciones de credenciales maestras.
2. Ausencia de bloqueo ante ataques de fuerza bruta continuos.
3. Imposibilidad de revocar sesiones de manera individual del lado del servidor.
4. Falta de alertas tempranas ante intentos de intrusión.
5. **Riesgo crítico de DoS por bloqueo ciego:** Si un bloqueo estricto de 24 horas no cuenta con un procedimiento de recuperación legítimo, un atacante externo podría provocar deliberadamente la denegación de servicio del administrador legítimo enviando 3 intentos fallidos cada 24 horas.

Para resolver esto sin degradar la seguridad, se adopta formalmente la **Contrapropuesta B con Controles Adicionales**:
- Autenticación en dos etapas (Password -> OTP de 6 dígitos).
- Único correo administrativo autorizado: `jesusleon@servitecnology.com`.
- Bloqueo del acceso normal durante 24 horas al 3er intento fallido consecutivo.
- Procedimiento de recuperación de emergencia mediante enlace seguro de un solo uso (15 minutos) enviado exclusivamente a `jesusleon@servitecnology.com`.
- **Regla estricta:** El enlace de recuperación desbloquea la cuenta pero **NUNCA crea una sesión ni permite el acceso directo al mesón**; exige una nueva autenticación completa desde cero (Password + OTP).
- Sesiones aleatorias de servidor con almacenamiento exclusivo de hash SHA-256 (eliminación total de `ADMIN_SECRET` en cookies).
- Auditoría inmutable de eventos (Append-Only).

---

## 2. Arquitectura Funcional de Estados

```text
[Inicio de Sesión en /login]
       │
       ▼
[¿Existe Bloqueo Activo (24h)?] ──(SÍ)──> [Rechazo: Acceso Bloqueado durante 24h]
       │ (NO)                                    │
       ▼                                         ▼
[Paso 1: Credenciales Primarias]          [¿Llegó Enlace de Recuperación?]
 (Solo jesusleon@servitecnology.com)             │ (Accede a /recuperar?token=...)
       │                                         ▼
       ├──(Fallo)──> [Incrementar Fallos] ──> [Validar Hash en admin_recovery_tokens]
       │                    │                 [Consumo Atómico (used = true, <15min)]
       │                    ▼                 [Levantar Bloqueo (locked_until = NULL)]
       │             [¿3 fallos?]             [Resetear Fallos (failed_attempts = 0)]
       │              (SÍ)  │ (NO)            [NO Crea Sesión ──> Redirige a /login]
       │               │    └─> [Volver]                 ▲
       │               ▼                                 │
       │       [Activar Bloqueo 24h]                     │
       │       [Crear Token Recuperación (15 min)] ──────┘
       │       [Enviar Alerta a jesusleon@ con Link]
       │
       └──(Éxito)
             │
             ▼
[Paso 2: Generar OTP 6 Dígitos]
 (Hash SHA-256 en DB + Despacho Correo + Cookie Temporal Challenge)
       │
       ▼
[Paso 3: Verificación de Código OTP]
       │
       ├──(Fallo OTP)──> [Incrementar Fallos Generales] ──(¿3 fallos?)──> [Bloqueo 24h]
       │
       └──(Éxito OTP)
             │
             ▼
[Consumo Atómico de OTP]
[Generar Token Sesión Aleatorio (32 bytes)]
[Guardar SHA-256(Token) en admin_sessions (24h)]
[Emitir Cookie 'admin_session' con Token Aleatorio (NUNCA ADMIN_SECRET)]
[Restablecer Contador de Fallos a 0]
[Redirigir a /meson-servitecnology-st]
```

---

## 3. Requisitos en Sintaxis EARS (Easy Approach to Requirements Syntax)

### 3.1 Identidad Administrativa y Evaluación de Bloqueo
* **THE SYSTEM SHALL** reconocer única y exclusivamente a `jesusleon@servitecnology.com` como cuenta administrativa autorizada para recibir códigos OTP, alertas de seguridad y enlaces de recuperación.
* **WHEN** un usuario envía credenciales en la Etapa 1, **THE SYSTEM SHALL** verificar en la base de datos si existe un bloqueo activo (`locked_until > NOW()`) para la cuenta antes de evaluar contraseñas.
* **IF** existe un bloqueo activo de 24 horas, **THEN THE SYSTEM SHALL** rechazar de inmediato la solicitud con el mensaje genérico: *"Acceso temporalmente restringido por razones de seguridad. Revisa tu correo electrónico para gestionar la recuperación o intente más tarde."*
* **WHEN** no existe bloqueo activo, **THE SYSTEM SHALL** verificar que el correo ingresado sea exactamente `jesusleon@servitecnology.com` y que la contraseña coincida con `ADMIN_SECRET` mediante comparación en tiempo constante (`crypto.timingSafeEqual`).
* **IF** el correo no es el autorizado o la contraseña es errónea, **THEN THE SYSTEM SHALL** registrar un intento fallido general e introducir un retraso artificial progresivo (1s en intento 1, 2s en intento 2).

### 3.2 Regla de Bloqueo de 24 Horas y Contador Unificado
* **WHEN** la cuenta administrativa acumula 3 intentos fallidos consecutivos (cualquier combinación de: contraseña incorrecta, correo no autorizado, OTP incorrecto o OTP vencido), **THE SYSTEM SHALL** bloquear el acceso durante exactamente 24 horas (`locked_until = NOW() + INTERVAL '24 hours'`).
* **THE SYSTEM SHALL** contabilizar los fallos de contraseña y los fallos de OTP dentro del **mismo contador unificado** (`failed_attempts`).
* **THE SYSTEM SHALL** asegurar que solicitar un nuevo OTP, reenviarlo o abrir otra pestaña **NUNCA** reinicie el contador de fallos ni elimine un bloqueo vigente.
* **THE SYSTEM SHALL** reiniciar el contador de fallos a 0 **ÚNICAMENTE** en dos circunstancias:
  1. Cuando el usuario completa exitosamente el flujo de autenticación completo (Paso 1 credenciales válidas + Paso 2 OTP verificado).
  2. Cuando el administrador completa exitosamente el procedimiento de recuperación mediante enlace de correo de un solo uso.
* **WHEN** un bloqueo de 24 horas expira de forma natural (`NOW() >= locked_until`):
  - **IF** el primer intento posterior es exitoso, **THEN THE SYSTEM SHALL** establecer `failed_attempts = 0` y `locked_until = NULL`.
  - **IF** el primer intento posterior es fallido, **THEN THE SYSTEM SHALL** iniciar un nuevo ciclo limpio con `failed_attempts = 1` y `locked_until = NULL`, requiriendo otros 3 fallos consecutivos en este nuevo ciclo para activar otro bloqueo de 24 horas.

### 3.3 Procedimiento de Recuperación de Emergencia mediante Enlace Seguro
* **WHEN** se activa un bloqueo de 24 horas al 3er fallo, **THE SYSTEM SHALL** generar un identificador de recuperación criptográficamente aleatorio e impredecible (`recovery_token` de 32 bytes hex).
* **THE SYSTEM SHALL** almacenar en `admin_recovery_tokens` **ÚNICAMENTE el hash SHA-256 del token** (`recovery_token_hash`), junto con el identificador del incidente, expiración estricta de 15 minutos (`expires_at = NOW() + INTERVAL '15 minutes'`) y estado `used = false`.
* **THE SYSTEM SHALL** construir un enlace seguro de recuperación:  
  `https://servitecnology.com/meson-servitecnology-st/recuperar?token=<recovery_token>` e incluirlo en el correo de alerta despachado a `jesusleon@servitecnology.com`.
* **WHEN** el administrador accede a `/meson-servitecnology-st/recuperar?token=...`, **THE SYSTEM SHALL**:
  1. Calcular `SHA-256(token)` y verificar que coincida con un registro vigente en `admin_recovery_tokens` (`expires_at > NOW()` y `used = false`).
  2. Ejecutar un consumo atómico en la base de datos (`UPDATE ... SET used = true WHERE id = ... AND used = false RETURNING id`).
  3. Levantar el bloqueo de la cuenta administrativa (`locked_until = NULL`, `failed_attempts = 0`).
  4. Registrar el evento de auditoría `LOCKOUT_RECOVERY_SUCCESSFUL`.
  5. Redirigir al formulario de inicio de sesión (`/meson-servitecnology-st/login`) con un mensaje informativo: *"El bloqueo de seguridad ha sido levantado exitosamente. Por favor, inicia sesión con tus credenciales y código OTP."*
* **THE SYSTEM SHALL NEVER** emitir una cookie de sesión, ni crear una sesión administrativa, ni permitir el acceso directo al mesón a través del enlace de recuperación. El usuario debe autenticarse formalmente tras la recuperación.
* **IF** el enlace de recuperación ya fue usado, está vencido (> 15 minutos) o el token es inválido, **THEN THE SYSTEM SHALL** rechazar la solicitud, registrar el intento en auditoría y mantener el bloqueo activo.

### 3.4 Notificación de Alerta por Correo Electrónico
* **WHEN** se activa un bloqueo de 24 horas, **THE SYSTEM SHALL** enviar de inmediato la alerta por correo a `jesusleon@servitecnology.com` utilizando el transporte SMTP configurado en `src/lib/mailer.ts`.
* **THE SYSTEM SHALL** incluir en la alerta:
  - Asunto: `Alerta de seguridad: bloqueo de acceso administrativo — SERVITECNOLOGY`.
  - Fecha y hora exacta del evento en hora local de Chile (`America/Santiago`).
  - Motivo explícito: *Se alcanzó el límite de tres intentos fallidos consecutivos*.
  - Identificador único de incidente (UUID).
  - Cuenta administrativa afectada (`jesusleon@servitecnology.com`).
  - Dirección IP de origen (obtenida de cabeceras confiables de Vercel `x-real-ip` / `x-vercel-forwarded-for`).
  - Fecha y hora exacta en que finalizará el bloqueo natural de 24 horas.
  - Botón y enlace seguro de recuperación de emergencia con advertencia de caducidad de 15 minutos.
* **THE SYSTEM SHALL NEVER** incluir en el correo contraseñas, códigos OTP, tokens de sesión, cookies ni claves de Supabase.
* **THE SYSTEM SHALL** garantizar la **idempotencia** de la notificación mediante control atómico en `admin_security_state`.
* **IF** el envío del correo a través de SMTP falla, **THE SYSTEM SHALL** mantener el bloqueo de 24 horas activo, registrar `alert_status = 'FAILED'` en auditoría y reintentar de forma controlada con un espaciamiento mínimo de 5 minutos en peticiones posteriores.

### 3.5 Desafío OTP de 6 Dígitos y Consumo Atómico
* **WHEN** las credenciales de la Etapa 1 son correctas y no hay bloqueo, **THE SYSTEM SHALL** generar un código numérico criptográfico de 6 dígitos (`crypto.randomInt(100000, 1000000).toString()`) preservando ceros iniciales.
* **THE SYSTEM SHALL** almacenar en `admin_otp_tokens` el hash SHA-256 del código (nunca texto plano), el `challenge_token` criptográfico, expiración de 10 minutos y límite de 3 verificaciones por desafío.
* **THE SYSTEM SHALL** despachar el código vía correo a `jesusleon@servitecnology.com` mediante plantilla corporativa SERVITECNOLOGY.
* **WHEN** el usuario envía el código OTP en la Etapa 2, **THE SYSTEM SHALL** verificar que el desafío exista, no haya expirado (`expires_at > NOW()`), no haya sido consumido (`used = false`) y no supere los intentos del desafío (`attempts < 3`).
* **IF** el código OTP es incorrecto o vencido, **THEN THE SYSTEM SHALL** incrementar atómicamente tanto los intentos del desafío como los fallos generales de la cuenta (`failed_attempts`).
* **WHEN** el código coincide, **THE SYSTEM SHALL** consumir atómicamente el OTP (`UPDATE ... SET used = true WHERE id = ... AND used = false RETURNING id`), impidiendo que solicitudes concurrentes generen sesiones duplicadas.

### 3.6 Control de Reenvío (Cooldown) y Rate Limiting por IP
* **WHERE** un usuario solicita el reenvío de un OTP, **THE SYSTEM SHALL** verificar en el servidor que hayan transcurrido al menos 60 segundos desde la última emisión.
* **IF** se solicita antes de 60 segundos, **THEN THE SYSTEM SHALL** rechazar la solicitud informando el tiempo restante de espera.
* **THE SYSTEM SHALL** aplicar una limitación complementaria por IP (máximo 15 intentos fallidos en 1 hora por IP) para mitigar escaneos distribuidos, **sin bloquear la cuenta administrativa legítima** si ésta accede desde otra red.

### 3.7 Sesiones Administrativas Seguras y Eliminación de Rutas Alternativas
* **THE SYSTEM SHALL NEVER** almacenar `ADMIN_SECRET` como valor de la cookie de sesión.
* **WHEN** la autenticación OTP concluye exitosamente, **THE SYSTEM SHALL** generar un identificador de sesión criptográficamente aleatorio e impredecible (`session_token` de 32 bytes hex).
* **THE SYSTEM SHALL** almacenar en `admin_sessions` **ÚNICAMENTE el hash SHA-256 del token** (`session_token_hash`), junto con fecha de expiración de 24 horas, IP, User Agent y estado `revoked = false`.
* **THE SYSTEM SHALL** emitir la cookie `admin_session` con el `session_token` en texto plano (`HttpOnly = true`, `Secure = true` en producción, `SameSite = Lax`, `Path = /`, `Max-Age = 86400`).
* **WHEN** se accede a cualquier vista bajo `/meson-servitecnology-st/*` o cualquier endpoint bajo `/api/admin/*`, **THE SYSTEM SHALL** calcular `SHA-256(cookieToken)` y verificar que coincida con una sesión vigente en `admin_sessions` (`expires_at > NOW()` y `revoked = false`).
* **THE SYSTEM SHALL ELIMINAR CUALQUIER RUTA ALTERNATIVA:** Ningún endpoint aceptará `Bearer <ADMIN_SECRET>` ni contraseñas estáticas. Todo acceso administrativo requerirá una sesión activa en `admin_sessions`.
* **WHEN** el administrador pulsa "Salir" (`/meson-servitecnology-st/logout`), **THE SYSTEM SHALL** marcar la sesión como revocada (`revoked = true`) en la base de datos del servidor y eliminar la cookie del navegador.

### 3.8 Registro Inmutable de Auditoría (Append-Only)
* **THE SYSTEM SHALL** registrar en `admin_security_audit_logs` los siguientes eventos sin incluir secretos ni datos sensibles:
  1. `LOGIN_CREDENTIALS_FAILED` (Contraseña errónea o correo no autorizado).
  2. `OTP_VERIFICATION_FAILED` (Código erróneo o expirado).
  3. `LOCKOUT_TRIGGERED_24H` (Activación del bloqueo de 24 horas tras 3 fallos).
  4. `LOCKOUT_NOTIFICATION_SENT` / `LOCKOUT_NOTIFICATION_FAILED` (Resultado del despacho de alerta).
  5. `LOCKOUT_RECOVERY_ATTEMPTED` (Acceso al enlace de recuperación).
  6. `LOCKOUT_RECOVERY_SUCCESSFUL` (Desbloqueo exitoso de la cuenta vía token de 15 min).
  7. `BLOCKED_ACCESS_ATTEMPT` (Intento de acceso mientras un bloqueo está vigente).
  8. `AUTH_SUCCESS` (Ingreso exitoso al mesón tras validar OTP).
  9. `SESSION_REVOKED` (Cierre voluntario de sesión).
* **THE SYSTEM SHALL** garantizar mediante trigger de PostgreSQL que `admin_security_audit_logs` sea **inmutable de solo inserción (Append-Only)**, bloqueando cualquier operación de `UPDATE` o `DELETE`.

---

## 4. Contratos de Datos y Esquema Relacional en Supabase

### 4.1 Tabla `admin_security_state` (Control de Fallos y Bloqueos de 24h)
```sql
CREATE TABLE IF NOT EXISTS public.admin_security_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_identifier TEXT NOT NULL UNIQUE, -- 'jesusleon@servitecnology.com'
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ NULL,
    last_failed_at TIMESTAMPTZ NULL,
    lockout_incident_id UUID NULL,
    alert_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (alert_status IN ('PENDING', 'SENT', 'FAILED')),
    alert_sent_at TIMESTAMPTZ NULL,
    alert_error TEXT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_security_target ON public.admin_security_state(target_identifier);
```

### 4.2 Tabla `admin_recovery_tokens` (Tokens de Desbloqueo de Emergencia)
```sql
CREATE TABLE IF NOT EXISTS public.admin_recovery_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    recovery_token_hash TEXT NOT NULL UNIQUE, -- SHA-256 del recovery_token
    incident_id UUID NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL, -- NOW() + 15 minutes
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_recovery_hash ON public.admin_recovery_tokens(recovery_token_hash);
```

### 4.3 Tabla `admin_otp_tokens` (Desafíos Temporales de 6 Dígitos)
```sql
CREATE TABLE IF NOT EXISTS public.admin_otp_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    challenge_token TEXT NOT NULL UNIQUE,
    attempts INT NOT NULL DEFAULT 0,
    used BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL, -- NOW() + 10 minutes
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_otp_challenge ON public.admin_otp_tokens(challenge_token);
```

### 4.4 Tabla `admin_sessions` (Sesiones Revocables con Hash Exclusivo)
```sql
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token_hash TEXT NOT NULL UNIQUE, -- SHA-256 del session_token
    email TEXT NOT NULL,
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    expires_at TIMESTAMPTZ NOT NULL, -- NOW() + 24 hours
    revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_hash ON public.admin_sessions(session_token_hash);
```

### 4.5 Tabla `admin_security_audit_logs` (Pistas Inmutables Append-Only)
```sql
CREATE TABLE IF NOT EXISTS public.admin_security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    email TEXT NULL,
    ip_address TEXT NULL,
    incident_id UUID NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_security_audit_logs(created_at DESC);

-- Trigger de inmutabilidad Append-Only
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'admin_security_audit_logs es inmutable: no se permiten operaciones de UPDATE o DELETE';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_audit_logs
BEFORE UPDATE OR DELETE ON public.admin_security_audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
```

---

## 5. Checklist de Definition of Done (DoD)

- [ ] Script de migración `supabase/migrations/20261012_admin_otp_security.sql` preparado con las 5 tablas, restricciones, índices, trigger Append-Only y RLS estricto (`service_role`).
- [ ] Módulo `src/lib/admin-security.ts` implementado con:
  - `checkLockout(email, ip)`
  - `recordAuthFailure(email, ip)` (atómico)
  - `resetAuthFailures(email)`
  - `createRecoveryChallenge(email, incidentId)` (genera token de 32 bytes y persiste hash válido por 15 min)
  - `consumeRecoveryChallenge(rawToken)` (atómico, levanta bloqueo, resetea fallos y no emite sesión)
  - `createAdminSession(email, ip, userAgent)` (genera 32 bytes y almacena solo hash)
  - `validateAdminSession(rawToken)` (compara SHA-256(rawToken) contra `session_token_hash`)
  - `revokeAdminSession(rawToken)`
  - `logSecurityAudit(event, email, ip, metadata)`
- [ ] Módulo `src/lib/otp.ts` implementado con hash SHA-256, expiración de 10 min, límite de 3 intentos y cooldown de 60s.
- [ ] Funciones de correo en `src/lib/mailer.ts`:
  - `sendAdminOtpEmail({ email, code, expiresMinutes })` a `jesusleon@servitecnology.com`.
  - `sendAdminLockoutAlertEmail({ incidentId, email, ip, lockedUntil, attempts, recoveryUrl })` a `jesusleon@servitecnology.com` con enlace de recuperación de 15 min y recuperación persistente ante fallos SMTP.
- [ ] Página de recuperación `src/pages/meson-servitecnology-st/recuperar.astro` implementada (valida token, desbloquea, no crea sesión y redirige a login con confirmación).
- [ ] Pantalla `src/pages/meson-servitecnology-st/login.astro` implementada con flujo de 2 etapas, aviso de bloqueo de 24h genérico y temporizador de 60s.
- [ ] Cierre de sesión en `logout.astro` actualizando `revoked = true` en base de datos.
- [ ] Guardias de sesión en `AdminLayout.astro` y endpoints `/api/admin/*` actualizados para validar sesiones revocables por hash en `admin_sessions`.
- [ ] Eliminación total de rutas alternativas basadas en `ADMIN_SECRET` en endpoints administrativos.
- [ ] Suite de pruebas en `tests/admin/admin-security-otp.test.ts` cubriendo los 14 casos obligatorios pasando al 100%.
- [ ] `npm run build` ejecutado exitosamente con 0 errores.
- [ ] Cero secretos o contraseñas en código, logs o correos.
- [ ] Cero modificaciones en portada (`/`), catálogo de repuestos, checkout o flujos comerciales.
