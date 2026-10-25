# Seguridad de la Web — Mesón Administrativo SERVITECNOLOGY

**Estado del Proyecto:** Guardado para ejecución posterior (Pausado por el usuario)  
**Identificador:** `seguridad-de-la-web`  
**Ruta en SDD:** [`.agents/specs/admin-otp-auth.md`](file:///c:/servitecnology/landingpage/.agents/specs/admin-otp-auth.md) y [`.agents/plans/admin-otp-auth.md`](file:///c:/servitecnology/landingpage/.agents/plans/admin-otp-auth.md)  
**Fecha de registro:** 11 de Octubre de 2026  

---

## 1. Resumen Ejecutivo y Decisiones Aprobadas

Este documento contiene la planificación técnica completa y las decisiones de seguridad aprobadas para proteger el acceso al mesón administrativo (`/meson-servitecnology-st`).

### Decisiones Formalizadas:

1. **Aprobación de la Contrapropuesta B con Controles Adicionales:**
   * **Bloqueo estricto de 24 horas:** Se activa al tercer (3er) intento fallido consecutivo acumulado (fase de credenciales o fase de OTP comparten el mismo contador).
   * **Procedimiento de recuperación de emergencia:** Enlace aleatorio seguro enviado exclusivamente a `jesusleon@servitecnology.com`.
   * **Propiedades del enlace:** Criptográficamente aleatorio (32 bytes hex), de un solo uso, con caducidad corta (15 minutos), almacenado únicamente como hash SHA-256 en la base de datos y consumido de forma atómica.
   * **Regla crítica de seguridad:** El enlace de recuperación levanta el bloqueo y resetea los fallos, pero **NUNCA crea una sesión ni permite el acceso directo al mesón**. Tras la recuperación, el administrador es redirigido a `/login` para realizar una autenticación completa desde cero (Contraseña + OTP).
   * **Límites por IP y retrasos progresivos:** 1s en fallo 1, 2s en fallo 2, y rate limiting por IP para mitigar ataques distribuidos sin afectar al administrador legítimo.

2. **Único Correo Administrativo Autorizado:**
   * `jesusleon@servitecnology.com` es la única cuenta reconocida para la emisión de códigos OTP, alertas de seguridad por bloqueo y enlaces de recuperación. No se incorporan direcciones adicionales.

3. **Sesiones de Servidor con Hash Exclusivo:**
   * Se elimina totalmente `ADMIN_SECRET` de las cookies y del navegador.
   * La cookie `admin_session` contendrá un token aleatorio de 32 bytes hex, mientras que Supabase almacenará únicamente su hash SHA-256 en `admin_sessions`.
   * Se eliminan todos los bypasses y rutas alternativas (`Bearer <ADMIN_SECRET>`) en los 7 endpoints administrativos (`/api/admin/*`).

4. **Auditoría Inmutable (Append-Only):**
   * Tabla `admin_security_audit_logs` protegida mediante trigger de PostgreSQL que bloquea cualquier operación de `UPDATE` o `DELETE`.

---

## 2. División de Responsabilidades (Quién hace qué)

### A. Lo que el asistente AI realiza 100% de forma automática:
1. **Generación del Script SQL:** Archivo [`supabase/migrations/20261012_admin_otp_security.sql`](file:///c:/servitecnology/landingpage/supabase/migrations/20261012_admin_otp_security.sql) con las 5 tablas, índices, RLS y trigger.
2. **Lógica de Seguridad en TypeScript:**
   * [`src/lib/admin-security.ts`](file:///c:/servitecnology/landingpage/src/lib/admin-security.ts): Control de bloqueo, recuperación de emergencia, sesiones con hash SHA-256 y auditoría.
   * [`src/lib/otp.ts`](file:///c:/servitecnology/landingpage/src/lib/otp.ts): Generador criptográfico de 6 dígitos con hash SHA-256, expiración de 10 min y cooldown de 60s.
3. **Plantillas de Correo Corporativo en [`src/lib/mailer.ts`](file:///c:/servitecnology/landingpage/src/lib/mailer.ts):**
   * Despacho del código OTP de 6 dígitos.
   * Despacho de alerta por bloqueo de 24h con fecha/hora local de Chile (CLT), UUID del incidente, IP de origen y botón con enlace seguro de 15 minutos.
4. **Interfaces de Usuario del Mesón:**
   * [`src/pages/meson-servitecnology-st/recuperar.astro`](file:///c:/servitecnology/landingpage/src/pages/meson-servitecnology-st/recuperar.astro): Valida el token, desbloquea la cuenta y redirige a `/login?recovered=true`.
   * [`src/pages/meson-servitecnology-st/login.astro`](file:///c:/servitecnology/landingpage/src/pages/meson-servitecnology-st/login.astro): Flujo en 2 etapas (Contraseña $\rightarrow$ OTP), pantalla de bloqueo 24h, temporizador de reenvío.
   * [`src/pages/meson-servitecnology-st/logout.astro`](file:///c:/servitecnology/landingpage/src/pages/meson-servitecnology-st/logout.astro): Revocación real de sesión en la base de datos.
5. **Blindaje de APIs y Layout:**
   * [`src/layouts/AdminLayout.astro`](file:///c:/servitecnology/landingpage/src/layouts/AdminLayout.astro) y los 7 endpoints bajo `/api/admin/*` protegidos por sesión de base de datos.
6. **Pruebas y Validación:**
   * Suite de pruebas en [`tests/admin/admin-security-otp.test.ts`](file:///c:/servitecnology/landingpage/tests/admin/admin-security-otp.test.ts) (14 casos con Vitest).
   * Verificación local con `npx vitest run` y `npm run build` (0 errores).

### B. Lo que el usuario debe hacer manualmente:
1. **Ejecutar el Script SQL en Supabase:**
   * Copiar el script SQL proporcionado abajo, pegarlo en el **SQL Editor** de Supabase y hacer clic en **Run**.
2. **Revisar Variables de Entorno en Vercel Dashboard:**
   * Asegurarse de que `SUPABASE_SERVICE_ROLE_KEY` y las credenciales SMTP estén configuradas en Vercel.
3. **Revisar el Correo Real:**
   * Al hacer pruebas reales, verificar la llegada de los correos en `jesusleon@servitecnology.com`.
4. **Aprobar el Despliegue a Producción:**
   * Autorizar el `git commit` y `git push` una vez que las pruebas en local estén 100% aprobadas.

---

## 3. Script SQL Preparado para Supabase

Cuando se decida ejecutar la implementación, este es el script DDL que se debe aplicar en Supabase:

```sql
-- 1. Tabla de estado de seguridad y bloqueo de 24h
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

-- 2. Tabla de tokens de recuperación de emergencia (15 minutos)
CREATE TABLE IF NOT EXISTS public.admin_recovery_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    recovery_token_hash TEXT NOT NULL UNIQUE, -- SHA-256
    incident_id UUID NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL, -- NOW() + 15 minutes
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_recovery_hash ON public.admin_recovery_tokens(recovery_token_hash);

-- 3. Tabla de desafíos OTP de 6 dígitos (10 minutos)
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

-- 4. Tabla de sesiones activas con hash exclusivo (24 horas)
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token_hash TEXT NOT NULL UNIQUE, -- SHA-256
    email TEXT NOT NULL,
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    expires_at TIMESTAMPTZ NOT NULL, -- NOW() + 24 hours
    revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_hash ON public.admin_sessions(session_token_hash);

-- 5. Tabla de auditoría inmutable (Append-Only)
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

-- Trigger de protección inmutable
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'admin_security_audit_logs es inmutable: no se permiten operaciones de UPDATE o DELETE';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_audit_logs ON public.admin_security_audit_logs;
CREATE TRIGGER trg_protect_audit_logs
BEFORE UPDATE OR DELETE ON public.admin_security_audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- Políticas RLS: Acceso exclusivo para service_role
ALTER TABLE public.admin_security_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_recovery_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_otp_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all_security_state ON public.admin_security_state FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_recovery_tokens ON public.admin_recovery_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_otp_tokens ON public.admin_otp_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_sessions ON public.admin_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_audit_logs ON public.admin_security_audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
```

---

## 4. Cómo Retomar Este Plan

Cuando estés listo para ejecutar esta implementación, solo debes indicar en el chat:

> **"Retomar seguridad de la web"** o **"Ejecutar seguridad de la web"**

Al recibir esa instrucción, el asistente sabrá exactamente que debe proceder con:
1. La creación de los archivos de código (`admin-security.ts`, `otp.ts`, `recuperar.astro`, etc.).
2. La actualización del mailer, login, layout y APIs.
3. La ejecución de las pruebas automáticas en local para validar todo antes de desplegar.

---

## 5. Clave Temporal de Alta Seguridad

Para sustituir inmediatamente la clave histórica numérica (`20181860`) y blindar el mesón administrativo contra ataques de diccionario o fuerza bruta mientras se activa el OTP/2FA, se establece la siguiente clave de alta seguridad y máxima entropía (27 caracteres con mayúsculas, minúsculas, números y símbolos):

```text
St#92mK!84vQ$7wL@51zR&yP*26
```

### Métricas de seguridad de la clave:
* **Longitud:** 27 caracteres.
* **Entropía:** Superior a 160 bits (inmune a ataques de diccionario y fuerza bruta).
* **Composición:** Mezcla balanceada de caracteres alfanuméricos y caracteres especiales (`#`, `!`, `$`, `@`, `&`, `*`).

### Pasos para aplicarla:
1. **En entorno local (`.env`):**
   ```env
   ADMIN_SECRET=St#92mK!84vQ$7wL@51zR&yP*26
   ```
2. **En producción (Vercel):**
   * Ir a **Vercel Dashboard** $\rightarrow$ Proyecto `landingpage` $\rightarrow$ **Settings** $\rightarrow$ **Environment Variables**.
   * Actualizar el valor de `ADMIN_SECRET` con `St#92mK!84vQ$7wL@51zR&yP*26` para todos los entornos (Production, Preview, Development).
   * Ejecutar un *Redeploy* de la última versión para aplicar el cambio en vivo.

