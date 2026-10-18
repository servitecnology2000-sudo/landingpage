# Plan Técnico: Corrección Responsive Móvil y Colores de Estados de Productos en /repuestos

> **Documento:** Plan Técnico de Implementación (Gate 2 SDD)  
> **Ubicación:** `.agents/plans/repuestos-mobile-responsive-colores-estados.md`  
> **Especificación Asociada:** [`.agents/specs/repuestos-mobile-responsive-colores-estados.md`](file:///c:/servitecnology/landingpage/.agents/specs/repuestos-mobile-responsive-colores-estados.md)  
> **Módulos Afectados:** `src/pages/repuestos.astro`, `src/components/RepuestosCatalogNav.astro`, `src/components/RepuestosBannersCarousel.astro`, `src/components/Catalog.astro`, `src/pages/repuesto/[slug].astro`  
> **Estado:** Completado y Certificado ✅  
> **Fecha:** 2026-10-18  
> **Autor:** Antigravity AI  

---

## 1. Resumen Técnico de Arquitectura, Patrones y Rendimiento

### A. Diagnóstico de Causas Raíz Confirmadas
1. **Desbordamiento Horizontal por Elementos con Ancho Mayor al Viewport:**
   - En `RepuestosCatalogNav.astro`, el resplandor absoluto (`w-[600px] left-1/2 -translate-x-1/2`) no tiene contención `overflow-hidden` en `#repuestos-top-nav`, forzando al navegador a extender el ancho del scroll horizontal en cualquier pantalla móvil < 600px.
   - En `RepuestosBannersCarousel.astro`, la pastilla flotante de los banners gráficos (`bottom-16 left-1/2 -translate-x-1/2`) no tiene `max-width` responsivo y supera los 400px de ancho con textos largos, desbordando en 320px, 360px y 390px.
   - En `repuestos.astro`, el contenedor `<main>` no posee `overflow-x-clip`.
2. **Flechas del Carrusel Invasivas en Móvil:**
   - Flechas laterales de 44px (`w-11`) en `left-3` y `right-3` que se superponen sobre textos de catálogo y CTAs en pantallas de 320px-360px.
3. **Colapso de Botones de Compra en Tarjetas:**
   - La distribución `p-6` + `px-6` reduce el ancho interno a 224px en 320px y 264px en 360px. El reparto simétrico `flex-1` entre *"Agregar al Carrito"* y *"Detalles"* estrangula el botón de compra, provocando quiebres de línea no intencionales.
4. **Conflicto Físico entre Carrito Flotante y WhatsApp:**
   - El widget flotante de carrito (`bottom-6 inset-x-4`) colisiona directamente en pantallas móviles con el botón flotante de WhatsApp (`bottom-6 right-6`), impidiendo pulsar *"Pagar"*.
5. **Indiferenciación de Estados:**
   - `Nuevo` y `Usado Verificado` comparten las clases cian idénticas `text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20` tanto en `Catalog.astro` como en `repuesto/[slug].astro`.

### B. Principios de Solución y Patrones de Diseño
- **Aislamiento Estricto:** Cero modificaciones a la portada `/`, al componente `Hero.astro` o a cualquier otra página externa.
- **Contención Segura con `overflow-x-clip`:** Se prefiere `overflow-x-clip` en lugar de `overflow-x-hidden` en contenedores estructurales para evitar crear nuevos contextos de formateo que rompan el sticky header del layout.
- **Paleta Accesible WCAG:**
  - `Nuevo`: Fondo verde esmeralda translúcido de alto contraste `bg-emerald-500/15`, texto `text-emerald-300` o `text-emerald-400` y borde `border-emerald-500/30`.
  - `Usado Verificado`: Fondo naranja/ámbar cálido `bg-amber-500/15`, texto `text-amber-300` o `text-amber-400` y borde `border-amber-500/30`.
  - Mismo dimensionamiento: `text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 inline-flex items-center gap-1`.

---

## 2. Detalle Archivo por Archivo de Cambios

### 1. `[MODIFY]` `src/pages/repuestos.astro`
- **Razón del Cambio:** Aplicar contención estricta al contenedor principal de la vista para blindar el viewport móvil contra desbordamientos subpíxel.
- **Bloques Afectados:**
  - `<main class="relative bg-black min-h-screen">` -> `<main class="relative bg-black min-h-screen overflow-x-clip">`.

### 2. `[MODIFY]` `src/components/RepuestosCatalogNav.astro`
- **Razón del Cambio:** Evitar que el halo resplandor `w-[600px]` infle el ancho del documento en pantallas móviles y optimizar el espaciado de categorías y búsqueda.
- **Bloques Afectados:**
  - Contenedor `<nav id="repuestos-top-nav">`: agregar `overflow-hidden` o `overflow-x-clip`.
  - Menú de categorías: asegurar espaciado y márgenes compactos en móviles (`gap-1.5 sm:gap-2.5`, padding de botones `px-3.5 sm:px-5 py-1.5 sm:py-2.5 text-xs sm:text-sm`).
  - Input de búsqueda: garantizar `min-w-0`, ajuste de tamaño en móviles y feedback responsivo sin recortes.

### 3. `[MODIFY]` `src/components/RepuestosBannersCarousel.astro`
- **Razón del Cambio:** Eliminar el desbordamiento de la pastilla flotante de banners, evitar la invasión de las flechas de navegación y ajustar el título hero para móviles estrechos.
- **Bloques Afectados:**
  - Título hero: Escala fluida `text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black break-words leading-tight sm:leading-[1.05]`.
  - Botones CTA hero: `w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base text-center justify-center` con espaciado móvil armónico.
  - Pastilla flotante de banners gráficos (líneas 257-269):
    - Agregar `max-w-[calc(100vw-2rem)] w-auto px-3 sm:px-6 py-2 sm:py-3 flex-wrap justify-center text-center`.
  - Flechas de navegación:
    - Ajustar a `w-9 h-9 sm:w-11 sm:h-11 left-2 sm:left-6 right-2 sm:right-6` con z-index seguro y sin interferir en los CTAs centrales.

### 4. `[MODIFY]` `src/components/Catalog.astro`
- **Razón del Cambio:** Diferenciar visualmente los estados `Nuevo` vs `Usado Verificado`, mejorar el ancho útil de la tarjeta en móviles, evitar que *"Agregar al Carrito"* colapse en múltiples líneas y resolver la colisión espacial con el botón flotante de WhatsApp.
- **Bloques Afectados:**
  - Contenedor de sección: padding exterior `px-4 sm:px-6`.
  - Tarjeta de catálogo (`.catalog-card`): padding interior `p-4 sm:p-6`.
  - Etiqueta de Estado de Producto:
    - Función o evaluación de clase basada en `product.estado`:
      - Si `product.estado?.toLowerCase() === 'nuevo'`:
        `text-emerald-300 bg-emerald-500/15 border-emerald-500/30`
      - En caso contrario (`'Usado Verificado'` o default):
        `text-amber-300 bg-amber-500/15 border-amber-500/30`
  - Fila de botones de acción:
    - Botón primario *"Agregar al Carrito"*: `flex-1 min-w-0 px-2.5 sm:px-3 py-2.5 text-xs font-bold ...` con etiqueta `truncate` en caso de textos dinámicos.
    - Botón secundario *"Detalles"*: `shrink-0 px-3 sm:px-4 py-2.5 text-xs font-semibold ...`.
  - Barra de Carrito Flotante (`#floating-cart-bar`):
    - Reubicar en móvil para no colisionar con WhatsApp: `bottom-24 sm:bottom-6 right-4 left-4 sm:left-auto sm:right-24` o `inset-x-4 max-w-md pb-safe mb-16 sm:mb-0`, asegurando que el botón *"Pagar"* sea 100% clickeable sin superposición de `WhatsAppButton`.

### 5. `[MODIFY]` `src/pages/repuesto/[slug].astro`
- **Razón del Cambio:** Mantener consistencia cromática obligatoria (Requisito 6 de la especificación) entre el catálogo y la ficha de detalle del producto.
- **Bloques Afectados:**
  - Reemplazar las clases cian estáticas de la etiqueta de estado por la misma regla condicional (verde para `Nuevo`, naranja/ámbar para `Usado Verificado`).

### 6. `[NEW]` `tests/repuestos-responsive-badges.test.ts`
- **Razón del Cambio:** Certificación automatizada del DoD:
  - Verificar que `/` y `Hero.astro` permanecen intactos.
  - Verificar que `Catalog.astro` contiene las clases de distinción verde para `Nuevo` y naranja para `Usado Verificado`.
  - Verificar que `repuesto/[slug].astro` contiene la misma distinción.
  - Verificar que no existan anchos absolutos sin contención en `RepuestosCatalogNav.astro` ni en `RepuestosBannersCarousel.astro`.
  - Verificar que el contenedor de `/repuestos` incluye contención de desbordamiento horizontal.

---

## 3. Plan de Verificación y Testing

### Comandos de Certificación
```bash
# 1. Ejecutar la suite automatizada con el nuevo test
npm test

# 2. Verificar compilación completa y cero errores de TypeScript / Astro
npm run build
```

### Inspección Visual en Múltiples Resoluciones
Verificar en el servidor de desarrollo (`http://localhost:4321/repuestos`):
- **320 px (Móvil estrecho):** `document.documentElement.scrollWidth === window.innerWidth`, sin desbordamiento, botones de tarjeta alineados, carrusel responsivo.
- **360 px, 390 px y 430 px (Móviles estándar):** Grid centrado, títulos sin quiebres abruptos, pastilla flotante dentro del marco.
- **768 px (Tablet):** Disposición de 2 columnas en catálogo, navegación equilibrada.
- **1024 px y 1440 px (Escritorio):** Grid de 3 a 4 columnas, espaciados premium con estética glassmorphism corporativa.
- **Validación de Estados:** Productos nuevos muestran etiqueta verde (`Nuevo`), productos usados verificados muestran etiqueta naranja/ámbar (`Usado Verificado`).
- **Validación de Portada (`/`):** Confirmar que la página de inicio permanece idéntica e inalterada.
