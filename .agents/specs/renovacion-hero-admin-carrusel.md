---
title: Especificación Funcional — Carrusel de Banners Exclusivo de /repuestos y Administrador
status: Aprobado y Verificado (Completado)
feature: carrusel-exclusivo-repuestos
author: Antigravity AI
date: 2026-10-11
---

# 📋 Especificación Funcional: Carrusel de Banners Exclusivo de /repuestos y Administrador

> [!IMPORTANT]
> **DELIMITACIÓN CRÍTICA Y ESTRICTA DEL ALCANCE:**
> - **Página Principal (`/`):** **TOTALMENTE FUERA DE ALCANCE**. Debe permanecer **100% INTACTA**, conservando su diseño, textos, componentes (`src/components/Hero.astro`), SEO y comportamiento originales sin ninguna alteración.
> - **Página de Repuestos (`/repuestos`):** **OBJETO EXCLUSIVO DE ESTA ESPECIFICACIÓN**. Incorpora la nueva sección de banner/carrusel moderno con la propuesta comercial y controles interactivos.
> - **Administrador (`/meson-servitecnology-st/banners`):** Gestiona **única y exclusivamente** los banners asignados a la sección `/repuestos`.

---

## 1. Problema y Justificación de Negocio (UX)

### 1.1 Fricción Comercial en la Tienda Ecommerce (/repuestos)
La página de catálogo `/repuestos` recibe tráfico interesado en comprar piezas, pantallas, teclados y componentes, pero carece de un banner principal de alto impacto visual que comunique que **SERVITECNOLOGY no solo vende repuestos, sino que también ofrece el servicio integral de instalación, configuración, puesta en marcha y soporte técnico** para dichos productos.

### 1.2 Necesidad Operativa del Administrador
Los administradores necesitan destacar promociones, servicios de armado/instalación o avisos comerciales en la tienda de repuestos de manera dinámica desde `/meson-servitecnology-st/banners`, sin tocar código fuente ni desplegar la aplicación en Vercel.

---

## 2. Solución Funcional y Arquitectura de Componentes

