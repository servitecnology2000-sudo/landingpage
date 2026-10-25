# Especificación Funcional: Personalización Dinámica de Fondos de /repuestos y Menú Principal Global desde el Mesón de Banners

> **Documento:** Especificación Funcional (Gate 2 SDD — Ampliación Menú Principal)  
> **Ubicación:** `.agents/specs/personalizacion-fondos-repuestos-admin.md`  
> **Módulo:** Navegación Global Compartida (`Header.astro`), Tienda de Repuestos (`/repuestos`) y Panel (`/meson-servitecnology-st/banners`)  
> **Estado:** Gate 2 - Especificación Ampliada y Cerrada  
> **Fecha:** 2026-10-25  
> **Autor:** Antigravity AI  

---

## 1. Delimitación Estricta del Alcance (Scope Lock)

> [!IMPORTANT]
> **RESTRICCIONES Y EXCLUSIONES OBLIGATORIAS:**
> - **Cero Cambios de Esquema en Supabase:** No se crean tablas nuevas, no se modifican columnas ni esquemas, no se tocan políticas RLS existentes. Se reutiliza la tabla existente `public.hero_banners` aprovechando la columna `seccion` con los valores `'repuestos_fondo_busqueda'`, `'repuestos_fondo_carrusel'` y `'menu_principal'`.
> - **Aislamiento Total de Banners Existentes:** Los 7 banners promocionales registrados poseen `seccion = 'repuestos'`. Las consultas del carrusel y de la tabla administrativa filtran explícitamente por `.eq('seccion', 'repuestos')`, garantizando que los registros de fondos no interfieran ni se mezclen con los banners comerciales.
> - **Independencia Estricta de Restauración:** 
>   - La acción «Volver a colores originales» del Menú Principal restaura única y exclusivamente el encabezado global, sin alterar los fondos de Repuestos.
>   - La acción «Volver a colores originales» de Repuestos restaura única y exclusivamente la búsqueda y el carrusel de `/repuestos`, sin alterar el Menú Principal.
> - **Alcance Global del Menú:** La personalización del menú se gestiona desde el componente compartido `src/components/Header.astro` y se refleja automáticamente en todas las páginas que lo utilizan, sin editar páginas individualmente.
> - **Preservación Visual Absoluta:** Se mantiene inalterado el logotipo y sus proporciones, los enlaces, destinos, iconos, badges de carrito/pedidos, navegación móvil y su contraste con oscurecimiento automático para legibilidad.
> - **Catálogo, Base de Datos y APIs:** Cero cambios en productos, precios, stock, carrito o MercadoPago.
> - **Estado Predeterminado:** Cuando no haya personalización activa (o tras pulsar «Volver a colores originales»), las secciones muestran su diseño original limpio.

---

## 2. Diagnóstico del Estado Original y Necesidad de Negocio

### 2.1 Estado Original de las Secciones
1. **Menú Principal Global (`Header.astro`):**
   - Fondo original: `bg-black/75 backdrop-blur-md border-b border-white/5`.
   - Utilizado por todas las páginas públicas del sitio (portada `/`, servicios, repuestos, checkout, pedidos, legal, etc.).
2. **Sección de Búsqueda y Categorías (`RepuestosCatalogNav`):**
   - Fondo original: Fondo negro puro (`bg-black`) con resplandor cyan ambiental tenue (`bg-brand-cyan/10 blur-[120px]`).
   - Sin imágenes forzadas, altura compacta natural (~210 px en escritorio).
3. **Sección del Carrusel de Banners (`RepuestosBannersCarousel`):**
   - Fondo original de sección: Fondo negro con degradado radial de puntos y resplandores tecnológicos (`bg-brand-cyan/15`, `bg-brand-green/10`).
   - Slide 0 original: Imagen de respaldo de soporte informático (`/imagenes/soportepc.jpg`) con triple degradado de contraste.

### 2.2 Solución Funcional Ampliada
Empoderar al administrador de la tienda desde `/meson-servitecnology-st/banners` para:
1. **Apartado «Apariencia del menú principal»:**
   - Selección de imagen de fondo (archivo o preajuste panorámico).
   - Previsualización en vivo en el modal antes de guardar.
   - Botón independiente «Volver a colores originales» exclusivo para el menú.
   - Indicador visible del estado actual de personalización del menú.
2. **Personalización de Repuestos:**
   - Selección independiente del fondo de búsqueda.
   - Selección independiente del fondo del carrusel.
   - Botón independiente «Volver a colores originales» exclusivo para Repuestos.

---

## 3. Arquitectura y Mecanismo de Persistencia

