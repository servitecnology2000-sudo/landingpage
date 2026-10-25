# Plan Técnico: Personalización Dinámica de Fondos de /repuestos y Menú Principal Global desde el Mesón de Banners

> **Documento:** Plan Técnico de Implementación (Gate 2 SDD — Ampliación Menú Principal)  
> **Ubicación:** `.agents/plans/personalizacion-fondos-repuestos-admin.md`  
> **Especificación Asociada:** [`.agents/specs/personalizacion-fondos-repuestos-admin.md`](file:///c:/servitecnology/landingpage/.agents/specs/personalizacion-fondos-repuestos-admin.md)  
> **Módulos Afectados:**  
> - `src/pages/meson-servitecnology-st/banners.astro`  
> - `src/pages/api/admin/banners/custom-backgrounds.ts`  
> - `src/pages/api/menu-background.ts` `[NEW]`  
> - `src/components/Header.astro`  
> - `src/pages/repuestos.astro`  
> - `src/components/RepuestosBannersCarousel.astro`  
> - `tests/repuestos-custom-backgrounds.test.ts`  
> **Estado:** Gate 2 - Planificado y Listo para Implementar  
> **Fecha:** 2026-10-25  
> **Autor:** Antigravity AI  

---

## 1. Resumen Técnico de Arquitectura

### A. Diagnóstico de Integración y Mínimo Impacto
1. **Reutilización de Infraestructura Existente:**
   - Tabla Postgres: `public.hero_banners`.
   - Bucket Storage: `banners`.
   - Autenticación: Cookie `admin_session` o header `Authorization: Bearer <ADMIN_SECRET>`.
   - Cero migraciones SQL, cero cambios de esquemas y cero cambios de RLS.
2. **Desacople e Independencia Total:**
   - Banners promocionales de repuestos: `seccion = 'repuestos'`.
   - Fondo de búsqueda de repuestos: `seccion = 'repuestos_fondo_busqueda'`.
   - Fondo de carrusel de repuestos: `seccion = 'repuestos_fondo_carrusel'`.
   - Fondo de menú principal global: `seccion = 'menu_principal'`.
   - La acción «Volver a colores originales» del Menú Principal desactiva únicamente `seccion = 'menu_principal'`.
   - La acción «Volver a colores originales» de Repuestos desactiva únicamente `seccion in ('repuestos_fondo_busqueda', 'repuestos_fondo_carrusel')`.
3. **Cobertura Global sin Modificar Páginas Individualmente:**
   - Todas las páginas públicas importan `src/components/Header.astro`.
   - `Header.astro` gestiona directamente el fondo en SSR y cuenta con sincronización ligera en cliente para páginas cacheadas.
   - Preservación de logotipo, navegación de escritorio, drawer móvil y capa de contraste `bg-black/70 backdrop-blur-[2px]` para legibilidad óptima.

---

## 2. Detalle Archivo por Archivo de Cambios

### 1. `[MODIFY]` `src/pages/api/admin/banners/custom-backgrounds.ts`
- **Responsabilidad:** Endpoint administrativo autenticado.
- **Ampliaciones:**
  - `GET`: Retorna `{ searchBg, carouselBg, menuBg, isOriginalRepuestos, isOriginalMenu }`.
  - `POST`: Admite:
    - `action = 'set_menu_bg'`: Establece o sube el fondo de `menu_principal`.
    - `action = 'reset_menu_original'`: Desactiva únicamente `menu_principal`.
    - `action = 'set_search_bg'`: Establece fondo de búsqueda de Repuestos.
    - `action = 'set_carousel_bg'`: Establece fondo de carrusel de Repuestos.
    - `action = 'reset_original'`: Desactiva únicamente fondos de Repuestos.

### 2. `[NEW]` `src/pages/api/menu-background.ts`
- **Responsabilidad:** Endpoint público ligero para lectura de fondo activo del menú principal (soporte de sincronización instantánea y páginas estáticas).
- Retorna `{ active: boolean, imageUrl: string | null }`.

### 3. `[MODIFY]` `src/pages/meson-servitecnology-st/banners.astro`
- **Responsabilidad:** Panel administrativo.
- **Cambios en UI:**
  - Añadir apartado claramente separado: **«Apariencia del menú principal»**:
    - Indicador visual del estado actual (Original vs Personalizado con miniatura).
    - Botón «Personalizar Fondo del Menú» (abre modal `#menuBgModal` con vista previa, carga de archivo y preajuste).
    - Botón «Volver a colores originales» (exclusivo para el menú).
  - Conservar intactos los controles de fondos de Repuestos («Fondo de búsqueda», «Fondo del carrusel», «Volver a colores originales» de Repuestos, y «Nuevo Banner de Repuestos»).

### 4. `[MODIFY]` `src/components/Header.astro`
- **Responsabilidad:** Encabezado global compartido por todas las páginas.
- **Cambios:**
  - Consulta SSR a `hero_banners` para `seccion = 'menu_principal'` y `activo = true`.
  - Inyección de contenedor absoluto con imagen de fondo y máscara de contraste.
  - Sincronizador en cliente para reflejo inmediato.
  - 100% de preservación de enlaces, logos, iconos y menú responsive.

### 5. `[MODIFY]` `tests/repuestos-custom-backgrounds.test.ts`
- **Responsabilidad:** Suite de pruebas que certifique:
  - Presencia del apartado «Apariencia del menú principal» en `banners.astro`.
  - Acciones `set_menu_bg` y `reset_menu_original` en la API.
  - Endpoint público `/api/menu-background`.
  - Independencia de restauración entre Menú y Repuestos.
  - Soporte global en `Header.astro`.

---

## 3. Comandos de Validación
```bash
# 1. Pruebas de certificación
npx vitest run tests/repuestos-custom-backgrounds.test.ts

# 2. Pruebas de aislamiento y responsividad
npx vitest run tests/repuestos-banners-isolation.test.ts tests/repuestos-responsive-badges.test.ts

# 3. Compilación de producción
npm run build
```

