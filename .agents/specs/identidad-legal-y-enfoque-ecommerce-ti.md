# Spec: Identidad Legal SII, Separación de Marcas y Enfoque Ecommerce + Servicios TI

- **Estado:** Completado (Gate 4 Certificado)
- **Fecha:** 2026-11-15
- **Dominio Canónico:** `https://servitecnology.com`

---

## 1. Problema y Justificación de Negocio

1. **Inconsistencia Tributaria y Legal (SII Chile):** Múltiples vistas legales, correos transaccionales y exportaciones de datos utilizan la denominación inexacta `"SERVITECNOLOGY EIRL"`. En Chile, la razón social inscrita ante el Servicio de Impuestos Internos (SII) es **"JESUS LEON SOLUCIONES INFORMÁTICAS E.I.R.L."** (RUT: `77.709.717-2`), bajo la cual operan las marcas comerciales **SERVITECNOLOGY** (retail de hardware, repuestos y servicios TI) y **Studio Coders** (`https://studiocoders.dev`, división de software e IA).
2. **Desalineación de Posicionamiento en la Landing Principal:** La página de inicio (`Hero` y sección `SaaSProducts`), la barra de navegación (`Header` con menú `"Software SaaS"`), el carrusel de servicios y rutas como `/desarrollo` presentan a `servitecnology.com` como una fábrica de software a medida y bots de IA, compitiendo con la identidad de **Studio Coders** y restando foco al negocio principal del sitio: **Ecommerce de repuestos/hardware y Servicios TI**.
3. **Estandarización SEO / AI-SEO:** El archivo `src/layouts/Layout.astro` carece de `legalName`, `taxID` y vinculación estructurada (`subOrganization`) hacia Studio Coders en su JSON-LD, y `public/llms.txt` no sigue la especificación estándar de `llmstxt.org`.

---

## 2. Solución Funcional

1. **Normalización Legal SII:** Reemplazar toda referencia comercial/legal errónea `"SERVITECNOLOGY EIRL"` por `"SERVITECNOLOGY (marca comercial de JESUS LEON SOLUCIONES INFORMÁTICAS E.I.R.L. · RUT: 77.709.717-2)"` en términos, privacidad, correos transaccionales (`mailer.ts`) y exportación de portabilidad (`mis-pedidos.astro`, `pedido/[id].astro`), manteniendo intactos los datos bancarios de transferencia hasta confirmación explícita del titular en BancoEstado.
2. **Atribución en Footer y Datos Estructurados:** Actualizar el pie de página (`Footer.astro`) para acreditar a **Studio Coders** (`https://studiocoders.dev`) como División de Software e IA e informar la marca comercial y razón social SII; actualizar el JSON-LD de `Layout.astro` con `legalName`, `taxID` y `subOrganization`.
3. **Reenfoque Total de la Landing a Ecommerce y Servicios TI:**
   - Eliminar el menú `"Software SaaS"` y el ítem `"Desarrollo de Software"` del `Header.astro`.
   - Reemplazar los textos, CTAs y pills del `Hero.astro` para destacar el **Ecommerce de Repuestos y Hardware** y los **Servicios TI** (soporte técnico, armado gaming, CCTV, redes, impresoras).
   - Eliminar la sección `SaaSProducts` de `src/pages/index.astro` y la tarjeta de software a medida de `Services.astro`, manteniendo y potenciando las secciones orientadas a Ecommerce (`FeaturedParts`) y Servicios TI (`Services`).
   - Eliminar la oferta de desarrollo de software de la landing (`/desarrollo`, `/diseno-web` y su entrada en `sitemap.xml.ts`).
   - Revisar enlaces salientes en `/whagil`, `/whalinkbot` e `/inframanagerpro` (asegurando `rel="noopener"` y autoría de Studio Coders si se conservan, o eliminarlas según confirmación en Gate 3).
4. **Estandarización de `public/llms.txt`:** Reescribir `public/llms.txt` en formato `llmstxt.org` (H1, un único blockquote y listas Markdown) reflejando el enfoque Ecommerce + Servicios TI de SERVITECNOLOGY y vinculando a Studio Coders (`https://studiocoders.dev`).

---

## 3. Requisitos Funcionales (EARS)