### 3.1 Reutilización de `hero_banners` y Storage `banners`
Persistencia determinista en Vercel sin alterar la base de datos:
- **Fondo del Menú Principal:** Registro en `hero_banners` con `seccion: 'menu_principal'`, `imagen_url`, `storage_path` y `activo: true/false`.
- **Fondo de Búsqueda:** Registro con `seccion: 'repuestos_fondo_busqueda'`.
- **Fondo de Carrusel:** Registro con `seccion: 'repuestos_fondo_carrusel'`.
- **Almacenamiento de Nuevas Imágenes:** Bucket existente de Supabase Storage `'banners'`.
- **Preajuste Disponible:** Imagen panorámica de alta resolución (`/seasonal/halloween/fondo-nav.webp`) disponible como preajuste en todos los modales.

### 3.2 Flujo de Consulta Global en `Header.astro`
- En el frontmatter de `src/components/Header.astro`:
  ```typescript
  const { data } = await supabase
    .from('hero_banners')
    .select('imagen_url')
    .eq('seccion', 'menu_principal')
    .eq('activo', true)
    .limit(1)
    .maybeSingle();
  ```
- Si `headerBgUrl` es null: Aplica el diseño original limpio `bg-black/75 backdrop-blur-md`.
- Si `headerBgUrl` está activo: Inyecta el contenedor de fondo absoluto con `img` y capa de oscurecimiento `bg-black/70 backdrop-blur-[2px]` para contraste garantizado.
- Sincronizador de respaldo en cliente (`api/menu-background.ts`) para garantizar actualización instantánea incluso en páginas estáticas o tras navegación client-side.

---

## 4. Requisitos en Sintaxis EARS

### 4.1 Requisitos Ubicuos (Ubiquitous)
- **EARS-UBI-01:** THE SYSTEM SHALL mantener la portada `/` y el componente `Hero.astro` 100% inalterados fuera del encabezado global compartido.
- **EARS-UBI-02:** THE SYSTEM SHALL mantener los 7 banners existentes de `seccion = 'repuestos'` intactos y sin interferencias.
- **EARS-UBI-03:** THE SYSTEM SHALL proteger todas las operaciones de modificación de fondos bajo el control de acceso administrativo existente (`admin_session` cookie o token `ADMIN_SECRET`).
- **EARS-UBI-04:** THE SYSTEM SHALL preservar la legibilidad, contraste, funcionalidad del menú móvil y proporciones del logo en `Header.astro` al aplicar cualquier fondo.

### 4.2 Requisitos Basados en Estados (State-Driven)
- **EARS-STD-01:** WHILE no existan registros activos para `menu_principal`, THE SYSTEM SHALL renderizar el menú principal en su apariencia original limpia.
- **EARS-STD-02:** WHILE no existan registros activos para `repuestos_fondo_busqueda`, THE SYSTEM SHALL renderizar la sección de búsqueda en su apariencia original.
- **EARS-STD-03:** WHILE no existan registros activos para `repuestos_fondo_carrusel`, THE SYSTEM SHALL renderizar el carrusel en su apariencia original con `soportepc.jpg`.

### 4.3 Requisitos Basados en Eventos (Event-Driven)
- **EARS-EVD-01:** WHEN el administrador configure el fondo del menú principal, THE SYSTEM SHALL aplicar el fondo exclusivamente al encabezado global sin modificar los fondos de `/repuestos`.
- **EARS-EVD-02:** WHEN el administrador haga clic en «Volver a colores originales» en el apartado del menú principal, THE SYSTEM SHALL restaurar exclusivamente el encabezado global sin modificar los fondos de `/repuestos`.
- **EARS-EVD-03:** WHEN el administrador haga clic en «Volver a colores originales» de Repuestos, THE SYSTEM SHALL restaurar exclusivamente los fondos de `/repuestos` sin modificar el encabezado global.

---

## 5. Checklist de Definition of Done (DoD)

- [ ] **DoD-01 (Auditoría de Navegación):** Todas las páginas que importan `Header.astro` identificadas y analizadas.
- [ ] **DoD-02 (Apartado Administrativo):** Apartado «Apariencia del menú principal» añadido en `banners.astro` con estado actual, botón de personalización y botón de restauración independiente.
- [ ] **DoD-03 (API Administrativa Ampliada):** Endpoint `custom-backgrounds.ts` con soporte para `set_menu_bg` y `reset_menu_original`.
- [ ] **DoD-04 (Endpoint Público de Menú):** Endpoint `src/pages/api/menu-background.ts` para consulta pública y sincronización.
- [ ] **DoD-05 (Componente Compartido `Header.astro`):** Inyección dinámica de fondo con preservación de logo, navegación móvil y contraste.
- [ ] **DoD-06 (Restauración Independiente):** Verificado que restaurar el menú no altera Repuestos y viceversa.
- [ ] **DoD-07 (Pruebas Automatizadas y Build):** Suite de pruebas de certificación pasando al 100% y `npm run build` sin errores.
