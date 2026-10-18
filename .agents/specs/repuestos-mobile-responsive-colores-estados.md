# Especificación Funcional: Corrección Responsive Móvil y Colores de Estados de Productos en /repuestos

> **Documento:** Especificación Funcional (Gate 1 SDD)  
> **Ubicación:** `.agents/specs/repuestos-mobile-responsive-colores-estados.md`  
> **Módulo:** `/repuestos` (`src/pages/repuestos.astro`, `src/components/RepuestosCatalogNav.astro`, `src/components/RepuestosBannersCarousel.astro`, `src/components/Catalog.astro`, `src/pages/repuesto/[slug].astro`)  
> **Estado:** Completado ✅  
> **Fecha:** 2026-10-18  
> **Autor:** Antigravity AI  

---

## 1. Delimitación Estricta del Alcance (Scope Lock)

> [!IMPORTANT]
> **RESTRICCIÓN CRÍTICA E INNEGOCIABLE:**
> - **Página Principal (`/`):** **TOTALMENTE FUERA DE ALCANCE**. Debe permanecer 100% INTACTA, conservando su diseño, textos, componentes (`src/components/Hero.astro`), SEO y comportamiento originales sin ninguna alteración.
> - **Otras Rutas del Sitio (`/soporte`, `/cctv`, `/checkout`, `/nosotros`, `/meson-servitecnology-st/*`):** Inalteradas en su funcionalidad y arquitectura.
> - **Base de Datos y Supabase:** **CERO MODIFICACIONES** en tablas, columnas o registros de `repuestos_productos` para resolver un problema exclusivamente visual.
> - **Alcance Exclusivo:** La vista `/repuestos` y la ficha individual del producto `/repuesto/[slug]`.

---

## 2. Problema y Diagnóstico Técnico (Fricción de Usuario)

### 2.1 Descuadre y Desbordamiento Horizontal en Móviles (320px - 430px)
La página `/repuestos` presenta anomalías de visualización en pantallas móviles que degradan la experiencia de compra y provocan desplazamientos horizontales no deseados:

1. **Desbordamiento por Elementos Absolutos sin Contención:**
   - En `RepuestosCatalogNav.astro`, el resplandor de fondo (`w-[600px]` con centrado absoluto `left-1/2 -translate-x-1/2`) no posee contención de desbordamiento (`overflow-hidden` o `overflow-x-clip`) en su contenedor padre, provocando que en dispositivos con ancho < 600px el navegador extienda el `scrollWidth` del documento.
   - En `repuestos.astro`, la etiqueta `<main>` carece de `overflow-x-clip`, permitiendo que cualquier elemento dinámico o subpíxel desplace el viewport móvil.

2. **Desbordamiento de la Pastilla Flotante del Carrusel:**
   - En `RepuestosBannersCarousel.astro`, la pastilla flotante de los banners gráficos (`bottom-16 left-1/2 -translate-x-1/2`) utiliza un `inline-flex` no envuelto que concatena el badge y el llamado a la acción con textos largos (ej. *"Oferta Especial · $199.000"* + *"Pedir con Instalación Gratis →"*), alcanzando anchos de 390px a 420px. En pantallas de 320px y 360px este elemento excede los márgenes laterales.

3. **Invasión de Flechas de Navegación del Carrusel en Pantallas Estrechas:**
   - En `RepuestosBannersCarousel.astro`, las flechas laterales (`left-3` y `right-3`, de 44px de ancho cada una) ocupan más del 35% del ancho útil en móviles de 320px, montándose sobre el título, el texto descriptivo y los botones de acción comercial.

4. **Colapso de Botones en Tarjetas de Catálogo (`Catalog.astro`):**
   - El padding acumulado de la sección (`px-6`, 48px) sumado al padding de la tarjeta (`p-6`, 48px) reduce el ancho interno disponible a solo 224px en móviles de 320px y 264px en 360px.
   - La fila de acciones divide el espacio en dos botones con `flex-1`: *"Agregar al Carrito"* (que requiere al menos 164px para su icono y texto en una línea) y *"Detalles"*. En 108px disponibles, *"Agregar al Carrito"* se quiebra en dos líneas desalineando la tarjeta, y al presionar el botón los mensajes reactivos (*"¡Máx. Stock en Carrito!"*) colapsan verticalmente.

