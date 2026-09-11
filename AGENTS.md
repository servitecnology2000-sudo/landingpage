## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)


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
- CADA VEZ que realice un cambio, actualización de código, refactorización o despliegue en este proyecto, DEBO actualizar inmediatamente el archivo 'CHANGELOG.md' antes de finalizar la tarea, registrando los cambios en el historial de versiones.