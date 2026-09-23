---
description: Directrices críticas de UI/UX, Astro 5, Tailwind CSS 4 y prohibición absoluta de alertas nativas
trigger: model_decision
---

# Reglas de Frontend, Componentes y UI/UX

Este proyecto utiliza **Astro 5** (SSR con adaptador `@astrojs/vercel`) y **Tailwind CSS 4** con una estética oscura corporativa de alto rendimiento e impacto visual.

---

## 1. Principios Clave de Diseño y Estética

- **Paleta de Colores y Modo Oscuro:** Fondo ultra-oscuro de alto contraste (`#121215`, `bg-zinc-950`) con acentos fluorescentes (`brand-green`, `brand-cyan`, esmeralda y ámbar).
- **Tipografía:** Fuentes modernas de Google Fonts (`Outfit` para encabezados e `Inter` para cuerpos de texto). Nunca depender de las fuentes por defecto del navegador.
- **Microinteracciones:** Transiciones fluidas en hover (`transition-all duration-300`), desenfoques de fondo (`backdrop-blur-md`), carruseles táctiles y marquesinas continuas.
- **Microdatos SEO:** Implementar schema `Product` (Schema.org en JSON-LD) en fichas de producto (`/repuesto/[slug]`), meta descriptions precisas, etiquetas canonical y títulos dinámicos.

---

## 2. 🚨 REGLA MANDATORIA: CERO ALERTS NATIVOS Y MODALES MODERNOS

> [!CAUTION]
> **PROHIBICIÓN ESTRICTA DE ALERTAS NATIVAS:**
> Está **TERMINANTEMENTE PROHIBIDO** usar las funciones nativas arcaicas del navegador:
> - ❌ `window.alert(...)`
> - ❌ `window.confirm(...)`
> - ❌ `window.prompt(...)`
> Su uso degrada la experiencia premium del SaaS y genera rechazo visual en el usuario.

### Modales y Toasts Oficiales del Sistema:
Toda confirmación de acción, advertencia o notificación DEBE invocar el sistema global de modales oscuros con glassmorphism:

1. **Modales de Confirmación Bloqueante:**
   ```typescript
   const confirmado = await window.showAdminConfirm({
     title: '¿Confirmar despacho de orden?',
     message: 'Esta acción notificará al cliente y actualizará el stock.',
     type: 'warning', // 'info' | 'warning' | 'danger' | 'success'
     confirmText: 'Sí, despachar',
     cancelText: 'Cancelar'
   });
   if (!confirmado) return;
   ```

2. **Modales de Alerta Informativa:**
   ```typescript
   await window.showAdminAlert({
     title: 'Operación no permitida',
     message: 'No es posible cancelar una orden que ya fue despachada.',
     type: 'danger'
   });
   ```

3. **Notificaciones Toast Rápidas (No bloqueantes):**
   ```typescript
   window.showAdminToast('Cliente guardado exitosamente', 'success');
   // tipos: 'success' | 'error' | 'warning' | 'info'
   ```

### Lineamientos Estéticos de los Modales:
- **Telón de fondo:** `backdrop-blur-md bg-black/80`.
- **Cuerpo del modal:** Fondo `#121215` / `bg-zinc-950`, bordes redondeados (`rounded-2xl`), borde semitransparente (`border border-white/10` o color semántico).
- **Accesibilidad:** Cierre con tecla `Escape` y clic fuera en el backdrop.

---

## 3. Trampas Comunes y Gotchas Evitados (Lessons Learned)

- **Anti-patrón (Uso de `confirm()` rápido):** Agregar un `if (confirm('¿Desea eliminar?'))` en un botón administrativo.
  - **Solución correcta:** Migrar a `await window.showAdminConfirm(...)` para mantener la inmersión visual.
- **Anti-patrón (Tailwind CSS 3 class nesting obsoleto):** Intentar usar `@apply` anidados complejos no soportados por Vite en Tailwind 4.
  - **Solución correcta:** Usar utilidades directas y tokens de CSS variables definidos en la configuración de Tailwind 4.
- **Anti-patrón (Hydration mismatches en Astro SSR):** Manipular el DOM antes de que los componentes de isla estén hidratados.
  - **Solución correcta:** Encapsular interactividad en scripts con eventos `DOMContentLoaded` o `astro:page-load`.

---

## 4. Verificaciones Obligatorias
- [ ] ¿Se verificó que no exista ningún `window.alert`, `window.confirm` ni `window.prompt` en el código?
- [ ] ¿Los botones e interactividades tienen IDs descriptivos y accesibles?
- [ ] ¿La página cuenta con etiquetas meta, canonical y estructura semántica H1-H3?
