# Especificación Funcional: Fondo Estacional de Halloween en /repuestos (Buscador y Carrusel)

> **Documento:** Especificación Funcional Actualizada (Gate 1 SDD)  
> **Ubicación:** `.agents/specs/decoracion-fondo-halloween-repuestos.md`  
> **Módulo:** `/repuestos` ([`src/pages/repuestos.astro`](file:///c:/servitecnology/landingpage/src/pages/repuestos.astro)), [`src/components/RepuestosCatalogNav.astro`](file:///c:/servitecnology/landingpage/src/components/RepuestosCatalogNav.astro), [`src/components/RepuestosBannersCarousel.astro`](file:///c:/servitecnology/landingpage/src/components/RepuestosBannersCarousel.astro)  
> **Estado:** Completado y Certificado Localmente ✅  
> **Fecha:** 2026-10-24  
> **Autor:** Antigravity AI  

---

## 1. Delimitación Estricta del Alcance (Scope Lock)

- **Sección de Catálogo de Productos (`Catalog.astro`):** **FORMATO 100% ORIGINAL**. Cero alteraciones ni dependencias estacionales.
- **Portada (`/`) y Hero:** **TOTALMENTE INTACTOS**. No se importa ningún recurso estacional en la página principal.
- **Secciones con Ambientación Estacional en `/repuestos`:**
  1. **Sección de Búsqueda y Categorías:** Hospeda `fondo-nav.webp` en su tamaño natural.
  2. **Sección del Carrusel de Banners (`RepuestosBannersCarousel.astro`):** Hospeda la misma imagen de fondo `fondo-nav.webp` tanto en el contenedor del carrusel como en el Slide 0 principal, manteniendo máxima legibilidad del texto y botones comerciales.
- **Reversibilidad:** Controlada de forma determinista mediante `src/config/seasonal.ts` (`ACTIVE_REPUESTOS_SEASON: 'halloween' | null`).

---

## 2. Especificación de Imagen Única

| Secciones Aplicadas | Imagen Origen Local | Destino en Proyecto | Dimensiones | Aspecto Visual | Tratamiento Visual |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Búsqueda/Categorías y Carrusel de Banners** | Imagen panorámica adjunta por el usuario (`imagen hallowen.png`) | `/seasonal/halloween/fondo-nav.webp` | 1983 x 793 px | Castillo y luna a la izquierda, árbol y cementerio a la derecha, centro oscuro natural | `object-cover object-center` preservando el color original naranja vibrante y contraste nativo |

---

## 3. Checklist de Definition of Done (DoD)

- [x] **DoD-01 (Foto de productos eliminada):** `Catalog.astro` en formato original sin dependencias estacionales.
- [x] **DoD-02 (Fondo Búsqueda/Categorías):** Imagen `fondo-nav.webp` en tamaño y proporción original.
- [x] **DoD-03 (Fondo Carrusel de Banners):** Imagen `fondo-nav.webp` integrada en el fondo del carrusel y en el Slide 0.
- [x] **DoD-04 (Color original preservado):** Sin filtros opacos agresivos, tonos naranjas vibrantes respetados.
- [x] **DoD-05 (Aislamiento de Portada):** Portada (`/`) y `Hero.astro` 100% inalterados.
- [x] **DoD-06 (Reversibilidad Verificada):** Al cambiar `ACTIVE_REPUESTOS_SEASON = null`, ambas secciones vuelven a su estado original limpio.
- [x] **DoD-07 (Pruebas Automatizadas):** 35/35 pruebas ejecutadas y pasando con 100% de éxito.
- [x] **DoD-08 (Build Limpio):** `npm run build` completa con 0 errores.
