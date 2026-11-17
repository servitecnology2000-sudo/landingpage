# Spec: Auditoría Lighthouse Mobile, SEO Técnico, AEO/GEO, WCAG 2.1 AA y Core Web Vitals

- **Estado:** Completado (Gate 4 Certificado)
- **Fecha:** 2026-11-16
- **Dominio Auditado:** `https://servitecnology.com/`

---

## 1. Línea Base Medida (Lighthouse Mobile Local — 2026-11-16)

Ejecución directa de Lighthouse Mobile contra `https://servitecnology.com/`:
- **Performance:** `51 / 100`
  - FCP: `2.0 s` | **LCP: `11.4 s`** | **TBT: `1,050 ms`** | CLS: `0` | Speed Index: `2.6 s`
- **Accessibility:** `90 / 100`
- **Best Practices:** `100 / 100`
- **SEO:** `100 / 100`

### Brechas Reales Detectadas en Auditoría de Código y Lighthouse

1. **Rendimiento y Core Web Vitals (51 -> 95-100):**
   - **LCP (`11.4 s`):** La imagen Hero `/imagenes/principal.jpg` pesa `1.1 MB`, está en formato JPG sin comprimir, carece de `fetchpriority="high"`, `width`/`height` y `<link rel="preload">`. Las imágenes de servicios (`soportepc.jpg`, `gaming.jpg`, `cctv.jpg`, `redes.jpg`, `impresora.jpg`) pesan entre `609 KB` y `1.7 MB`.
   - **TBT (`1,050 ms`) y JS no utilizado (`44 KiB`):** `src/layouts/Layout.astro` importa `../lib/supabase` de forma síncrona/eager en cada página para `trackEvent`, cargando el SDK completo en el hilo principal durante la carga inicial.
   - **Coste de Pintado/Composición (`mainthread-work-breakdown` 3.1 s):** Múltiples capas decorativas usan `blur-[150px]` / `blur-[160px]` / `blur-[180px]` (`filter: blur(...)`) en `Hero.astro`, `FeaturedParts.astro`, `Services.astro` y `Footer.astro`, además de `backdrop-blur-md` en elementos above-the-fold.
   - **CSS Render-Blocking (`~760 ms`):** `<link href="https://fonts.googleapis.com/css2?..." rel="stylesheet">` bloquea el renderizado inicial en `Layout.astro`.
   - **Imágenes sin dimensiones (`unsized-images`):** `<img src="/imagenes/logost.png">` en `Header.astro`, `Hero.astro`, `FeaturedParts.astro` y `Services.astro` carecen de atributos `width` y `height` explícitos.
2. **Accesibilidad WCAG 2.1 AA (90 -> 100):**
   - **Contraste (`color-contrast`):** Enlaces y textos secundarios en `Footer.astro` (`/privacidad`, `/garantias`, copyright, cobertura) usan `text-slate-500` sobre `bg-zinc-950` (contraste < 4.5:1). También `SecondHand.astro` y `Catalog.astro` usan `text-slate-500` sobre fondos oscuros.
   - **Tamaño de área táctil (`target-size`):** Los botones `.coverflow-dot` en `Services.astro` miden `h-2.5` (10px de altura) con separación `gap-2` (8px), incumpliendo el mínimo táctil accesible.
   - **Jerarquía de encabezados y enlaces:** `Footer.astro` usa `<h4>` saltando `<h3>`; `Footer.astro` contiene dos enlaces sociales con `href="#"` (Instagram y Facebook sin URL real).
   - **Foco visible:** Garantizar `:focus-visible` consistente en `global.css` y evitar `focus:outline-none` sin anillo de foco equivalente.
3. **SEO, Metadatos y Schema.org:**
   - En `src/pages/index.astro`, `<title>` tiene 76 caracteres (recomendado ~50-60) y `<meta name="description">` tiene 180 caracteres (recomendado ~120-160).
   - En `src/components/WhatsAppButton.astro`, el teléfono por defecto es el placeholder `"56912345678"`.
   - En `src/layouts/Layout.astro`, reforzar el JSON-LD agregando `"creator"` / `"subOrganization"` coherente con Studio Coders (`@id: "https://studiocoders.dev/#organization"`, `legalName: "JESUS LEON SOLUCIONES INFORMÁTICAS E.I.R.L."`, `taxID: "77.709.717-2"`).
4. **Rastreo y Navegación Agéntica (`llms.txt`, `sitemap.xml`, `robots.txt`):**
   - `public/llms.txt`, `public/robots.txt` y `src/pages/sitemap.xml.ts` ya cumplen la estructura base, y se blindarán con tests automatizados dedicados.

---

## 2. Solución Funcional

