# SERVITECH - Estado del Proyecto y Memoria del Agente

## 🚀 Arquitectura Actual del Ecosistema
- **Frontend:** Landing Page moderna y responsiva desplegada en Vercel (https://landingpage-opal-iota.vercel.app/).
- **Estilos:** Tailwind CSS con diseño de tarjetas asimétricas estilo "Bento Grid" (2 tarjetas destacadas arriba, 3 medianas abajo) en la sección de servicios.
- **Base de Datos & Storage:** Proyecto activo en Supabase conectado (ID de referencia: `mivsnmvupahgbrjfdyhl`).
- **Tabla de Inventario:** `repuestos_productos` (Campos implementados: id, sku, titulo, slug, descripcion, categoria, compatibilidad, precio_venta, precio_costo, estado, stock_cantidad, imagenes, seo_titulo, seo_descripcion, seo_keywords, created_at).
- **Tabla de Analíticas:** `metricas_eventos` (Campos: id, tipo_evento, elemento_id, url_origen, creado_en).
- **Almacenamiento de Imágenes:** Bucket público en Supabase Storage llamado `imagenes-repuestos`.

## 🛠️ Rutas y Módulos Activos
1. **Ruta Pública (`/`):** Landing page principal. Incluye secciones: Hero (con enfoque After Office/Soporte Fuera de Oficina, sin imagen de reloj y con frase de certificación destacada), Servicios Estrella (Bento Grid) y Repuestos y Componentes (Tienda dinámica conectada a Supabase con navegación por flechas en carruseles y visor Lightbox flotante a pantalla completa).
2. **Ruta Administrativa Privada (`/admin`):** Panel de control autogestionable y operativo para operaciones CRUD (Crear, Leer, Actualizar, Eliminar) de repuestos, carga múltiple de imágenes y automatización de Slugs y SEO.

## 🎨 Lineamientos de Diseño y UX Aprobados
- **Imágenes de Servicios:** Estilo "Mockups Flotantes" tridimensionales con position absolute, overflow visible, sombras (drop-shadow) y transiciones suaves en hover (translateY).
- **Protección de Texto:** Ancho máximo restringido (max-w) en las descripciones de servicios para evitar solapamientos con las imágenes.
- **SEO Semántico:** Títulos y meta-descripciones inyectados dinámicamente en el <head> por cada producto desde la base de datos.

## 📋 Regla de Actualización Obligatoria para el Agente
- CADA VEZ que realice un cambio, actualización de código, refactorización o despliegue en este proyecto, DEBO actualizar inmediatamente este archivo 'agent.md' antes de finalizar la tarea, registrando los cambios en un historial de versiones al final del documento.

## 🕒 Historial de Versiones
- **2026-07-12:** Creación inicial del archivo de memoria del agente.
- **2026-07-12:** Actualización del número comercial de WhatsApp a +56948672300 de forma global. Adición de botones "Repuestos y Componentes" y "Escríbenos" en el Hero. Rediseño de escala en imágenes de Servicios (Bento Grid) aumentando a `w-[130%]` y reduciendo el contenedor de texto a `max-w-[45%]` para mayor impacto visual. Despliegue en Vercel.
- **2026-07-12 (Analíticas e Inventario):** Actualización masiva de inventario y analíticas. Migración de esquema en Supabase de `stock_disponible` (booleano) a `stock_cantidad` (entero). Creación de tabla `metricas_eventos`. Inyección de script VanillaJS en frontend para tracking de `visita_pagina` y `clic_boton`. Mejora en `/admin` con panel de métricas, buscador en tiempo real, formateo de fecha y selector de categorías dinámico. Renderizado de stock numérico y desactivación automática de botón WhatsApp si el stock es 0 en catálogo. Se generó `migration.sql` para su ejecución manual.
- **2026-07-12 (UX/UI Carrusel y Lightbox):** Reemplazo de los puntos de navegación de imágenes por flechas laterales interactivas. Implementación de un componente global Modal Lightbox flotante con fondo difuminado para visualización de repuestos en alta resolución y soporte de teclado (Escape y Flechas).
- **2026-07-12 (Propuesta 1 - Servicios):** Rediseño total de la sección Servicios eliminando el Bento Grid. Se implementó un Carrusel Adaptativo Mobile-First. En móviles, las tarjetas son 100% verticales con tipografía `16px` mínima e imagen `h-72`. En computadoras, se despliega una vista premium horizontal (`flex-row`) de dos columnas (50% imagen, 50% contenido). Las imágenes pasaron a ser de alta resolución con `rounded-2xl` y zoom on hover `scale-105`. Botón WhatsApp ocupa 100% del ancho con padding mejorado para clics. Despliegue en producción en Vercel.
- **2026-07-12 (Rebranding a SERVITECNOLOGY):** Cambio de identidad global de SERVITECH a SERVITECNOLOGY en todo el código fuente, títulos SEO y mensajes automatizados de WhatsApp. Integración del nuevo logotipo `logost.png` en el Navbar (`Header.astro`) junto al texto responsivo. Configuración del nuevo favicon `favico.jpg` en `Layout.astro` y eliminación de favicons antiguos. Despliegue automático a producción.
- **2026-07-12 (Páginas Legales SERNAC y Ley de Protección de Datos):** Creación e implementación técnica de las páginas obligatorias de cumplimiento normativo chileno (`/terminos`, `/privacidad` y `/garantias`). Redacción legal con advertencias de no transacción monetaria, analítica pasiva y condiciones de garantía 3x3 para hardware y servicios. Inyección de menús de navegación legal en `Footer.astro`. Despliegue automático en Vercel.
