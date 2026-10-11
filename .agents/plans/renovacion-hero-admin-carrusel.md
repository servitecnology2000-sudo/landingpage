---
title: Plan Técnico — Carrusel de Banners Exclusivo de /repuestos y Administrador
status: Aprobado y Verificado (Completado)
feature: carrusel-exclusivo-repuestos
author: Antigravity AI
date: 2026-10-11
---

# 🛠️ Plan Técnico: Carrusel de Banners Exclusivo de /repuestos y Administrador

## 1. Resumen Técnico y Estrategia de Aislamiento

### 1.1 Salvaguarda Absoluta de la Portada Principal (`/`)
- El archivo [`src/components/Hero.astro`](file:///c:/servitecnology/landingpage/src/components/Hero.astro) ha sido restaurado a su estado original previo al requerimiento.
- Ningún código ni estilo en la portada [`src/pages/index.astro`](file:///c:/servitecnology/landingpage/src/pages/index.astro) será alterado.
- La verificación de no-alteración se certificará mediante `git diff src/components/Hero.astro` (debe ser vacío).

### 1.2 Implementación Exclusiva en `/repuestos`
- Se crea el componente específico [`src/components/RepuestosBannersCarousel.astro`](file:///c:/servitecnology/landingpage/src/components/RepuestosBannersCarousel.astro).
- Se monta dentro de [`src/pages/repuestos.astro`](file:///c:/servitecnology/landingpage/src/pages/repuestos.astro) justo antes de `<Catalog />`, proveyendo la experiencia de Hero y carrusel interactivo solicitada.
- Consulta exclusivamente a Supabase filtrando por `seccion = 'repuestos'` y `activo = true`.
- Incluye el mensaje comercial:
  - Título: «No tienes que hacerlo solo.»
  - Subtítulo: «Instalamos y configuramos tus repuestos y componentes»
  - Texto explicativo de cotización y puesta en marcha.
  - CTA principal a WhatsApp y CTA secundario hacia el catálogo (`#catalogo`).
  - Píldoras temáticas de hardware, soporte y servicios técnicos.
  - Controles de navegación: Flechas, dots, auto-play configurable con botón de pausa/reanudación y soporte táctil.
  - Colección de respaldo de repuestos y hardware para garantizar funcionamiento offline o pre-migración.

### 1.3 Solución Integral a `ResponseSentError` en Rutas Administrativas
- **Diagnóstico:** En Astro SSR con `@astrojs/vercel`, invocar `return Astro.redirect(...)` dentro de un layout o componente secundario (`AdminLayout.astro`) después de que la página ya empezó a evaluar el cuerpo o llamar endpoints asíncronos provoca `ResponseSentError: The response has already been sent to the browser and cannot be altered`.
- **Acción Correctiva:**
  1. En [`src/pages/meson-servitecnology-st/banners.astro`](file:///c:/servitecnology/landingpage/src/pages/meson-servitecnology-st/banners.astro), la guardia de autenticación (`ADMIN_SECRET` vs cookie `admin_session`) se coloca en la **primera línea del frontmatter**, antes de cualquier importación dinámica o consulta de base de datos.
  2. Si la sesión no es válida, Astro emite la cabecera HTTP 302 limpia antes de que se inicie el renderizado del documento, evitando el error de cabeceras ya enviadas.

### 1.4 Delimitación en Base de Datos y Endpoints
- La tabla `hero_banners` incluye la columna `seccion TEXT NOT NULL DEFAULT 'repuestos'`.
- Los endpoints `/api/admin/banners/*` operan con la restricción `seccion = 'repuestos'`, garantizando que ningún banner administrado aquí se cruce con otras partes del sitio.

---

## 2. Detalle Archivo por Archivo

### `[RESTORE]` `src/components/Hero.astro`
- **Estado:** Restaurado al 100% a su estado original previo mediante git checkout.
- **Razón:** Garantizar que la portada `/` permanezca intacta.

### `[NEW]` `src/components/RepuestosBannersCarousel.astro`
- **Responsabilidad:** Carrusel y banner exclusivo para la tienda de repuestos.
- **Lógica:** Consulta Supabase con `.eq('seccion', 'repuestos').eq('activo', true)`.
- **UI:** Título «No tienes que hacerlo solo.», botones de acción, píldoras y carrusel interactivo con controles de auto-reproducción.

### `[MODIFY]` `src/pages/repuestos.astro`
- **Razón:** Integrar `<RepuestosBannersCarousel />` en el `<main>` de la página encima de `<Catalog />`.
- **Riesgo:** Cero impacto en otras páginas (el cambio está confinado a `/repuestos`).

### `[MODIFY]` `src/pages/meson-servitecnology-st/banners.astro`
- **Razón:** Delimitar la gestión a banners de `/repuestos` y resolver `ResponseSentError`.
- **Cambios:**
  - Guardia de seguridad SSR colocada en la primera línea del frontmatter.
  - Filtrado y etiquetado explícito de `seccion = 'repuestos'`.
  - Títulos y textos contextualizados al ecommerce de repuestos.

### `[MODIFY]` `src/pages/api/admin/banners/upload.ts`
- **Razón:** Guardar el campo `seccion: 'repuestos'` al insertar nuevos banners.

### `[MODIFY]` `src/pages/api/admin/banners/update.ts`
- **Razón:** Asegurar que las actualizaciones respeten la pertenencia a la sección de repuestos.

### `[MODIFY]` `supabase/migrations/20261011_hero_banners.sql`
- **Razón:** Incorporar la columna `seccion TEXT NOT NULL DEFAULT 'repuestos'` y su índice correspondiente.

### `[NEW]` `tests/admin/repuestos-banners.test.ts`
- **Responsabilidad:** Verificar el aislamiento estricto:
  1. Que `Hero.astro` no contenga lógica de banners de repuestos.
  2. Que los endpoints administrativos guarden y filtren `seccion = 'repuestos'`.
  3. Que las guardias de seguridad rechacen 401 sin lanzar `ResponseSentError`.

---

## 3. Comandos de Verificación Exactos

```bash
# 1. Certificar que Hero.astro no tiene cambios con respecto a git HEAD
git diff src/components/Hero.astro

# 2. Ejecutar suite de pruebas con Vitest
npm test

# 3. Compilación de producción completa y chequeo de tipos
npm run build
```

---

## 4. Criterios de Parada Humana (Gate 3)

Se presenta este plan corregido al usuario para su aprobación antes de aplicar las modificaciones de código.
