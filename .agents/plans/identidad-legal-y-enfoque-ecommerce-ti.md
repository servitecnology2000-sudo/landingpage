# Plan Técnico: Identidad Legal SII, Separación de Marcas y Enfoque Ecommerce + Servicios TI

- **Spec Asociada:** [identidad-legal-y-enfoque-ecommerce-ti.md](file:///home/angel/Developer/landingpage/.agents/specs/identidad-legal-y-enfoque-ecommerce-ti.md)
- **Estado:** Propuesto (Gate 2 — Pendiente de Aprobación en Gate 3)

---

## 1. Resumen Técnico y Arquitectura

El cambio abarca tres ejes coordinados sin modificar esquemas de base de datos ni lógica de pagos:
1. **Normalización de Identidad Legal (SII):** Sustitución controlada de `"SERVITECNOLOGY EIRL"` por `"SERVITECNOLOGY (marca comercial de JESUS LEON SOLUCIONES INFORMÁTICAS E.I.R.L. · RUT: 77.709.717-2)"` en páginas legales, plantillas HTML de `mailer.ts` y payloads de portabilidad de datos. La constante `BANK_DETAILS` en `src/pages/pedido/[id].astro` queda protegida hasta confirmación explícita en Gate 3.
2. **Reenfoque de Landing (Ecommerce + Servicios TI):** Limpieza de navegación (`Header.astro`), renovación de `Hero.astro` y `index.astro` (removiendo `SaaSProducts.astro` y metadatos de software a medida), actualización de `Services.astro` (removiendo la tarjeta de desarrollo de software) y eliminación de rutas de desarrollo (`/desarrollo`, `/diseno-web`) junto con su indexación en `sitemap.xml.ts`.
3. **SEO Estructurado y AI-SEO:** Enriquecimiento del JSON-LD en `Layout.astro` con `legalName`, `taxID` y `subOrganization` para Studio Coders, actualización de `Footer.astro` y reescritura de `public/llms.txt` bajo `llmstxt.org`.

---

## 2. Detalle Archivo por Archivo

### Eje 1: Identidad Legal SII y Correos
- `[MODIFY]` [src/pages/terminos.astro](file:///home/angel/Developer/landingpage/src/pages/terminos.astro): Actualizar las 3 ocurrencias de `SERVITECNOLOGY EIRL` (líneas ~31, ~79 y ~127) a `SERVITECNOLOGY (marca comercial de JESUS LEON SOLUCIONES INFORMÁTICAS E.I.R.L. · RUT: 77.709.717-2)`.
- `[MODIFY]` [src/pages/privacidad.astro](file:///home/angel/Developer/landingpage/src/pages/privacidad.astro): Actualizar las 4 ocurrencias de `SERVITECNOLOGY EIRL` (líneas ~31, ~82, ~186 y ~327) con la razón social SII oficial y marca comercial.
- `[MODIFY]` [src/lib/mailer.ts](file:///home/angel/Developer/landingpage/src/lib/mailer.ts): Actualizar las 6 ocurrencias de `SERVITECNOLOGY EIRL` (líneas ~194, ~195, ~213, ~391, ~528 y ~707) para que los comprobantes SII y pies de correo reflejen `SERVITECNOLOGY (marca comercial de JESUS LEON SOLUCIONES INFORMÁTICAS E.I.R.L. · RUT: 77.709.717-2)`.
- `[MODIFY]` [src/pages/mis-pedidos.astro](file:///home/angel/Developer/landingpage/src/pages/mis-pedidos.astro): Actualizar `responsable_legal` (línea ~626) y `plataforma` (línea ~625, removiendo `& SaaS`) en `exportCustomerData()`.
- `[MODIFY]` [src/pages/pedido/[id].astro](file:///home/angel/Developer/landingpage/src/pages/pedido/[id].astro): Actualizar `responsable_legal` (línea ~641) y `plataforma` (línea ~640) en `exportOrderPayload`. **Mantener** `BANK_DETAILS` (líneas 80-87) intacto salvo confirmación expresa del usuario en Gate 3.

### Eje 2: Footer, Schema.org JSON-LD y `llms.txt`
- `[MODIFY]` [src/components/Footer.astro](file:///home/angel/Developer/landingpage/src/components/Footer.astro): Reemplazar la línea 255-257 (`Diseñado y desarrollado Por SERVITECNOLOGY`) por el bloque con enlace a `https://studiocoders.dev` (`target="_blank" rel="noopener"`, anchor text `Studio Coders`) y mención legal a `JESUS LEON SOLUCIONES INFORMÁTICAS E.I.R.L. (RUT: 77.709.717-2)`.
- `[MODIFY]` [src/layouts/Layout.astro](file:///home/angel/Developer/landingpage/src/layouts/Layout.astro): Actualizar el bloque `<script type="application/ld+json" is:inline>` agregando `"name": "Servitecnology"`, `"legalName": "JESUS LEON SOLUCIONES INFORMÁTICAS E.I.R.L."`, `"taxID": "77.709.717-2"` y `"subOrganization"` con los datos de Studio Coders (`@id: "https://studiocoders.dev/#organization"`, `alternateName: "Studio Coders Dev"`, `url: "https://studiocoders.dev"`).
- `[MODIFY]` [public/llms.txt](file:///home/angel/Developer/landingpage/public/llms.txt): Reescribir siguiendo `llmstxt.org` (`# SERVITECNOLOGY`, un único `> ...` blockquote, y listas `- [Título](URL): descripción` para `/repuestos`, `/soporte`, `/gaming`, `/cctv`, `/redes`, `/impresoras`, `/nosotros` y enlace a Studio Coders `https://studiocoders.dev`).

### Eje 3: Eliminación de Contenido de Desarrollo de Software y Enfoque Ecommerce + Servicios TI
- `[MODIFY]` [src/components/Header.astro](file:///home/angel/Developer/landingpage/src/components/Header.astro): Eliminar el objeto de navegación `'Software SaaS'` (líneas 11-18) y eliminar `{ label: 'Desarrollo de Software', href: '/desarrollo' }` del submenú `'Servicios TI'` (línea 23).
- `[MODIFY]` [src/components/Hero.astro](file:///home/angel/Developer/landingpage/src/components/Hero.astro): Renovar badge, H1, subtítulo, botones CTA y keyword pills para posicionar **Ecommerce de Repuestos y Hardware** + **Servicios TI en Santiago**, eliminando toda referencia y enlace a `/desarrollo`, bots o software a medida.
- `[MODIFY]` [src/pages/index.astro](file:///home/angel/Developer/landingpage/src/pages/index.astro): Actualizar `title`, `description` y `keywords` hacia Ecommerce de repuestos y Servicios TI; remover import y render de `<SaaSProducts />`.
- `[MODIFY]` [src/components/Services.astro](file:///home/angel/Developer/landingpage/src/components/Services.astro): Eliminar la tarjeta `"Software a Medida, Bots & Agentes IA"` (`link: "/desarrollo"`, líneas 46-52).
- `[MODIFY]` [src/pages/sitemap.xml.ts](file:///home/angel/Developer/landingpage/src/pages/sitemap.xml.ts): Remover `/desarrollo` (y evaluar `/whagil`, `/whalinkbot`, `/inframanagerpro` según confirmación en Gate 3).
- `[DELETE]` [src/pages/desarrollo.astro](file:///home/angel/Developer/landingpage/src/pages/desarrollo.astro) y [src/pages/diseno-web.astro](file:///home/angel/Developer/landingpage/src/pages/diseno-web.astro): Eliminar las páginas de desarrollo de software de la landing.
- `[DELETE]` [src/components/SaaSProducts.astro](file:///home/angel/Developer/landingpage/src/components/SaaSProducts.astro): Eliminar componente huérfano tras retirarlo de `index.astro`.
- *(Pendiente de confirmación en Gate 3)*: Decidir si [src/pages/whagil.astro](file:///home/angel/Developer/landingpage/src/pages/whagil.astro), [src/pages/whalinkbot.astro](file:///home/angel/Developer/landingpage/src/pages/whalinkbot.astro) e [src/pages/inframanagerpro.astro](file:///home/angel/Developer/landingpage/src/pages/inframanagerpro.astro) se conservan como fichas de referencia con `rel="noopener"` y autoría de Studio Coders, o si también se eliminan.

---

## 3. Estrategia de Verificación (Gate 4)

Tras recibir aprobación humana y aplicar los cambios, se ejecutarán:
```bash
npx astro check
npm test
npm run build
```
Todos los comandos deberán finalizar con código de salida `0` y sin errores de tipos, pruebas ni compilación.
