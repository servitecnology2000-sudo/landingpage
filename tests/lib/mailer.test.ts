import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCourierTrackingUrl,
  sendOrderShippedEmail,
  sendOrderReadyForPickupEmail,
  sendOrderDeliveredEmail,
  sendOrderConfirmationEmail,
  getOrderConfirmationEmailHtml,
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

  describe('sendOrderConfirmationEmail() y getOrderConfirmationEmailHtml()', () => {
    it('Caso 1: RUT Personal con Envío por Cobrar en Destino -> debe indicar "su boleta llegará junto con su compra"', async () => {
      const sendMailSpy = vi.spyOn(transporter, 'sendMail').mockResolvedValueOnce({ messageId: 'test-conf-1' } as any);

      const data = {
        orderId: 'ST-2026-PERS-ENV',
        customerName: 'Juan Pérez',
        customerEmail: 'juan@personal.cl',
        customerRut: '15.234.567-8', // RUT Personal (< 50M)
        customerPhone: '+56 9 1234 5678',
        customerAddress: 'Av. Providencia 1234',
        deliveryType: 'envio_cobro_destino',
        commune: 'Providencia',
        totalAmount: 35000,
        items: [
          { sku: 'DISC-01', titulo: 'Disco SSD NVMe 1TB', precio_venta: 35000, cantidad: 1 }
        ]
      };

      const html = getOrderConfirmationEmailHtml(data);
      expect(html.toLowerCase()).toContain('su boleta llegará junto con su compra');
      expect(html).toContain('Boleta Electrónica');

      const result = await sendOrderConfirmationEmail(data);
      expect(result).toBe(true);
      expect(sendMailSpy).toHaveBeenCalledTimes(1);

      const mailOptions = sendMailSpy.mock.calls[0][0];
      expect(mailOptions.subject).toContain('[Boleta]');
      expect(mailOptions.subject).toContain('ST-2026-PERS-ENV');
      expect(mailOptions.html.toLowerCase()).toContain('su boleta llegará junto con su compra');
    });

    it('Caso 2: RUT Personal con Retiro en Bodega -> debe indicar "su boleta se le entregará al retirar su compra en bodega"', async () => {
      const sendMailSpy = vi.spyOn(transporter, 'sendMail').mockResolvedValueOnce({ messageId: 'test-conf-2' } as any);

      const data = {
        orderId: 'ST-2026-PERS-RET',
        customerName: 'María Soto',
        customerEmail: 'maria@personal.cl',
        customerRut: '19.876.543-2', // RUT Personal (< 50M)
        customerPhone: '+56 9 8765 4321',
        customerAddress: 'Santiago Centro',
        deliveryType: 'retiro',
        commune: 'Santiago Centro',
        totalAmount: 18000,
        items: [
          { sku: 'MEM-02', titulo: 'Memoria RAM 8GB DDR4', precio_venta: 18000, cantidad: 1 }
        ]
      };

      const html = getOrderConfirmationEmailHtml(data);
      expect(html.toLowerCase()).toContain('su boleta se le entregará al retirar su compra en bodega');
      expect(html).toContain('Boleta Electrónica');

      const result = await sendOrderConfirmationEmail(data);
      expect(result).toBe(true);

      const mailOptions = sendMailSpy.mock.calls[0][0];
      expect(mailOptions.subject).toContain('[Boleta]');
      expect(mailOptions.html.toLowerCase()).toContain('su boleta se le entregará al retirar su compra en bodega');
    });

    it('Caso 3: RUT Empresa con Envío por Cobrar en Destino -> debe indicar "su factura llegará junto con su compra"', async () => {
      const sendMailSpy = vi.spyOn(transporter, 'sendMail').mockResolvedValueOnce({ messageId: 'test-conf-3' } as any);

      const data = {
        orderId: 'ST-2026-EMP-ENV',
        customerName: 'Tecnología y Soluciones SpA',
        customerEmail: 'compras@tecnosol.cl',
        customerRut: '76.842.190-3', // RUT Empresa (>= 50M)
        customerPhone: '+56 9 4433 2211',
        customerAddress: 'Camino Lo Boza 120',
        deliveryType: 'envio_nacional',
        commune: 'Pudahuel',
        totalAmount: 150000,
        items: [
          { sku: 'SVR-01', titulo: 'Fuente Servidor Redundante', precio_venta: 150000, cantidad: 1 }
        ]
      };

      const html = getOrderConfirmationEmailHtml(data);
      expect(html.toLowerCase()).toContain('su factura llegará junto con su compra');
      expect(html).toContain('Factura Electrónica');

      const result = await sendOrderConfirmationEmail(data);
      expect(result).toBe(true);

      const mailOptions = sendMailSpy.mock.calls[0][0];
      expect(mailOptions.subject).toContain('[Factura]');
      expect(mailOptions.html.toLowerCase()).toContain('su factura llegará junto con su compra');
    });

    it('Caso 4: RUT Empresa con Retiro en Bodega -> debe indicar "su factura se le entregará al retirar su compra en bodega"', async () => {
      const sendMailSpy = vi.spyOn(transporter, 'sendMail').mockResolvedValueOnce({ messageId: 'test-conf-4' } as any);

      const data = {
        orderId: 'ST-2026-EMP-RET',
        customerName: 'Inversiones y Servicios Globales Ltda.',
        customerEmail: 'contacto@globales.cl',
        customerRut: '77.345.678-K', // RUT Empresa (>= 50M)
        customerPhone: '+56 2 2345 6789',
        customerAddress: 'Santiago Centro',
        deliveryType: 'retiro',
        commune: 'Santiago',
        totalAmount: 85000,
        items: [
          { sku: 'DISP-03', titulo: 'Cargador Universal 120W Industrial', precio_venta: 85000, cantidad: 1 }
        ]
      };

      const html = getOrderConfirmationEmailHtml(data);
      expect(html.toLowerCase()).toContain('su factura se le entregará al retirar su compra en bodega');
      expect(html).toContain('Factura Electrónica');

      const result = await sendOrderConfirmationEmail(data);
      expect(result).toBe(true);

      const mailOptions = sendMailSpy.mock.calls[0][0];
      expect(mailOptions.subject).toContain('[Factura]');
      expect(mailOptions.html.toLowerCase()).toContain('su factura se le entregará al retirar su compra en bodega');
    });
  });
});
