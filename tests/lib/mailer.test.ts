import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCourierTrackingUrl,
  sendOrderShippedEmail,
  sendOrderReadyForPickupEmail,
  sendOrderDeliveredEmail,
  transporter
} from '../../src/lib/mailer';

describe('Pruebas Unitarias de Notificaciones y Correos (src/lib/mailer.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCourierTrackingUrl()', () => {
    it('debe generar enlace directo de seguimiento para Starken', () => {
      const url = getCourierTrackingUrl('Starken', '987654321');
      expect(url).toBe('https://www.starken.cl/seguimiento?codigo=987654321');
    });

    it('debe generar enlace para Chilexpress', () => {
      const url = getCourierTrackingUrl('Chilexpress', '123456');
      expect(url).toBe('https://www.chilexpress.cl/');
    });

    it('debe generar enlace para CorreosChile', () => {
      const url = getCourierTrackingUrl('Correos de Chile', 'CL123456');
      expect(url).toBe('https://www.correos.cl/');
    });

    it('debe generar enlace para Blue Express', () => {
      const url = getCourierTrackingUrl('Blue Express', 'BX-999');
      expect(url).toBe('https://www.bluex.cl/');
    });

    it('debe generar enlace fallback para otros transportistas', () => {
      const url = getCourierTrackingUrl('Transportes Varmontt', 'VM-1234');
      expect(url).toContain('https://www.google.com/search?q=seguimiento');
      expect(url).toContain('VM-1234');
    });
  });

  describe('sendOrderShippedEmail()', () => {
    it('debe enviar correo de despacho con datos correctos y llamar a transporter.sendMail', async () => {
      const sendMailSpy = vi.spyOn(transporter, 'sendMail').mockResolvedValueOnce({ messageId: 'test-shipped-id' } as any);

      const result = await sendOrderShippedEmail({
        orderId: 'ST-2026-TEST',
        customerName: 'Juan Pérez',
        customerEmail: 'juan@example.com',
        courier: 'Starken',
        trackingNumber: '99887766',
        shippingAddress: 'Av. Libertador 1234',
        commune: 'Rancagua',
        items: [
          { sku: 'REP-001', titulo: 'Pantalla iPhone 13 OLED', precio_venta: 45000, cantidad: 1 }
        ]
      });

      expect(result).toBe(true);
      expect(sendMailSpy).toHaveBeenCalledTimes(1);

      const mailOptions = sendMailSpy.mock.calls[0][0];
      expect(mailOptions.to).toBe('juan@example.com');
      expect(mailOptions.subject).toContain('ST-2026-TEST');
      expect(mailOptions.subject).toContain('Starken');
      expect(mailOptions.html).toContain('99887766');
      expect(mailOptions.html).toContain('Starken');
      expect(mailOptions.html).toContain('Pantalla iPhone 13 OLED');
      expect(mailOptions.html).toContain('Rancagua');
    });
  });

  describe('sendOrderReadyForPickupEmail()', () => {
    it('debe enviar correo de retiro con datos del taller en Santiago Centro', async () => {
      const sendMailSpy = vi.spyOn(transporter, 'sendMail').mockResolvedValueOnce({ messageId: 'test-pickup-id' } as any);

      const result = await sendOrderReadyForPickupEmail({
        orderId: 'ST-2026-RETIRO',
        customerName: 'María González',
        customerEmail: 'maria@example.com',
        items: [
          { sku: 'REP-002', titulo: 'Batería Samsung S21 Ultra', precio_venta: 28000, cantidad: 2 }
        ]
      });

      expect(result).toBe(true);
      expect(sendMailSpy).toHaveBeenCalledTimes(1);

      const mailOptions = sendMailSpy.mock.calls[0][0];
      expect(mailOptions.to).toBe('maria@example.com');
      expect(mailOptions.subject).toContain('ST-2026-RETIRO');
      expect(mailOptions.subject).toContain('listo para retiro');
      expect(mailOptions.html).toContain('Santiago Centro');
      expect(mailOptions.html).toContain('Batería Samsung S21 Ultra');
      expect(mailOptions.html).toContain('ST-2026-RETIRO');
    });
  });

  describe('sendOrderDeliveredEmail()', () => {
    it('debe enviar correo de entrega exitosa con constancia de seguridad y notas de taller', async () => {
      const sendMailSpy = vi.spyOn(transporter, 'sendMail').mockResolvedValueOnce({ messageId: 'test-delivered-id' } as any);

      const result = await sendOrderDeliveredEmail({
        orderId: 'ST-2026-9770',
        customerName: 'Carlos Silva',
        customerEmail: 'carlos@example.com',
        deliveryType: 'retiro',
        adminNotes: 'Se entregó a apoderado con carnet',
        deliveredAt: '2026-09-12T15:30:00Z',
        items: [
          { sku: 'HDMI-001', titulo: 'HDMI Inalámbrico Full HD 1080P', precio_venta: 27990, cantidad: 1 }
        ]
      });

      expect(result).toBe(true);
      expect(sendMailSpy).toHaveBeenCalledTimes(1);

      const mailOptions = sendMailSpy.mock.calls[0][0];
      expect(mailOptions.to).toBe('carlos@example.com');
      expect(mailOptions.subject).toContain('ST-2026-9770');
      expect(mailOptions.subject).toContain('entregado');
      expect(mailOptions.html).toContain('ST-2026-9770');
      expect(mailOptions.html).toContain('Carlos Silva');
      expect(mailOptions.html).toContain('Se entregó a apoderado con carnet');
      expect(mailOptions.html).toContain('HDMI Inalámbrico Full HD 1080P');
      expect(mailOptions.html).toContain('Garantía Técnica');
      expect(mailOptions.html).toContain('Notificación de Seguridad');
    });
  });
});
