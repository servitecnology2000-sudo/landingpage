# SERVITECH - Estado del Proyecto y Memoria del Agente

## 🚀 Arquitectura Actual del Ecosistema
- **Frontend:** Landing Page moderna y responsiva desplegada en Vercel (https://landingpage-opal-iota.vercel.app/).
- **Estilos:** Tailwind CSS con diseño de tarjetas asimétricas estilo "Bento Grid" (2 tarjetas destacadas arriba, 3 medianas abajo) en la sección de servicios.
- **Base de Datos & Storage:** Proyecto activo en Supabase conectado (ID de referencia: `mivsnmvupahgbrjfdyhl`).
- **Tabla de Inventario:** `repuestos_productos` (Campos implementados: id, sku, titulo, slug, descripcion, categoria, compatibilidad, precio_venta, precio_costo, estado, stock_disponible, imagenes_urls, seo_title, seo_description, keywords, creado_en).
- **Almacenamiento de Imágenes:** Bucket público en Supabase Storage llamado `imagenes-repuestos`.

## 🛠️ Rutas y Módulos Activos
1. **Ruta Pública (`/`):** Landing page principal. Incluye secciones: Hero (con enfoque After Office/Soporte Fuera de Oficina, sin imagen de reloj y con frase de certificación destacada), Servicios Estrella (Bento Grid) y Repuestos y Componentes (Tienda dinámica conectada a Supabase con micro-carruseles de hasta 3 fotos).
2. **Ruta Administrativa Privada (`/admin`):** Panel de control autogestionable y operativo para operaciones CRUD (Crear, Leer, Actualizar, Eliminar) de repuestos, carga múltiple de imágenes y automatización de Slugs y SEO.

## 🎨 Lineamientos de Diseño y UX Aprobados
- **Imágenes de Servicios:** Estilo "Mockups Flotantes" tridimensionales con position absolute, overflow visible, sombras (drop-shadow) y transiciones suaves en hover (translateY).
- **Protección de Texto:** Ancho máximo restringido (max-w) en las descripciones de servicios para evitar solapamientos con las imágenes.
- **SEO Semántico:** Títulos y meta-descripciones inyectados dinámicamente en el <head> por cada producto desde la base de datos.

## 📋 Regla de Actualización Obligatoria para el Agente
- CADA VEZ que realice un cambio, actualización de código, refactorización o despliegue en este proyecto, DEBO actualizar inmediatamente este archivo 'agent.md' antes de finalizar la tarea, registrando los cambios en un historial de versiones al final del documento.

## 🕒 Historial de Versiones
- **2026-07-12:** Creación inicial del archivo de memoria del agente.