5. **Colisión del Carrito Flotante con el Botón de WhatsApp:**
   - El widget flotante de carrito (`#floating-cart-bar`) se posiciona en `fixed bottom-6 inset-x-4` con `z-40`, mientras que el botón flotante de WhatsApp (`WhatsAppButton.astro`) se ubica en `fixed bottom-6 right-6` con `z-50`. Al activarse el carrito con productos, el botón de WhatsApp se solapa sobre el botón *"Pagar"*, impidiendo que el cliente finalice la compra.

### 2.2 Indiferenciación Cromática de Estados de Producto
Actualmente, las etiquetas de estado del producto tanto en `Catalog.astro` (línea 142) como en `repuesto/[slug].astro` (línea 217) aplican de forma fija e idéntica las clases `text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20`.
Como consecuencia:
- Un producto con estado `Nuevo` y un producto con estado `Usado Verificado` lucen exactamente iguales (ambos color cian/azul claro).
- El usuario no puede distinguir visualmente de forma rápida si la pieza es nueva o usada garantizada.

---

## 3. Solución Funcional y Requisitos de Diseño

### 3.1 Corrección del Responsive Móvil
1. **Contención Horizontal del Viewport:**
   - `<main>` en `/repuestos` y `<nav id="repuestos-top-nav">` contarán con contención estricta contra desbordamiento horizontal (`overflow-x-clip`), evitando la aparición de barras de desplazamiento horizontal sin afectar el comportamiento `sticky` del encabezado.
2. **Dimensionamiento y Tipografía Fluida en Carrusel:**
   - El título principal del carrusel adaptará su escala tipográfica (`text-2xl sm:text-4xl md:text-5xl lg:text-6xl`) y salto de palabras (`break-words`) para evitar que términos largos generen saltos antiestéticos.
   - Las flechas laterales se ajustarán para no solapar los textos en pantallas táctiles pequeñas (`w-9 h-9 sm:w-11 sm:h-11`), permitiendo además la navegación táctil por deslizamiento (*swipe*).
   - La pastilla flotante de los banners gráficos se restringirá a un ancho máximo responsivo (`max-w-[calc(100vw-2rem)]`), permitiendo flex-wrap y tamaños de fuente proporcionales.
3. **Distribución Óptima de Tarjetas en Catálogo:**
   - En pantallas móviles (< 640px), el espaciado interior de la sección y las tarjetas se optimizará (`px-4 sm:px-6` en sección y `p-4 sm:p-6` en tarjeta), ganando 32px de ancho útil por tarjeta.
   - La fila de acciones priorizará el botón primario *"Agregar al Carrito"* asegurando que el texto y los estados de feedback se lean en una sola línea, manteniendo *"Detalles"* con un tamaño compacto coherente.
4. **Desacople Espacial entre Carrito Flotante y WhatsApp:**
   - El carrito flotante se ubicará con un margen inferior (`bottom-20 sm:bottom-6`) o una disposición calculada que evite cualquier superposición con el botón flotante de WhatsApp en resoluciones móviles y de escritorio.

### 3.2 Distinción Visual Consistente de Estados
Se establecerán dos estilos visuales bien diferenciados, con contraste accesible verificado (mínimo WCAG AA / AAA):
1. **Estado `Nuevo`:**
   - **Fondo:** Tono verde tecnológico corporativo (`bg-emerald-500/20` o `bg-emerald-500`).
   - **Texto y Borde:** Verde brillante / esmeralda de alta legibilidad (`text-emerald-300 border-emerald-500/40` o texto oscuro según contraste).
2. **Estado `Usado Verificado`:**
   - **Fondo:** Tono ámbar / naranja de advertencia y certificación técnica (`bg-amber-500/20` o `bg-amber-500`).
   - **Texto y Borde:** Ámbar / naranja cálido legible (`text-amber-300 border-amber-500/40` o texto oscuro según contraste).