1. **Optimización de Activos y LCP:** Convertir imágenes locales de `public/imagenes/` a formato **WebP** optimizado manteniendo respaldo, agregar `width`/`height`, `fetchpriority="high"` + `decoding="async"` en la imagen LCP del Hero y `<link rel="preload" as="image">`, y `loading="lazy"` en imágenes below-the-fold.
2. **Eliminación de Bloqueos en Carga Inicial:** Cargar Google Fonts de forma no bloqueante en `Layout.astro`, diferir el tracking de `metricas_eventos` usando `requestIdleCallback` + importación dinámica tras `load`, y reemplazar los `blur-[150px+]` por `radial-gradient` puros en CSS (0ms de coste de blur).
3. **Accesibilidad 100/100:** Subir contraste de textos secundarios a `text-slate-400` / `text-slate-300` (>= 4.5:1), envolver/redimensionar `.coverflow-dot` a `>= 44x44px` de área táctil, corregir jerarquía de encabezados en `Footer.astro` (`<h3>`), remover enlaces muertos `href="#"` y asegurar `:focus-visible` global.
4. **SEO y Tests Automatizados:** Ajustar `title` (~59 chars) y `description` (~152 chars) de `index.astro`, reemplazar el teléfono placeholder en `WhatsAppButton.astro` por `56948672300`, añadir `"creator"` en JSON-LD de `Layout.astro`, y ampliar `tests/seo-audit.test.ts` para validar `llms.txt`, `robots.txt`, `sitemap.xml`, JSON-LD y atributos a11y.

---

## 3. Requisitos Funcionales (EARS)

- **REQ-01 (Navegación Agéntica y Rastreo):** WHEN se consulten `/llms.txt`, `/robots.txt` y `/sitemap.xml`, THE SYSTEM SHALL entregar respuestas válidas conforme a `llmstxt.org`, `robots.txt` (con `Sitemap: https://servitecnology.com/sitemap.xml`) y `sitemaps.org 0.9` sin rutas privadas ni anclas `#`.
- **REQ-02 (SEO y Metadatos):** WHEN se renderice `/` (`index.astro`), THE SYSTEM SHALL emitir `<title>` de ~50-60 caracteres, `<meta name="description">` de ~120-160 caracteres, canonical, Open Graph, Twitter Card y un único `<h1>` visible.
- **REQ-03 (Schema.org JSON-LD):** WHEN se renderice cualquier página con `Layout.astro`, THE SYSTEM SHALL incluir JSON-LD válido sin placeholders y con `creator` y `subOrganization` apuntando a `https://studiocoders.dev/#organization` (`JESUS LEON SOLUCIONES INFORMÁTICAS E.I.R.L.`, `taxID: "77.709.717-2"`).
- **REQ-04 (Accesibilidad WCAG 2.1 AA):** WHEN se audite la página en Lighthouse Mobile, THE SYSTEM SHALL alcanzar `100/100` en Accesibilidad garantizando contraste `>= 4.5:1`, objetivos táctiles `>= 44x44px` en controles móviles (incluyendo `.coverflow-dot`), jerarquía de encabezados secuencial y `:focus-visible` intacto.
- **REQ-05 (Core Web Vitals y Rendimiento):** WHEN se cargue `/` en móvil, THE SYSTEM SHALL servir la imagen LCP en WebP con `fetchpriority="high"` y dimensiones explícitas, diferir scripts de analítica fuera de la ruta crítica, evitar CSS render-blocking de fuentes y alcanzar `>= 95` en Performance en producción.

---

## 4. Definition of Done (DoD)

- [x] Imágenes críticas de `public/imagenes/` convertidas a WebP optimizado y referenciadas con `width` y `height`.
- [x] `Layout.astro` sin CSS bloqueante de Google Fonts, con preload LCP y tracking Supabase diferido tras `load`/`requestIdleCallback`.
- [x] Cero `blur-[150px]`+ costosos en `Hero.astro`, `FeaturedParts.astro`, `Services.astro` y `Footer.astro` (reemplazados por `radial-gradient`).
- [x] Contraste `>= 4.5:1` en `Footer.astro` y componentes de catálogo; `.coverflow-dot` con área táctil `>= 44x44px`; jerarquía `h1 -> h2 -> h3` sin saltos; sin enlaces `href="#"`.
- [x] `title` y `description` optimizados en `index.astro`; teléfono real `56948672300` en `WhatsAppButton.astro`; JSON-LD con `creator` y `subOrganization`.
- [x] `tests/seo-audit.test.ts` ampliado con checks de JSON-LD, `llms.txt`, `robots.txt`, `sitemap.xml` y a11y.
- [x] `npm test` y `npm run build` finalizan con `0` errores.
