# Plan Técnico: Auditoría Lighthouse Mobile, SEO Técnico, AEO/GEO, WCAG 2.1 AA y Core Web Vitals

- **Spec Asociada:** [auditoria-lighthouse-seo-cwv-a11y.md](file:///home/angel/Developer/landingpage/.agents/specs/auditoria-lighthouse-seo-cwv-a11y.md)
- **Estado:** Propuesto (Gate 2 — Pendiente de Aprobación en Gate 3)

---

## 1. Resumen Técnico

El plan ataca directamente los cuellos de botella medidos por Lighthouse Mobile (`Performance: 51`, `Accessibility: 90`) y blinda los criterios de SEO/AEO/Schema:
1. **Conversión WebP y Dimensiones Explícitas:** Optimizar `principal.jpg` (1.1 MB) y las imágenes de servicios/logo a `.webp` livianos, añadiendo `width`/`height` y `fetchpriority="high"` en LCP.
2. **Desbloqueo del Hilo Principal:** Eliminar la importación síncrona de `@supabase/supabase-js` en `Layout.astro` (cargándolo dinámicamente en `requestIdleCallback` tras `load`), cargar Google Fonts de forma asíncrona (`media="print" onload="this.media='all'"`) y sustituir los halos `blur-[150px+]` por `radial-gradient`.
3. **Accesibilidad 100/100:** Ajustar contrastes en `Footer.astro`, `Catalog.astro` y `SecondHand.astro`, ampliar el hit-area de `.coverflow-dot` en `Services.astro` a `44x44px`, corregir `<h4>` a `<h3>` en `Footer.astro` y definir `:focus-visible` en `global.css`.

---

## 2. Detalle Archivo por Archivo

- `[NEW]` `public/imagenes/*.webp`: Versiones WebP optimizadas de `principal.jpg`, `soportepc.jpg`, `gaming.jpg`, `cctv.jpg`, `redes.jpg`, `impresora.jpg` y `logost.png` (generadas vía script/herramienta local sin alterar los originales).
- `[MODIFY]` [src/layouts/Layout.astro](file:///home/angel/Developer/landingpage/src/layouts/Layout.astro):
  - Preload de imagen LCP (`/imagenes/principal.webp`) con `fetchpriority="high"`.
  - Carga no bloqueante de Google Fonts (`media="print" onload="this.media='all'"` + `<noscript>`).
  - En JSON-LD, añadir `"creator"` apuntando a `https://studiocoders.dev/#organization` junto con `"subOrganization"`.
  - Diferir `trackEvent` con `window.addEventListener('load', ...)` + `requestIdleCallback` + `import('../lib/supabase')` dinámico.
- `[MODIFY]` [src/styles/global.css](file:///home/angel/Developer/landingpage/src/styles/global.css): Añadir regla base `:focus-visible` accesible (`outline: 2px solid #00CFFF; outline-offset: 2px;`) y asegurar `overflow-x: clip` en `html, body`.
- `[MODIFY]` [src/components/Header.astro](file:///home/angel/Developer/landingpage/src/components/Header.astro): Añadir `width="180" height="48"` al logo `logost.webp` y asegurar `whitespace-nowrap` en enlaces del navbar.
- `[MODIFY]` [src/components/Hero.astro](file:///home/angel/Developer/landingpage/src/components/Hero.astro): Usar `/imagenes/principal.webp` con `width="1920" height="1080" fetchpriority="high" decoding="async"`, reemplazar divs `blur-[150px]` por `radial-gradient` y quitar `backdrop-blur-md` del badge/botones si penaliza composición.
- `[MODIFY]` [src/components/FeaturedParts.astro](file:///home/angel/Developer/landingpage/src/components/FeaturedParts.astro): Añadir `width="400" height="300" loading="lazy" decoding="async"` en las tarjetas y reemplazar `blur-[150px]` por `radial-gradient`.
- `[MODIFY]` [src/components/Services.astro](file:///home/angel/Developer/landingpage/src/components/Services.astro): Usar `.webp` con `width="600" height="450" loading="lazy" decoding="async"`, reemplazar `blur-[160px/180px]` por `radial-gradient`, y dar a `.coverflow-dot` un área táctil de `min-w-[44px] min-h-[44px]` con el indicador visual centrado dentro.
- `[MODIFY]` [src/components/Footer.astro](file:///home/angel/Developer/landingpage/src/components/Footer.astro): Cambiar `text-slate-500` a `text-slate-400` para contraste >= 4.5:1, cambiar `<h4>` a `<h3>`, eliminar los dos enlaces muertos `href="#"` (Instagram/Facebook sin URL) y reemplazar `blur-[160px]` por `radial-gradient`.
- `[MODIFY]` [src/components/SecondHand.astro](file:///home/angel/Developer/landingpage/src/components/SecondHand.astro) y [src/components/Catalog.astro](file:///home/angel/Developer/landingpage/src/components/Catalog.astro): Subir `text-slate-500` a `text-slate-400` donde corresponda para asegurar contraste >= 4.5:1.
- `[MODIFY]` [src/components/WhatsAppButton.astro](file:///home/angel/Developer/landingpage/src/components/WhatsAppButton.astro): Reemplazar `phone = "56912345678"` por `"56948672300"`.
- `[MODIFY]` [src/pages/index.astro](file:///home/angel/Developer/landingpage/src/pages/index.astro): Ajustar `<title>` (~59 caracteres) y `description` (~152 caracteres).
- `[MODIFY]` [tests/seo-audit.test.ts](file:///home/angel/Developer/landingpage/tests/seo-audit.test.ts): Añadir pruebas automatizadas para `robots.txt`, `sitemap.xml`, `llms.txt`, JSON-LD (`creator`/`subOrganization`, sin placeholders) y atributos a11y (`width`/`height`, `target-size`, sin `href="#"`).

---

## 3. Verificación (Gate 4)

```bash
npm test
npm run build
```
Además, si se verifica contra build local (`astro preview`) con Lighthouse Mobile tras aplicar los cambios, se comprobarán las métricas finales de Performance, Accessibility, Best Practices y SEO.
