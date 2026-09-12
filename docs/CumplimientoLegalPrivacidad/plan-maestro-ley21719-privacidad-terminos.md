# Plan Maestro: Cumplimiento Normativo Ley N° 21.719 de Protección de Datos Personales, GDPR y Términos Comerciales del E-commerce

**Proyecto:** SERVITECNOLOGY E-commerce & SaaS  
**Módulo:** Legal, Privacidad, Checkout & Portal de Clientes  
**Fecha de Creación:** 12 de Septiembre de 2026  
**Ubicación del Documento:** `docs/CumplimientoLegalPrivacidad/plan-maestro-ley21719-privacidad-terminos.md`  
**Estado:** Propuesto / Listo para Ejecución  

---

## 1. Justificación y Diagnóstico Regulatorio

### 1.1. La Nueva Ley N° 21.719 de Protección de Datos Personales en Chile
Chile ha promulgado una profunda reforma a la Ley N° 19.628 mediante la **Ley N° 21.719 sobre Protección de Datos Personales**, alineando por primera vez a la legislación chilena con el **GDPR europeo (Reglamento General de Protección de Datos)** y los más altos estándares globales de la OCDE.

Entre sus mandatos obligatorios para plataformas digitales destacan:
1. **Principio de Licitud y Fin del Consentimiento Tácito:** El tratamiento de datos debe basarse en un consentimiento **libre, previo, expreso, informado e inequívoco**, o en la necesidad para la ejecución de un contrato (compraventa) o cumplimiento de una obligación legal (tributaria).
2. **Creación de la Agencia de Protección de Datos Personales (ANPD):** Organismo autónomo facultado para fiscalizar, ordenar auditorías técnicas y aplicar multas que pueden alcanzar hasta **10.000 y 20.000 UTM (o hasta el 4% de los ingresos anuales)** para faltas gravísimas.
3. **Consagración de los Derechos ARCOP:**
   - **Acceso:** Derecho a conocer qué datos se recopilan y almacenan.
   - **Rectificación:** Derecho a corregir información inexacta o desactualizada.
   - **Cancelación / Supresión:** Derecho al borrado de datos cuando no exista obligación legal de conservación.
   - **Oposición:** Derecho a negarse al uso de sus datos para fines analíticos o publicitarios.
   - **Portabilidad:** Derecho a obtener una copia digital de sus datos en formato estructurado, genérico y legible por máquina (ej. JSON/CSV).
4. **Transferencia Internacional de Datos:** Regulación de proveedores cloud extranjeros (Vercel, Supabase en AWS, pasarela Mercado Pago), exigiendo estándares de seguridad verificables (cifrado TLS 1.3, SOC 2, ISO 27001).

### 1.2. Armonización con la Normativa Tributaria del SII (Código Tributario Art. 17)
En el comercio electrónico chileno existe una aparente tensión entre el "derecho al olvido/supresión" y las exigencias del **Servicio de Impuestos Internos (SII)**.  
- La Ley N° 21.719 establece expresamente que la supresión de datos no procede cuando exista una **obligación legal de conservación**.
- El **Artículo 17 del Código Tributario** exige que toda empresa conserve los libros de contabilidad, respaldos, boletas y facturas electrónicas timbradas por un plazo mínimo de **6 años**.
- Por lo tanto, nuestra Política de Privacidad debe transparentar que los datos de facturación (RUT, Razón Social, monto, detalle de ítems) se conservan por 6 años por mandato del SII, disociando los datos de perfil personal para marketing o contacto.

### 1.3. Ley N° 19.496 y Ley N° 21.398 (Ley Pro-Consumidor - SERNAC)
- **Garantía Legal de 6 Meses:** La Ley N° 21.398 amplió la garantía legal de 3 a **6 meses** para la libre elección del consumidor (reparación gratuita, reposición o devolución del dinero ante fallas de fábrica).
- **Transparencia en el Comercio Electrónico:** Es obligatorio informar de forma clara los costos de despacho (flete por pagar), tiempos estimados y los términos de los medios de pago (Mercado Pago y Transferencia).

---

## 2. Diagnóstico del Estado Actual del Proyecto (Gap Analysis)

