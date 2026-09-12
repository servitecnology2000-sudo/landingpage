import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Cumplimiento Normativo Ley N° 21.719, GDPR, SII y Términos Comerciales', () => {
  const rootDir = process.cwd();

  describe('Política de Privacidad (src/pages/privacidad.astro)', () => {
    const privacidadPath = path.join(rootDir, 'src/pages/privacidad.astro');
    const content = fs.readFileSync(privacidadPath, 'utf-8');

    it('debe existir el archivo src/pages/privacidad.astro', () => {
      expect(fs.existsSync(privacidadPath)).toBe(true);
    });

    it('debe consagrar expresamente la Ley N° 21.719 de Protección de Datos Personales', () => {
      expect(content).toContain('Ley N° 21.719');
      expect(content).toContain('Protección de Datos');
    });

    it('debe detallar el catálogo completo de Derechos ARCOP (Acceso, Rectificación, Cancelación, Oposición, Portabilidad)', () => {
      expect(content).toContain('Derechos ARCOP');
      expect(content).toContain('Derecho de Acceso');
      expect(content).toContain('Derecho de Rectificación');
      expect(content).toContain('Derecho de Cancelación');
      expect(content).toContain('Derecho de Oposición');
      expect(content).toContain('Derecho de Portabilidad');
    });

    it('debe armonizar la cancelación con el Código Tributario Art. 17 del SII (reserva por 6 años)', () => {
      expect(content).toContain('Código Tributario');
      expect(content).toContain('6 años');
      expect(content).toContain('Servicio de Impuestos Internos');
    });

    it('debe transparentar el procesamiento seguro con Mercado Pago sin almacenamiento de tarjetas (PCI-DSS)', () => {
      expect(content).toContain('Mercado Pago');
      expect(content).toContain('PCI-DSS');
      expect(content).toMatch(/NO almacena/i);
    });

    it('debe detallar los proveedores cloud internacionales (Vercel, Supabase, Google)', () => {
      expect(content).toContain('Vercel');
      expect(content).toContain('Supabase');
      expect(content).toContain('Google');
    });

    it('debe fijar plazo legal de respuesta de 15 días hábiles y notificación de brechas en 72 horas', () => {
      expect(content).toContain('15 días hábiles');
      expect(content).toContain('72 horas');
      expect(content).toContain('privacidad@servitecnology.com');
    });
  });

  describe('Términos y Condiciones Comerciales (src/pages/terminos.astro)', () => {
    const terminosPath = path.join(rootDir, 'src/pages/terminos.astro');
    const content = fs.readFileSync(terminosPath, 'utf-8');

    it('debe existir el archivo src/pages/terminos.astro', () => {
      expect(fs.existsSync(terminosPath)).toBe(true);
    });

    it('debe consagrar la Garantía Legal de 6 Meses conforme a la Ley N° 21.398 Pro-Consumidor', () => {
      expect(content).toContain('Ley N° 21.398');
      expect(content).toContain('6 meses');
      expect(content).toContain('Reparación Gratuita');
      expect(content).toContain('Reposición del Repuesto');
      expect(content).toContain('Devolución del Dinero');
    });

    it('debe incluir Mercado Pago (Checkout Pro, crédito y débito) y Transferencia BancoEstado con reserva de 2 horas', () => {
      expect(content).toContain('Mercado Pago');
      expect(content).toContain('BancoEstado');
      expect(content).toContain('ST-2026');
      expect(content).toContain('2 horas');
    });

    it('debe regular las modalidades de Retiro en Oficina Técnica y Despacho por pagar (Starken / Chilexpress)', () => {
      expect(content).toContain('Retiro en Oficina Técnica');
      expect(content).toContain('Starken');
      expect(content).toContain('Chilexpress');
      expect(content).toContain('Cobro en Destino');
    });

    it('debe establecer la obligatoriedad del RUT para facturación electrónica legal ante el SII', () => {
      expect(content).toContain('Factura Electrónica');
      expect(content).toContain('RUT');
      expect(content).toContain('Servicio de Impuestos Internos');
    });

    it('debe contemplar el Derecho a Retracto conforme a la Ley N° 19.496', () => {
      expect(content).toContain('Derecho a Retracto');
      expect(content).toContain('10 días');
    });
  });

  describe('Integración de Consentimiento en Checkout (src/pages/checkout.astro)', () => {
    const checkoutPath = path.join(rootDir, 'src/pages/checkout.astro');
    const content = fs.readFileSync(checkoutPath, 'utf-8');

    it('debe incluir el checkbox de aceptación de términos y privacidad con ID accept-terms-checkbox', () => {
      expect(content).toContain('id="accept-terms-checkbox"');
      expect(content).toContain('id="terms-container"');
      expect(content).toContain('id="terms-error-msg"');
    });

    it('debe enlazar a /terminos y /privacidad citando la Ley N° 21.719', () => {
      expect(content).toContain('href="/terminos"');
      expect(content).toContain('href="/privacidad"');
      expect(content).toContain('Ley N° 21.719');
    });

    it('debe validar la aceptación obligatoria antes de continuar al pago en el script del cliente', () => {
      expect(content).toContain('acceptTermsCheckbox?.checked');
      expect(content).toContain('Consentimiento Requerido');
    });

    it('debe registrar flags de consentimiento terms_accepted y privacy_accepted en el payload', () => {
      expect(content).toContain('terms_accepted: true');
      expect(content).toContain('privacy_accepted: true');
    });
  });

  describe('Portal del Cliente y Portabilidad ARCOP (src/pages/mis-pedidos.astro)', () => {
    const misPedidosPath = path.join(rootDir, 'src/pages/mis-pedidos.astro');
    const content = fs.readFileSync(misPedidosPath, 'utf-8');

    it('debe contar con el botón de exportación de datos con ID btn-export-data', () => {
      expect(content).toContain('id="btn-export-data"');
      expect(content).toContain('Exportar mis Datos (JSON)');
    });

    it('debe generar la descarga en formato JSON con metadatos y nombre servitecnology-mis-datos', () => {
      expect(content).toContain('servitecnology-mis-datos');
      expect(content).toContain('application/json');
      expect(content).toContain('exportCustomerData');
    });

    it('debe proveer un enlace directo para solicitar Derechos ARCOP a privacidad@servitecnology.com', () => {
      expect(content).toContain('mailto:privacidad@servitecnology.com?subject=Solicitud%20Derechos%20ARCOP%20Ley%2021719');
    });
  });
});