- **REQ-01 (Identidad Legal SII):** WHEN el usuario consulte `/terminos`, `/privacidad`, reciba un correo transaccional de `mailer.ts` o exporte sus datos en `/mis-pedidos` o `/pedido/[id]`, THE SYSTEM SHALL mostrar la identificación legal `"SERVITECNOLOGY (marca comercial de JESUS LEON SOLUCIONES INFORMÁTICAS E.I.R.L. · RUT: 77.709.717-2)"` en lugar de `"SERVITECNOLOGY EIRL"`.
- **REQ-02 (Precaución Bancaria):** WHERE existan datos bancarios de transferencia en `src/pages/pedido/[id].astro`, THE SYSTEM SHALL preservar el campo `titular` y `rut` de `BANK_DETAILS` sin modificaciones automáticas hasta recibir confirmación expresa del titular de la cuenta en BancoEstado.
- **REQ-03 (Footer Corporativo):** WHEN se renderice `Footer.astro`, THE SYSTEM SHALL mostrar en la barra inferior el texto `"División de Software e IA:"` con enlace externo a `https://studiocoders.dev` (`target="_blank"`, `rel="noopener"`, anchor text `"Studio Coders"`), seguido de `"· SERVITECNOLOGY es marca comercial de JESUS LEON SOLUCIONES INFORMÁTICAS E.I.R.L. (RUT: 77.709.717-2)"`.
- **REQ-04 (Navegación Principal Limpia):** WHEN se renderice `Header.astro` (escritorio y móvil), THE SYSTEM SHALL omitir el menú `"Software SaaS"` y cualquier enlace a `/desarrollo`, manteniendo exclusivamente navegación orientada a **Servicios TI**, **Quiénes Somos**, **Ecommerce**, **Mis Pedidos**, **Canal** y **Contacto**.
- **REQ-05 (Hero y Home Enfocadas en Ecommerce y Servicios TI):** WHEN un visitante acceda a `/` (`index.astro`), THE SYSTEM SHALL presentar un `Hero` centrado en **Repuestos, Hardware y Servicios TI en Santiago** con CTAs directos a `/repuestos`, `#servicios`, `/soporte` y WhatsApp comercial, y SHALL omitir la sección `SaaSProducts` y la tarjeta de `"Software a Medida"` en `Services.astro`.
- **REQ-06 (Eliminación de Contenido de Desarrollo de Software):** WHEN se compile el sitio y se genere `sitemap.xml`, THE SYSTEM SHALL excluir `/desarrollo` y `/diseno-web` de la oferta de la landing.
- **REQ-07 (Schema.org JSON-LD):** WHEN se renderice cualquier página con `Layout.astro`, THE SYSTEM SHALL incluir en el bloque JSON-LD `Organization`/`LocalBusiness` los atributos `name: "Servitecnology"`, `legalName: "JESUS LEON SOLUCIONES INFORMÁTICAS E.I.R.L."`, `taxID: "77.709.717-2"` y `subOrganization` apuntando a `https://studiocoders.dev/#organization` (`Studio Coders`).
- **REQ-08 (Estándar `llmstxt.org`):** WHEN un agente o rastreador consulte `/llms.txt`, THE SYSTEM SHALL entregar un documento Markdown válido según `llmstxt.org` con `# SERVITECNOLOGY`, un único párrafo `> ...` y listas `- [Título](URL): descripción` cubriendo Ecommerce (`/repuestos`), Servicios TI y el vínculo a `Studio Coders` (`https://studiocoders.dev`).

---

## 4. Definition of Done (DoD)

- [x] No existen ocurrencias de `"SERVITECNOLOGY EIRL"` en textos legales, correos (`mailer.ts`) ni exportaciones JSON (salvo `BANK_DETAILS` si el usuario decide mantenerlo tras Gate 3).
- [x] `Footer.astro` muestra el enlace a `https://studiocoders.dev` con `rel="noopener"` y la razón social SII correcta.
- [x] `Header.astro`, `Hero.astro`, `index.astro` y `Services.astro` reflejan exclusivamente Ecommerce y Servicios TI, sin menú `"Software SaaS"`, sin sección `SaaSProducts` y sin referencias a `/desarrollo`.
- [x] `src/pages/desarrollo.astro` y `src/pages/diseno-web.astro` eliminados (y removidos de `sitemap.xml.ts`).
- [x] `Layout.astro` incluye `legalName`, `taxID` y `subOrganization` de Studio Coders en JSON-LD válido.
- [x] `public/llms.txt` cumple con la estructura `llmstxt.org`.
- [x] `npx astro check` (o verificación de tipos), `npm test` y `npm run build` finalizan con 0 errores.