| Módulo / Página | Estado Actual | Brecha Identificada | Acción Requerida |
| :--- | :--- | :--- | :--- |
| **`src/pages/privacidad.astro`** | Cita únicamente la antigua Ley 19.628 de 1999; redactada para la "Fase 1". | No menciona la Ley 21.719, derechos ARCOP, Mercado Pago, Google OAuth, Supabase ni plazos SII. | Reescribir integralmente con estructura legal profesional y moderna adaptada a la Ley 21.719 y GDPR. |
| **`src/pages/terminos.astro`** | Declara *"Modalidad de Pago: Transferencia Bancaria exclusiva (Fase 1)"*. | No incluye Mercado Pago, tarjetas de crédito/débito, despachos nacionales por pagar (Starken/Chilexpress) ni garantía legal de 6 meses de la Ley 21.398. | Actualizar integralmente a la realidad e-commerce vigente del SaaS. |
| **`src/pages/checkout.astro`** | No posee checkbox obligatorio de aceptación de términos antes de comprar. | Riesgo de nulidad de consentimiento según Ley 21.719 y SERNAC. El usuario puede pagar sin aceptar expresamente las políticas. | Implementar checkbox obligatorio y bloqueo del botón de pago si no está marcado. |
| **`src/pages/mis-pedidos.astro`** | No dispone de sección de privacidad o portabilidad de datos. | Falta mecanismo para ejercer el Derecho de Portabilidad (Art. 8 Ley 21.719). | Añadir botón "Exportar mis Datos (JSON)" y canal de contacto legal para derechos ARCOP. |

---

## 3. Plan de Acción Detallado por Componentes

### Componente 1: Reforma Integral de la Política de Privacidad (`src/pages/privacidad.astro`)
Se redactará un documento legal riguroso y transparente con diseño dark glassmorphic, organizado en las siguientes cláusulas:
1. **Identificación del Responsable del Tratamiento:**
   - Razón Social: SERVITECNOLOGY SpA.
   - Domicilio: Santiago Centro, Región Metropolitana, Chile.
   - Canales oficiales de privacidad: `contacto@servitecnology.com` / `privacidad@servitecnology.com`.
2. **Marco Normativo:**
   - Cumplimiento de la **Ley N° 21.719 sobre Protección de Datos Personales de Chile**, Ley N° 19.628, principios de la OCDE y estándares GDPR para usuarios internacionales.
3. **Bases de Licitud y Datos Recopilados:**
   - *Finalidad Contractual:* Nombre, email, teléfono/WhatsApp, dirección de despacho para procesar compras y envíos.
   - *Finalidad Tributaria Obligatoria:* RUT (persona natural o jurídica) requerido por el SII para emisión de boleta o factura electrónica timbrada.
   - *Finalidad de Seguridad y Autenticación:* Google OAuth ID y token de sesión.
   - *Analítica Interna Anónima:* Conteo agregado de vistas de páginas y clics (sin perfilamiento publicitario invasivo ni cookies de terceros).
4. **Tratamiento de Pagos y Seguridad Financiera:**
   - Declaración expresa de que SERVITECNOLOGY **NO almacena números de tarjetas de crédito, débito ni códigos de seguridad (CVV)**. Los pagos son procesados directamente por Mercado Pago Chile bajo certificación **PCI-DSS Nivel 1**.
5. **Proveedores Tecnológicos y Transferencia Internacional de Datos:**
   - Hosting e infraestructura edge: Vercel Inc. (Certificación SOC 2, cifrado en tránsito TLS 1.3).
   - Base de datos y autenticación: Supabase Inc. / AWS (Cifrado AES-256 en reposo, políticas Row Level Security).
   - Autenticación OAuth: Google LLC.
6. **Catálogo de Derechos ARCOP y Procedimiento para su Ejercicio:**
   - Detalle de cómo solicitar Acceso, Rectificación, Cancelación, Oposición y Portabilidad.
   - Plazo legal de respuesta: Máximo 15 días hábiles.
7. **Período de Conservación de Datos:**
   - Datos contables/fiscales: 6 años por mandato legal del Código Tributario (Art. 17).
   - Datos de contacto y perfil: Conservados mientras la cuenta esté activa o hasta que el titular solicite su eliminación.
8. **Seguridad y Notificación de Brechas:**
   - Compromiso de notificación dentro de las 72 horas ante incidentes de seguridad que comprometan datos personales.

---

