import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { GET as getCustomerOrders } from '../../src/pages/api/account/orders';
import { supabase, supabaseAdmin } from '../../src/lib/supabase';

// Generador de RUTs chilenos válidos para pruebas
function generateValidRut(): string {
  const num = Math.floor(20000000 + Math.random() * 70000000);
  const cuerpo = num.toString();
  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }
  const dvEsperado = 11 - (suma % 11);
  const dv = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
  return `${cuerpo.slice(0, 2)}.${cuerpo.slice(2, 5)}.${cuerpo.slice(5, 8)}-${dv}`;
}

describe('Portal Mis Pedidos - Endpoint API (/api/account/orders)', () => {
  const createdOrderIds: string[] = [];
  const createdCustomerIds: string[] = [];
  const createdCustomerEmails: string[] = [];
  const createdAuthUserIds: string[] = [];

  afterAll(async () => {
    // Restaurar cualquier espía de Vitest
    vi.restoreAllMocks();

    // Limpieza de órdenes de prueba generadas
    if (createdOrderIds.length > 0) {
      await supabaseAdmin
        .from('orders')
        .delete()
        .in('id', createdOrderIds);
    }

    // Limpieza de clientes de prueba generados
    if (createdCustomerIds.length > 0) {
      await supabaseAdmin
        .from('customers')
        .delete()
        .in('id', createdCustomerIds);
    }

    if (createdCustomerEmails.length > 0) {
      await supabaseAdmin
        .from('customers')
        .delete()
        .in('email', createdCustomerEmails);
    }

    // Limpieza de usuarios de autenticación creados
    for (const uid of createdAuthUserIds) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(uid);
      } catch {
        // ignorar
      }
    }
  });

  it('debe rechazar con 401 si no se envía la cabecera Authorization', async () => {
    const req = new Request('http://localhost:4321/api/account/orders', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const res = await getCustomerOrders({ request: req, url: new URL(req.url) } as any);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('No autorizado');
  });

  it('debe rechazar con 401 si la cabecera Authorization no tiene formato Bearer o está vacía', async () => {
    const req = new Request('http://localhost:4321/api/account/orders', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic 12345'
      }
    });

    const res = await getCustomerOrders({ request: req, url: new URL(req.url) } as any);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('No autorizado');
  });

  it('debe rechazar con 401 si el token es inválido o expirado', async () => {
    // Espiar supabase.auth.getUser para simular token expirado / inválido
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid JWT token', name: 'AuthApiError', status: 401 } as any
    });

    const req = new Request('http://localhost:4321/api/account/orders', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token_invalido_123'
      }
    });

    const res = await getCustomerOrders({ request: req, url: new URL(req.url) } as any);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Sesión inválida');
  });

  it('debe retornar 200 con lista vacía si el usuario autenticado aún no tiene compras', async () => {
    const fakeUserId = crypto.randomUUID();
    const fakeEmail = `nuevo.usuario.${Date.now()}@example.com`;

    vi.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
      data: {
        user: {
          id: fakeUserId,
          email: fakeEmail,
          user_metadata: { full_name: 'Usuario Nuevo Sin Compras' }
        } as any
      },
      error: null
    });

    const req = new Request('http://localhost:4321/api/account/orders', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake_valid_token'
      }
    });

    const res = await getCustomerOrders({ request: req, url: new URL(req.url) } as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.orders)).toBe(true);
    expect(data.orders.length).toBe(0);
    expect(data.customer.email).toBe(fakeEmail);
  });

  it('debe vincular retroactivamente pedidos de invitado y devolver trazabilidad logística completa', async () => {
    const timestamp = Date.now();
    const guestEmail = `test.invitado.retro.${timestamp}@testvitest.cl`;
    createdCustomerEmails.push(guestEmail);

    // 1. Crear cliente tipo invitado en Supabase sin auth_user_id
    const { data: guestCustomer, error: custErr } = await supabaseAdmin
      .from('customers')
      .insert({
        full_name: 'Comprador Invitado Previo',
        email: guestEmail,
        phone: '+56 9 7766 5544',
        rut: generateValidRut(),
        customer_type: 'invitado',
        auth_user_id: null
      })
      .select()
      .single();

    expect(custErr).toBeNull();
    expect(guestCustomer).toBeDefined();
    createdCustomerIds.push(guestCustomer.id);

    // 2. Crear orden previa en Supabase para este cliente invitado con metadatos logísticos
    const testOrderId = `ST-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    createdOrderIds.push(testOrderId);

    const { data: createdOrder, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        id: testOrderId,
        customer_id: guestCustomer.id,
        items: [
          { sku: 'TEST-SKU-P1', titulo: 'Pantalla iPhone 13 Pro', cantidad: 1, precio_unitario: 89900 }
        ],
        shipping_cost: 0,
        total_amount: 89900,
        delivery_type: 'envio_nacional',
        shipping_address: 'Av. Providencia 1234, Of 501, Región Metropolitana',
        commune: 'Providencia',
        payment_status: 'aprobado',
        mp_payment_id: '1234567890',
        order_status: 'despachado',
        courier: 'Chilexpress',
        tracking_number: 'CHILEXPRESS-99887766',
        shipped_at: new Date().toISOString(),
        invoice_folio: 'FAC-778899',
        invoice_url: 'https://dte.sii.cl/factura/778899'
      })
      .select()
      .single();

    expect(orderErr).toBeNull();
    expect(createdOrder).toBeDefined();

    // 3. Crear usuario en auth.users para que satisfaga la clave foránea de Postgres
    const { data: authUserRes, error: authCreateErr } = await supabaseAdmin.auth.admin.createUser({
      email: guestEmail,
      email_confirm: true,
      user_metadata: { full_name: 'Comprador Ahora Registrado' }
    });

    expect(authCreateErr).toBeNull();
    expect(authUserRes.user).toBeDefined();
    const registeredAuthUserId = authUserRes.user!.id;
    createdAuthUserIds.push(registeredAuthUserId);

    vi.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
      data: {
        user: {
          id: registeredAuthUserId,
          email: guestEmail,
          user_metadata: { full_name: 'Comprador Ahora Registrado' }
        } as any
      },
      error: null
    });

    // 4. Invocar /api/account/orders
    const req = new Request('http://localhost:4321/api/account/orders', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock_valid_google_jwt'
      }
    });

    const res = await getCustomerOrders({ request: req, url: new URL(req.url) } as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.orders)).toBe(true);
    expect(data.orders.length).toBeGreaterThanOrEqual(1);

    const foundOrder = data.orders.find((o: any) => o.id === testOrderId);
    expect(foundOrder).toBeDefined();
    expect(foundOrder.payment_status).toBe('aprobado');
    expect(foundOrder.order_status).toBe('despachado');
    expect(foundOrder.courier).toBe('Chilexpress');
    expect(foundOrder.tracking_number).toBe('CHILEXPRESS-99887766');
    expect(foundOrder.invoice_folio).toBe('FAC-778899');
    expect(foundOrder.invoice_url).toBe('https://dte.sii.cl/factura/778899');

    // 5. Verificar que en la base de datos Supabase el cliente fue vinculado retroactivamente
    const { data: updatedCustomer } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', guestCustomer.id)
      .single();

    expect(updatedCustomer).toBeDefined();
    expect(updatedCustomer.auth_user_id).toBe(registeredAuthUserId);
    expect(updatedCustomer.customer_type).toBe('registrado');
  });
});