### 2.1 Aislamiento Arquitectónico Estricto (Sin Componentes Compartidos Afectados)
- **Componente Dedicado:** Se crea [`src/components/RepuestosBannersCarousel.astro`](file:///c:/servitecnology/landingpage/src/components/RepuestosBannersCarousel.astro), independiente de cualquier componente de la portada.
- **Integración:** Se importa y renderiza **exclusivamente** dentro de [`src/pages/repuestos.astro`](file:///c:/servitecnology/landingpage/src/pages/repuestos.astro) encima de `<Catalog />`.
- **Integridad de la Portada:** [`src/components/Hero.astro`](file:///c:/servitecnology/landingpage/src/components/Hero.astro) permanece inalterado y conectado a la portada [`src/pages/index.astro`](file:///c:/servitecnology/landingpage/src/pages/index.astro).

### 2.2 Experiencia Visual y Contenido en /repuestos
- **Propuesta de Contenido Comercial:**
  - **Título:** «No tienes que hacerlo solo.»
  - **Subtítulo:** «Instalamos y configuramos tus repuestos y componentes»
  - **Texto Explicativo:** «Cotiza la instalación de tus productos con nosotros y concéntrate en tus proyectos. Te ayudamos con la instalación, configuración y puesta en marcha.»
  - **Llamada a la Acción (CTA Principal):** «Cotiza tu servicio» hacia el canal de WhatsApp (`https://wa.me/56948672300?text=Hola%20SERVITECNOLOGY,%20deseo%20cotizar%20la%20instalaci%C3%B3n...`).
  - **CTA Secundario:** «Explorar Catálogo de Repuestos» con desplazamiento suave al ancla `#catalogo`.
  - **Píldoras Temáticas de Hardware y Servicios:**
    - 📹 Cámaras & CCTV (`/cctv`)
    - 🌐 Redes & Conectividad (`/redes`)
    - 💻 Notebooks & Pantallas (`/soporte`)
    - 🖨️ Impresoras & Suministros (`/impresoras`)
    - ⚙️ Instalación & Puesta en Marcha (`#catalogo`)
- **Carrusel Dinámico de Banners:**
  - Consulta en tiempo real a Supabase filtrando por `seccion = 'repuestos'` y `activo = true`, ordenado por `orden ASC`.
  - Fallback local de alta fidelidad si no hay banners registrados en base de datos.
  - Controles de usuario: Flechas prev/next, indicadores (dots) interactivos y botón para pausar/reanudar la reproducción automática.
  - Pausa al interactuar con el puntero (*hover*) y soporte táctil (*swipe*) en móviles.

### 2.3 Administrador de Banners de /repuestos (`/meson-servitecnology-st/banners`)
- Interfaz clara identificada como: **«Banners de la Tienda de Repuestos (/repuestos)»**.
- Funcionalidades:
  1. **Listar y Previsualizar:** Miniatura, título, texto alt, enlace, orden, estado (`Activo` vs `Pausado`) y fecha.
  2. **Agregar Banners:** Subida de imagen a Supabase Storage con metadatos asociados a `seccion = 'repuestos'`. Validaciones de formato (JPG, PNG, WebP) y tamaño (máx. 5 MB).
  3. **Editar y Ordenar:** Modificar textos, enlaces y subir/bajar orden numérico.
  4. **Pausar y Reactivar:** Alternar visibilidad con un solo clic (oculta en `/repuestos` sin borrar archivo).
  5. **Eliminar:** Confirmación obligatoria con `window.showAdminConfirm(...)` y borrado físico en Storage y DB.
- **Cero Efectos Secundarios:** Los banners administrados nunca se muestran en la portada ni en otras páginas.

### 2.4 Diagnóstico y Corrección de `ResponseSentError`
- **Causa Raíz:** En Astro SSR con `@astrojs/vercel`, ejecutar `return Astro.redirect(...)` dentro de un layout o componente hijo (como `AdminLayout.astro`) después de que la página padre ya inició su procesamiento o streaming de respuesta desencadena `ResponseSentError: The response has already been sent to the browser and cannot be altered`.
- **Solución Arquitectónica:** Toda verificación de autenticación SSR se ejecuta en la **primera línea del frontmatter de la página** (`banners.astro`), antes de cualquier consulta asíncrona a la base de datos o llamada a componentes, retornando el encabezado HTTP 302 inmediatamente.

---

## 3. Requisitos Funcionales en Sintaxis EARS

### 3.1 Requisitos Ubicuos (Ubiquitous)
- **EARS-UBI-01:** THE SYSTEM SHALL mantener la portada `/` y el componente `src/components/Hero.astro` idénticos a su versión original sin modificaciones.
- **EARS-UBI-02:** THE SYSTEM SHALL mostrar en la cabecera de `/repuestos` el nuevo banner/carrusel con el título «No tienes que hacerlo solo.», texto de instalación y botón «Cotiza tu servicio».
- **EARS-UBI-03:** THE SYSTEM SHALL segmentar inequívocamente los banners bajo el identificador `seccion = 'repuestos'` en base de datos, Storage y endpoints.

### 3.2 Requisitos Basados en Eventos (Event-Driven)
- **EARS-EVD-01:** WHEN el usuario visite `/repuestos`, THE SYSTEM SHALL consultar y renderizar únicamente los banners activos con `seccion = 'repuestos'`.
- **EARS-EVD-02:** WHEN el administrador suba, pause, reactive, reordene o elimine un banner en `/meson-servitecnology-st/banners`, THE SYSTEM SHALL aplicar los cambios exclusivamente a la sección de repuestos.
- **EARS-EVD-03:** WHEN un usuario no autenticado intente acceder a `/meson-servitecnology-st/banners`, THE SYSTEM SHALL redirigir a `/meson-servitecnology-st/login` en la cabecera inicial sin generar `ResponseSentError`.

### 3.3 Requisitos Basados en Estados (State-Driven)
- **EARS-STD-01:** WHILE el carrusel de `/repuestos` tenga auto-reproducción activa, THE SYSTEM SHALL rotar las diapositivas cada 6 segundos.
- **EARS-STD-02:** WHILE no existan banners activos de repuestos en Supabase, THE SYSTEM SHALL mostrar la colección curada de diapositivas de respaldo de repuestos y hardware.

---

## 4. Contratos de Datos y Modelo de Base de Datos

### 4.1 Entidad `public.hero_banners`
```text
Table: public.hero_banners
- id: UUID (PK, DEFAULT gen_random_uuid())
- titulo: TEXT NOT NULL
- descripcion: TEXT DEFAULT ''
- imagen_url: TEXT NOT NULL
- storage_path: TEXT
- link_url: TEXT DEFAULT ''
- alt_text: TEXT DEFAULT ''
- seccion: TEXT NOT NULL DEFAULT 'repuestos'
- orden: INTEGER NOT NULL DEFAULT 0
- activo: BOOLEAN NOT NULL DEFAULT true
- created_at: TIMESTAMPTZ DEFAULT now()
- updated_at: TIMESTAMPTZ DEFAULT now()
```

---

## 5. Checklist de Definition of Done (DoD)

- [x] **DoD-01 (Portada Intacta):** La página principal `/` y su componente `src/components/Hero.astro` permanecen 100% idénticos a su estado previo al requerimiento.
- [x] **DoD-02 (Carrusel Exclusivo de /repuestos):** La página `/repuestos` contiene el nuevo carrusel responsivo con el mensaje «No tienes que hacerlo solo.» y CTA «Cotiza tu servicio».
- [x] **DoD-03 (Aislamiento de Componente):** El carrusel de repuestos se encapsula en `src/components/RepuestosBannersCarousel.astro` sin compartir código que altere otras secciones.
- [x] **DoD-04 (Delimitación de Sección):** La tabla `hero_banners`, los endpoints `/api/admin/banners/*` y el panel `/meson-servitecnology-st/banners` operan con `seccion = 'repuestos'`.
- [x] **DoD-05 (Erradicación de ResponseSentError):** La ruta `/meson-servitecnology-st/banners` implementa guardia SSR en la cabecera del frontmatter sin causar errores de respuesta duplicada.
- [x] **DoD-06 (CRUD y Pausa en Admin):** El administrador puede agregar, editar, ordenar, pausar/activar y eliminar banners de repuestos con confirmación moderna `window.showAdminConfirm`.
- [x] **DoD-07 (Cero Regresiones y Build):** Se ejecutan `npm test` y `npm run build` con 0 errores y se certifica la ausencia de impacto en la portada.
