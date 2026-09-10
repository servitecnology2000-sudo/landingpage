# Hoja de Ruta E-commerce Servitecnology (Single Source of Truth)

Documento oficial de arquitectura, control y evolución de la plataforma de comercio electrónico de **SERVITECNOLOGY**.

---

## 🛑 REGLAS DE CONTENCIÓN OBLIGATORIAS (FASE 1)

Para garantizar estabilidad operativa, seguridad tributaria y velocidad de despliegue, aplican de manera estricta las siguientes directrices:

1. **NO integrar pasarelas de pago automatizadas (Webpay Plus / MercadoPago / Flow) en la Fase 1:**
   - La Fase 1 opera **exclusivamente mediante Transferencia Bancaria Directa**, con validación manual y soporte por WhatsApp/correo.
2. **NO implementar verificación de correo por OTP en la Fase 1:**
   - La validación del correo se realiza mediante **confirmación visual obligatoria por Pop-up Amarillo (Yellow Warning Box)** antes de registrar el pedido.
3. **NO pedir el RUT en el registro de cuenta simple:**
   - El RUT se solicita **única y exclusivamente en el Checkout** para la emisión obligatoria de Factura Electrónica conforme a las directrices del Servicio de Impuestos Internos (SII).
4. **NO alterar el buscador multicriterio existente en el catálogo:**
   - El motor de búsqueda inteligente multicriterio (Vanilla JS) en `/ecommerce` (`/repuestos`) permanece intacto para mantener el rendimiento y experiencia de filtrado instantáneo.

---

## 🗺️ Fases del Proyecto E-commerce

### FASE 1: Transferencia Bancaria + Cobertura Región Metropolitana (ESTADO: COMPLETADA ✅)
* **Navegación & UI Global:**
  - Renombramiento de la ruta y menú de `/repuestos` a **"Ecommerce"** en toda la plataforma.
  - Posicionamiento del botón directo **"Ecommerce"** en la barra principal del Header, ubicado al lado del botón de YouTube.
* **Base de Datos & Seguridad Supabase:**
  - Creación de tabla `customers` (id, full_name, email, phone, rut, created_at).
  - Creación de tabla `orders` con identificadores human-readable formato `ST-2026-XXXX`, `items` (JSONB), `delivery_type` ('retiro' / 'delivery_rm'), `commune`, `shipping_cost`, `total_amount`, `payment_status` ('pendiente', 'en_revision', 'aprobado'), `order_status` ('preparacion', 'completado', 'cancelado').
  - Activación estricta de **Row Level Security (RLS)** y políticas de acceso.
* **Carrito & Checkout:**
  - Selección entre *Retiro en Oficina ($0)* y *Despacho a Domicilio RM* con selector de comunas y tarificación fija automática.
  - Formulario de datos con RUT obligatorio y aviso legal del SII: *"Todas las compras incluyen Factura Electrónica de acuerdo a la normativa del SII"*.
  - Lógica de reserva de stock temporal por 2 horas para pedidos iniciados.
  - **Pop-up de Verificación Visual Amarillo (Yellow Warning Box):** Modal obligatoria con resplandor amarillo de alta visibilidad para que el cliente valide su correo electrónico antes de generar el pedido.
* **Instrucciones Bancarias & Post-Checkout:**
  - Vista de confirmación con el código `ST-2026-XXXX`, datos bancarios oficiales para transferencia y recordatorio de indicar el ID en el asunto.
  - Cláusulas de tratamiento exclusivo de datos para facturación/despacho en `/terminos` y `/privacidad`.

---

### FASE 2: Automatización Transaccional, Resend/OTP y Panel de Órdenes (PRÓXIMAMENTE ⏳)
* Integración de API de correo transaccional (Resend) para envío automático de comprobantes de orden e instrucciones bancarias al cliente.
* Panel administrativo en `/meson-servitecnology-st` para gestión de pedidos: cambio de estado de pago ('en_revision' -> 'aprobado'), visualización de facturas y liberación automática de stock tras vencimiento de 2 horas.
* Implementación de autenticación de clientes con OTP por correo (One-Time Password) para consulta de historial de compras sin contraseñas.

---

### FASE 3: Pasarelas Automatizadas y Envíos a Todo Chile (PRÓXIMAMENTE ⏳)
* Integración de pasarelas de pago con tarjeta de crédito/débito (Webpay Plus Transbank / MercadoPago Checkout Pro) con webhook de conciliación instantánea.
* Cotización y generación automática de órdenes de transporte mediante API Chilexpress / Starken / Blue Express para envíos a todas las regiones del país.
* Trazabilidad en tiempo real con número de seguimiento y notificación SMS/WhatsApp.
