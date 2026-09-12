# Plan Maestro: Panel de Administración (Fase 1 - Corto Plazo)

Este documento detalla la arquitectura, interfaz y lógica necesaria para construir los tres módulos administrativos principales solicitados para el área protegida `/meson-servitecnology-st`.

## 1. Arquitectura y Tecnologías
- **Framework:** Astro 5 (SSR).
- **Estilos:** Tailwind CSS 4, manteniendo la paleta oscura y acentos `brand-green` / ámbar para la UI administrativa.
- **Base de Datos:** Supabase Client (usando SSR para obtener datos de forma segura en el servidor antes de renderizar la vista).
- **Seguridad:** Todas las rutas estarán protegidas verificando la sesión/cookie activa del administrador o la clave maestra (`ADMIN_SECRET`), garantizando que los datos sensibles no se expongan en el cliente.

---

## 2. Estructura de Rutas y Navegación

Se crearán las siguientes rutas dentro de `src/pages/meson-servitecnology-st/`:
1. `/pedidos/index.astro` (Gestor de Pedidos)
2. `/clientes/index.astro` (Gestor de Clientes)
3. `/metricas/index.astro` (Panel de Métricas y Ventas)

Adicionalmente, se actualizará el layout principal del panel de administración (`src/pages/meson-servitecnology-st/index.astro` o su componente de Sidebar) para incluir enlaces directos a estas nuevas secciones junto al "Inventario" y "Galería".

---

## 3. Detalle de Módulos

### 3.1 Gestor de Pedidos (`/meson-servitecnology-st/pedidos`)
**Objetivo:** Centralizar el estado de todas las órdenes para logística y despacho.

*   **Origen de Datos:** Tabla `orders` ordenados por `created_at` descendente.
*   **Interfaz de Usuario (UI):**
    *   Tabla de datos con diseño limpio y responsivo.
    *   **Columnas:** 
        *   Identificador (`ST-2026-XXXX`).
        *   Fecha de la orden.
        *   Datos del Cliente (Nombre / RUT).
        *   Total (Formateado en CLP).
        *   Estado de Pago (Badges: Pendiente, Aprobado, Cancelado).
        *   Estado de Envío (Preparación, Despachado, Entregado).
    *   **Filtros Rapidos:** Botones tipo "pills" para ver rápidamente "Pendientes de Pago", "Para Despacho", "Completados".
*   **Interacciones & Lógica:**
    *   Al hacer clic en un pedido, se abre un modal o sección de detalles mostrando los repuestos comprados.
    *   **Logística de Envío Nacional:** Si el pedido se marca como "Despachado", aparecerá un input obligatorio para ingresar el **Número de Seguimiento** (Starken, Chilexpress, CorreosChile) y la empresa de transporte, el cual se actualizará en Supabase.
    *   **Logística de Retiro en Bodega:** Si el pedido tiene entrega tipo "retiro", se habilitará un botón **"Marcar Listo para Retiro"**. Al presionarlo, el estado se actualizará y el sistema enviará automáticamente un correo electrónico al cliente notificando que su compra ya está disponible para ser retirada en la sucursal.

### 3.2 Gestor de Clientes (`/meson-servitecnology-st/clientes`)
**Objetivo:** Directorio CRM con funcionalidad **CRUD completo** (Crear, Leer, Actualizar, Eliminar) para unificar a todos los compradores.

*   **Origen de Datos y Captura Automática:** Tabla `customers` cruzada lógicamente con la tabla `orders` para totalizar compras. El sistema alimentará este directorio de dos formas:
    1.  **Clientes Registrados:** Usuarios que inician sesión formalmente (ej. Google, Email/Password mediante Supabase Auth).
    2.  **Clientes Invitados (Guest):** Usuarios que compran sin crear cuenta, pero cuyos datos ingresados en la Sección 1 (Método de Entrega) y Sección 2 (Datos del Comprador & Facturación SII) del `/checkout` serán guardados automáticamente en la tabla `customers` al procesarse la orden.
