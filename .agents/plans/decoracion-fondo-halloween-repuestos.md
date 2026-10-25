# Plan Técnico: Fondo Estacional de Halloween en /repuestos (Buscador y Carrusel)

> **Documento:** Plan Técnico de Implementación (Gate 2 SDD)  
> **Ubicación:** `.agents/plans/decoracion-fondo-halloween-repuestos.md`  
> **Especificación Asociada:** [`.agents/specs/decoracion-fondo-halloween-repuestos.md`](file:///c:/servitecnology/landingpage/.agents/specs/decoracion-fondo-halloween-repuestos.md)  
> **Módulos Afectados:** [`src/pages/repuestos.astro`](file:///c:/servitecnology/landingpage/src/pages/repuestos.astro), [`src/components/RepuestosBannersCarousel.astro`](file:///c:/servitecnology/landingpage/src/components/RepuestosBannersCarousel.astro), [`src/config/seasonal.ts`](file:///c:/servitecnology/landingpage/src/config/seasonal.ts), `tests/repuestos-seasonal-decor.test.ts`  
> **Estado:** Completado y Certificado Localmente ✅  
> **Fecha:** 2026-10-24  
> **Autor:** Antigravity AI  

---

## 1. Resumen Técnico

1. **Sección de Búsqueda y Categorías:**
   - Conserva su altura y proporción original en [`src/pages/repuestos.astro`](file:///c:/servitecnology/landingpage/src/pages/repuestos.astro).
   - Hospeda `fondo-nav.webp` con `pointer-events-none select-none z-0`.

2. **Sección del Carrusel de Banners:**
   - En [`src/components/RepuestosBannersCarousel.astro`](file:///c:/servitecnology/landingpage/src/components/RepuestosBannersCarousel.astro), se importa `ACTIVE_REPUESTOS_SEASON`.
   - Se inyecta `fondo-nav.webp` en la capa base `z-0` del carrusel.
   - En el **Slide 0** (slide principal hero), se utiliza `fondo-nav.webp` como fondo con degradados de contraste equilibrados, de modo que el título *"No tienes que hacerlo solo. Instalamos y configuramos tus repuestos"* y los botones de acción destaquen nítidos en el centro oscuro, mientras la luna, castillo y calabazas son visibles en los laterales.
   - En los slides de catálogo (1 a 6), el fondo ambientado difuminado utiliza también la temática estacional.

3. **Reversibilidad:**
   - Si `ACTIVE_REPUESTOS_SEASON = null`, tanto la navegación como el carrusel vuelven instantáneamente a sus imágenes y fondos tecnológicos estándar.

---

## 2. Comandos de Validación Ejecutados
```bash
# 1. Pruebas de integración estacional y de aislamiento
npx vitest run tests/repuestos-seasonal-decor.test.ts tests/repuestos-banners-isolation.test.ts tests/repuestos-responsive-badges.test.ts
# ✓ 35/35 tests pasados

# 2. Compilación de producción
npm run build
# ✓ Server built - Complete (0 errores)
```