### Componente 2: Reforma Integral de Términos y Condiciones (`src/pages/terminos.astro`)
Se actualizará el contrato de adhesión de la tienda virtual, reflejando el ecosistema tecnológico actual:
1. **Ámbito de Aplicación:** Venta online de componentes, repuestos informáticos y servicios técnicos en Chile continental.
2. **Modalidades de Pago Habilitadas:**
   - **Mercado Pago Chile (Checkout Pro):** Tarjetas de crédito (hasta en cuotas), tarjetas de débito bancarias (Redcompra / Webpay) y saldo en cuenta Mercado Pago.
   - **Transferencia Bancaria Directa:** Cuenta corriente BancoEstado de SERVITECNOLOGY SpA, con sistema de **reserva de stock por 2 horas** y conciliación manual mediante glosa obligatoria con código `ST-2026-XXXX`.
3. **Modalidades de Despacho y Entrega:**
   - **Retiro en Sucursal ($0 CLP):** Oficina técnica en Santiago Centro, previa acreditación de pago y coordinación de horario. Exigencia de exhibición de cédula de identidad y código de orden.
   - **Envíos por Pagar a Todo Chile:** Despacho vía Starken o Chilexpress (cobro en destino). Notificación automática con empresa de transporte, número de seguimiento (tracking) y constancia de flete.
4. **Facturación Electrónica SII:** Emisión automatizada de Boleta o Factura Electrónica. Obligatoriedad del cliente de proporcionar un RUT válido para timbraje tributario.
5. **Garantía Legal de 6 Meses (Ley N° 21.398 Pro-Consumidor):**
   - Garantía legal de 6 meses ante fallas técnicas o defectos de fábrica: derecho a reparación técnica sin costo, cambio de producto o devolución íntegra del dinero.
   - Exclusiones claras: Daño físico provocado por manipulación negligente, sobretensión eléctrica o incompatibilidad técnica no atribuible a fallas del componente.
6. **Derecho a Retracto en Compras Online:** Conforme al Art. 3 bis letra b de la Ley N° 19.496.
7. **Condiciones de Uso del Portal 'Mis Pedidos':** Acceso protegido mediante Google OAuth y responsabilidad en el resguardo de credenciales.

---

### Componente 3: Ajustes de Software en el Checkout (`src/pages/checkout.astro`)
1. **Incorporación de la Casilla de Aceptación:**
   - Se insertará un componente interactivo justo antes del botón `#btn-proceed-checkout`.
   - Texto del checkbox:
     > *"He leído y acepto los [Términos y Condiciones](/terminos) y la [Política de Privacidad](/privacidad) conforme a la Ley N° 21.719 y normativa del SII."*
2. **Lógica de Validación en JavaScript:**
   - Impedir que el cliente continúe a la selección de medio de pago o modal de Google si el checkbox no está marcado.
   - Mostrar un mensaje de alerta moderno en la interfaz (`terms-error-msg`) si el usuario intenta avanzar sin aceptar.
   - Persistir la aceptación del consentimiento en la sesión del pedido.

---

### Componente 4: Ajustes de Software en el Portal del Cliente (`src/pages/mis-pedidos.astro`)
1. **Herramienta de Portabilidad de Datos (Art. 8 Ley 21.719):**
   - En la vista autenticada de `/mis-pedidos`, incorporar un botón accesible: **"📥 Exportar mis Datos (JSON)"**.
   - Al pulsar el botón, el navegador genera y descarga un archivo `servitecnology-mis-datos.json` que incluye:
     - Nombre completo, email, RUT y teléfono registrado.
     - Historial de órdenes de compra con fechas, montos, ítems y estados logísticos.
2. **Canal de Ejercicio de Derechos ARCOP:**
   - Enlace directo al correo de privacidad con asunto preconfigurado: `mailto:privacidad@servitecnology.com?subject=Solicitud%20Derechos%20ARCOP%20Ley%2021719`.

---

## 4. Plan de Pruebas y Validación Técnica

1. **Pruebas Unitarias Automatizadas (Vitest):**
   - Verificar que el checkout valide la presencia del consentimiento de términos y privacidad.
   - Verificar que las URLs `/terminos` y `/privacidad` respondan con código HTTP 200 y contengan las palabras clave normativas (`Ley N° 21.719`, `ARCOP`, `Mercado Pago`, `SII`, `6 meses`).
2. **Compilación de Producción (`npm run build`):**
   - Comprobar que no existan errores de sintaxis, componentes rotos o incompatibilidades con el adaptador `@astrojs/vercel`.
3. **Actualización de Documentación:**
   - Registrar la actualización completa en [`CHANGELOG.md`](file:///home/angel/Developer/landingpage/CHANGELOG.md) en orden cronológico inverso.
4. **Git Commit & Push:**
   - Versionar y subir a la rama `main`.