*   **Interfaz de Usuario (UI):**
    *   Listado de clientes tipo tabla.
    *   **Columnas:**
        *   RUT.
        *   Nombre / Razón Social.
        *   Teléfono Móvil (Validado).
        *   Email.
        *   Tipo (Registrado vs Invitado).
        *   **Total Comprado:** Suma del dinero gastado por este RUT/Email históricamente.
    *   **Acciones CRUD:** Botones por fila para "Editar", "Ver Detalles" y "Eliminar". Botón superior para "Nuevo Cliente".
*   **Interacciones & Lógica:**
    *   Buscador en tiempo real por RUT o Nombre.
    *   **Atajo Inteligente:** El número de teléfono será un botón que generará un enlace directo de WhatsApp Web (`wa.me/569XXXXXXX`) para contactar al cliente inmediatamente por soporte o dudas de despacho.
    *   **Modal Formulario (Create/Update):** Un modal que permita a los administradores crear un cliente manualmente o corregir los datos de facturación (RUT, giro, dirección) de un cliente existente si este cometió un error en el checkout.

### 3.3 Panel de Métricas / Ventas (`/meson-servitecnology-st/metricas`)
**Objetivo:** Entregar un resumen rápido del rendimiento financiero y comercial del sitio.

*   **Origen de Datos:** Tabla `orders` (Filtrando solo aquellas con pago `aprobado` del mes en curso).
*   **Interfaz de Usuario (UI):**
    *   **Tarjetas de KPIs (Indicadores Clave):**
        *   💰 Ingresos Totales del Mes (Ej: $1.450.000).
        *   💳 Ticket Promedio (Ej: $45.000 por orden).
        *   📦 Pedidos Exitosos (Ej: 32 pedidos este mes).
    *   **Reportes Visuales:**
        *   **Top Productos:** Una lista de los repuestos más vendidos del mes (se extrae iterando sobre la columna JSONB `items` de los pedidos aprobados). Mostrará miniatura, nombre y unidades vendidas.
*   **Interacciones & Lógica:**
    *   Todo se calcula mediante funciones reductoras en el servidor (Astro Server) en tiempo de ejecución, por lo que no se necesita modificar la base de datos, solo consultar y procesar.

---

## 4. Fases de Ejecución Recomendadas

Para implementar este plan de la forma más rápida y segura:

1. **Fase 1: Preparación Estructural**
   * Crear la barra de navegación lateral unificada para el administrador.
2. **Fase 2: Lectura de Datos (Read)**
   * Construir las páginas visuales de Pedidos, Clientes y Métricas.
   * Conectar `supabase.from('...')` en los frontmatter de Astro e imprimir las tablas y gráficos simples.
3. **Fase 3: Interacciones (Update)**
   * Añadir los endpoints API internos (ej. `/api/admin/pedidos/actualizar-estado.ts`) para manejar el guardado del número de seguimiento y el cambio de estados sin recargar toda la página.
4. **Fase 4: Pulido UX**
   * Añadir skeleton loaders, animaciones al cambiar los badges de estado y notificaciones Toast tipo "Pedido actualizado con éxito".

---

## 5. Índice de Planes de Implementación Detallados

Para mantener una ejecución ordenada y modular, cada fase cuenta con su especificación técnica exhaustiva:

1. **[Fase 1: Layout Administrativo Unificado & Gestor de Pedidos con Logística de Despacho](file:///home/angel/Developer/landingpage/docs/ModulosAdmin/fase-1-layout-y-pedidos.md)** (COMPLETADA Y CERTIFICADA ✅).
2. **[Fase 2: Gestor de Clientes & Directorio CRM](file:///home/angel/Developer/landingpage/docs/ModulosAdmin/fase-2-gestion-clientes.md)** (COMPLETADA Y CERTIFICADA ✅).
3. **[Fase 3: Panel de Métricas Financieras y Comerciales](file:///home/angel/Developer/landingpage/docs/ModulosAdmin/fase-3-metricas-kpis.md)** (COMPLETADA Y CERTIFICADA ✅).

