import { describe, it, expect, vi } from 'vitest';
import { POST } from '../../src/pages/api/admin/orders/update-status';

describe('Pruebas del Endpoint Administrativo /api/admin/orders/update-status', () => {
  const adminSecret = process.env.ADMIN_SECRET || '20181860';

  it('debe rechazar con 401 si no se envía la cookie ni el header de administración', async () => {
    const req = new Request('http://localhost:4321/api/admin/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: 'ST-2026-TEST' })
    });

    const context: any = {
      request: req,
      cookies: {
        get: () => undefined
      }
    };

    const response = await POST(context);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('No autorizado');
  });

  it('debe rechazar con 400 si falta el campo order_id', async () => {
    const req = new Request('http://localhost:4321/api/admin/orders/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminSecret}`
      },
      body: JSON.stringify({ order_status: 'despachado' })
    });

    const context: any = {
      request: req,
      cookies: {
        get: () => undefined
      }
    };

    const response = await POST(context);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('order_id');
  });

  it('debe rechazar con 400 si order_status es inválido', async () => {
    const req = new Request('http://localhost:4321/api/admin/orders/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminSecret}`
      },
      body: JSON.stringify({ order_id: 'ST-2026-9999', order_status: 'estado_inventado' })
    });

    const context: any = {
      request: req,
      cookies: {
        get: () => undefined
      }
    };

    const response = await POST(context);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Estado de orden inválido');
  });

  it('debe rechazar con 400 si se intenta despachar sin courier o tracking', async () => {
    const req = new Request('http://localhost:4321/api/admin/orders/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminSecret}`
      },
      body: JSON.stringify({
        order_id: 'ST-2026-9999',
        order_status: 'despachado',
        courier: '',
        tracking_number: ''
      })
    });

    const context: any = {
      request: req,
      cookies: {
        get: () => undefined
      }
    };

    const response = await POST(context);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Courier');
  });

  it('debe devolver 404 si la orden no existe en la base de datos', async () => {
    const req = new Request('http://localhost:4321/api/admin/orders/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminSecret}`
      },
      body: JSON.stringify({
        order_id: 'ST-INEXISTENTE-99999',
        order_status: 'listo_retiro'
      })
    });

    const context: any = {
      request: req,
      cookies: {
        get: () => undefined
      }
    };

    const response = await POST(context);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('No se encontró');
  });
});