3. **Homogeneidad:**
   - Mismo tamaño de fuente (`text-[10px]`), peso tipográfico (`font-bold`), espaciado (`px-2 py-0.5 sm:px-2.5 sm:py-0.5`), mayúsculas (`uppercase tracking-wider`) y redondez (`rounded-full border`).
   - Consistencia total entre la tarjeta de catálogo (`Catalog.astro`) y la ficha de detalle (`repuesto/[slug].astro`).
   - El color dependerá estrictamente del valor del campo `product.estado` proveniente de los datos, sin alterar la lógica de negocio ni registros de Supabase.

---

## 4. Requisitos en Sintaxis EARS

### 4.1 Requisitos Ubicuos (Ubiquitous)
- **EARS-UBI-01:** THE SYSTEM SHALL mantener la portada `/` y el componente `src/components/Hero.astro` 100% inalterados.
- **EARS-UBI-02:** THE SYSTEM SHALL mostrar las etiquetas de estado de producto con fondo verde para `Nuevo` y fondo naranja/ámbar para `Usado Verificado` en todas las vistas de `/repuestos`.
- **EARS-UBI-03:** THE SYSTEM SHALL renderizar la página `/repuestos` sin desbordamiento horizontal en resoluciones de 320px, 360px, 390px, 430px, 768px, 1024px y 1440px.

### 4.2 Requisitos Basados en Eventos (Event-Driven)
- **EARS-EVD-01:** WHEN el usuario visualice una tarjeta de producto con estado `Nuevo`, THE SYSTEM SHALL aplicar la clase visual de etiqueta verde.
- **EARS-EVD-02:** WHEN el usuario visualice una tarjeta de producto con estado `Usado Verificado` (o sin estado explícito por defecto), THE SYSTEM SHALL aplicar la clase visual de etiqueta naranja.
- **EARS-EVD-03:** WHEN el usuario agregue un producto al carrito en un dispositivo móvil, THE SYSTEM SHALL desplegar la barra de carrito flotante en una posición libre de interferencias con el botón de WhatsApp.

### 4.3 Requisitos Basados en Estados (State-Driven)
- **EARS-STD-01:** WHILE el viewport del dispositivo tenga un ancho de 320px o superior, THE SYSTEM SHALL mantener legibles y en una sola línea los textos principales de los botones *"Agregar al Carrito"* y *"Detalles"*.
- **EARS-STD-02:** WHILE el carrusel de banners esté en pantalla en un dispositivo móvil estrecho (320px - 390px), THE SYSTEM SHALL mantener los controles de navegación y las pastillas informativas dentro del marco visible sin recorte ni solapamiento destructivo.

---

## 5. Checklist de Definition of Done (DoD)

- [x] **DoD-01 (Aislamiento):** La página de inicio `/` y `src/components/Hero.astro` no han sido modificados.
- [x] **DoD-02 (Cero Desbordamiento Móvil):** La página `/repuestos` no genera scroll horizontal en 320px, 360px, 390px, 430px, 768px, 1024px y 1440px (`scrollWidth === clientWidth`).
- [x] **DoD-03 (Color Nuevo):** Todos los productos con `estado === 'Nuevo'` lucen con fondo y acento verde legible.
- [x] **DoD-04 (Color Usado Verificado):** Todos los productos con `estado === 'Usado Verificado'` lucen con fondo y acento naranja/ámbar legible.
- [x] **DoD-05 (Consistencia Ficha):** La ficha `/repuesto/[slug]` aplica la misma diferenciación cromática que el catálogo.
- [x] **DoD-06 (Botones de Tarjeta):** Los botones *"Agregar al Carrito"* y *"Detalles"* permanecen alineados y legibles en 320px sin solapamientos.
- [x] **DoD-07 (No Solapamiento Carrito-WhatsApp):** La barra de carrito flotante no bloquea el botón de WhatsApp ni viceversa.
- [x] **DoD-08 (Pruebas Automatizadas):** Nueva suite en `tests/repuestos-responsive-badges.test.ts` ejecutada con 100% de éxito.
- [x] **DoD-09 (Build Limpio):** `npm run build` compila con 0 errores y 0 advertencias de tipo.
