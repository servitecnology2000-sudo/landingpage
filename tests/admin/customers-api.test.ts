import { describe, it, expect } from 'vitest';
import { POST as saveCustomer } from '../../src/pages/api/admin/customers/save';
import { POST as deleteCustomer } from '../../src/pages/api/admin/customers/delete';

describe('Pruebas de Endpoints de Clientes y CRM (/api/admin/customers/*)', () => {
  const adminSecret = process.env.ADMIN_SECRET || '20181860';
  let createdCustomerId: string | null = null;

  describe('POST /api/admin/customers/save', () => {
    it('debe rechazar con 401 si no está autenticado como administrador', async () => {
      const req = new Request('http://localhost:4321/api/admin/customers/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: 'Test' })
      });

      const response = await saveCustomer({ request: req, cookies: { get: () => undefined } } as any);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('No autorizado');
    });

    it('debe rechazar con 400 si falta el nombre', async () => {
      const req = new Request('http://localhost:4321/api/admin/customers/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSecret}`
        },
        body: JSON.stringify({ full_name: '', email: 'test@example.com', rut: '11.111.111-1' })
      });

      const response = await saveCustomer({ request: req, cookies: { get: () => undefined } } as any);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('nombre');
    });

    it('debe rechazar con 400 si el RUT es inválido', async () => {
      const req = new Request('http://localhost:4321/api/admin/customers/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSecret}`
        },
        body: JSON.stringify({ full_name: 'Cliente Prueba', email: 'test@example.com', rut: '11.111.111-9' })
      });

      const response = await saveCustomer({ request: req, cookies: { get: () => undefined } } as any);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('RUT ingresado no es válido');
    });

    it('debe crear exitosamente un nuevo cliente manual con RUT válido', async () => {
      const req = new Request('http://localhost:4321/api/admin/customers/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSecret}`
        },
        body: JSON.stringify({
          full_name: 'Cliente Vitest CRM',
          email: 'vitest_crm@servitecnology.cl',
          phone: '+56 9 1234 5678',
          rut: '11.111.111-1',
          address: 'Calle Técnica 100, Santiago',
          customer_type: 'manual',
          notes: 'Cliente creado en test automatizado'
        })
      });

      const response = await saveCustomer({ request: req, cookies: { get: () => undefined } } as any);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.customer).toBeDefined();
      expect(data.customer.id).toBeDefined();
      expect(data.customer.rut).toBe('11.111.111-1');
      expect(data.customer.customer_type).toBe('manual');

      createdCustomerId = data.customer.id;
    });

    it('debe actualizar exitosamente los datos del cliente recién creado', async () => {
      expect(createdCustomerId).toBeDefined();

      const req = new Request('http://localhost:4321/api/admin/customers/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSecret}`
        },
        body: JSON.stringify({
          id: createdCustomerId,
          full_name: 'Cliente Vitest CRM Modificado',
          email: 'vitest_crm@servitecnology.cl',
          phone: '+56 9 9999 8888',
          rut: '11.111.111-1',
          address: 'Av. Providencia 400, Santiago',
          customer_type: 'manual',
          notes: 'Nota actualizada por Vitest'
        })
      });

      const response = await saveCustomer({ request: req, cookies: { get: () => undefined } } as any);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.customer.full_name).toBe('Cliente Vitest CRM Modificado');
      expect(data.customer.address).toBe('Av. Providencia 400, Santiago');
    });
  });

  describe('POST /api/admin/customers/delete', () => {
    it('debe rechazar con 401 si no está autenticado', async () => {
      const req = new Request('http://localhost:4321/api/admin/customers/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: '123' })
      });

      const response = await deleteCustomer({ request: req, cookies: { get: () => undefined } } as any);
      expect(response.status).toBe(401);
    });

    it('debe rechazar con 400 si falta customer_id', async () => {
      const req = new Request('http://localhost:4321/api/admin/customers/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSecret}`
        },
        body: JSON.stringify({})
      });

      const response = await deleteCustomer({ request: req, cookies: { get: () => undefined } } as any);
      expect(response.status).toBe(400);
    });

    it('debe eliminar exitosamente el cliente de prueba creado', async () => {
      expect(createdCustomerId).toBeDefined();

      const req = new Request('http://localhost:4321/api/admin/customers/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSecret}`
        },
        body: JSON.stringify({ customer_id: createdCustomerId })
      });

      const response = await deleteCustomer({ request: req, cookies: { get: () => undefined } } as any);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
