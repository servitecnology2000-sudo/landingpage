import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as createPreference } from '../../src/pages/api/mercadopago/create-preference';
import { supabaseAdmin } from '../../src/lib/supabase';

// Generador de RUTs chilenos válidos para pruebas aisladas
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

describe('Pruebas de Checkout Pro en Modo Invitado (/api/mercadopago/create-preference)', () => {
  let testSku = 'TEST-SKU-GUEST-001';
  let testProductCreated = false;
  const createdOrderIds: string[] = [];
  const createdCustomerEmails: string[] = [];

  beforeAll(async () => {
    // Intentar obtener un producto existente de la base de datos con stock suficiente
    const { data: existingProd } = await supabaseAdmin
      .from('repuestos_productos')
      .select('sku, stock_cantidad')
      .gt('stock_cantidad', 5)
      .limit(1)
      .maybeSingle();

    if (existingProd && existingProd.sku) {
      testSku = existingProd.sku;
    } else {
      // Si no hay ninguno con stock, insertar uno con todos los campos requeridos por el esquema
      const { data: newProd, error } = await supabaseAdmin
        .from('repuestos_productos')
        .insert({
          sku: testSku,
          titulo: 'Repuesto Test Invitado Vitest',
          slug: `test-sku-guest-${Date.now()}`,
          categoria: 'pantallas',
          descripcion: 'Producto de prueba para checkout de invitados',
          precio_venta: 15990,
          precio_costo: 10000,
          stock_cantidad: 50,
          estado: 'nuevo',
          imagenes: ['https://servitecnology.com/imagenes/logost.png']
        })
        .select()
        .single();

      if (!error && newProd) {
        testProductCreated = true;
      }
    }
  });

  afterAll(async () => {
    // Limpieza de órdenes de prueba generadas
    if (createdOrderIds.length > 0) {
      await supabaseAdmin
        .from('orders')
        .delete()
        .in('id', createdOrderIds);
    }

    // Limpieza de clientes de prueba generados
    if (createdCustomerEmails.length > 0) {
      await supabaseAdmin
        .from('customers')
        .delete()
        .in('email', createdCustomerEmails);
    }

    // Limpieza de producto de prueba si fue creado por este test
    if (testProductCreated) {
      await supabaseAdmin
        .from('repuestos_productos')
        .delete()
        .eq('sku', testSku);
    }
  });

  it('debe rechazar con 400 si el carrito de items está vacío', async () => {
    const req = new Request('http://localhost:4321/api/mercadopago/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          full_name: 'Juan Pérez Test',
          email: 'juan.perez.test@example.com',
          phone: '+56 9 1234 5678',
          rut: '11.111.111-1'
        },
        delivery_type: 'retiro',
        items: []
      })
    });

    const res = await createPreference({ request: req, url: new URL(req.url) } as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('items');
  });

  it('debe rechazar con 400 si el RUT ingresado es inválido según el SII (Módulo 11)', async () => {
    const req = new Request('http://localhost:4321/api/mercadopago/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          full_name: 'Juan Pérez Test',
          email: 'juan.perez.test@example.com',
          phone: '+56 9 1234 5678',
          rut: '11.111.111-9' // RUT falso con DV inválido
        },
        delivery_type: 'retiro',
        items: [{ sku: testSku, cantidad: 1 }]
      })
    });

    const res = await createPreference({ request: req, url: new URL(req.url) } as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('RUT');
  });

  it('debe rechazar con 400 si faltan campos obligatorios del comprador (nombre, email o teléfono)', async () => {
    const reqSinNombre = new Request('http://localhost:4321/api/mercadopago/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          full_name: '',
          email: 'test@example.com',
          phone: '+56 9 1234 5678',
          rut: '11.111.111-1'
        },
        delivery_type: 'retiro',
        items: [{ sku: testSku, cantidad: 1 }]
      })
    });

    const resSinNombre = await createPreference({ request: reqSinNombre, url: new URL(reqSinNombre.url) } as any);
    expect(resSinNombre.status).toBe(400);
    const dataSinNombre = await resSinNombre.json();
    expect(dataSinNombre.error).toContain('Nombre');

    const reqSinEmail = new Request('http://localhost:4321/api/mercadopago/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          full_name: 'Cliente Test',
          email: 'correo_invalido',
          phone: '+56 9 1234 5678',
          rut: '11.111.111-1'
        },
        delivery_type: 'retiro',
        items: [{ sku: testSku, cantidad: 1 }]
      })
    });

    const resSinEmail = await createPreference({ request: reqSinEmail, url: new URL(reqSinEmail.url) } as any);
    expect(resSinEmail.status).toBe(400);
    const dataSinEmail = await resSinEmail.json();
    expect(dataSinEmail.error).toContain('correo');
  });

  it('debe rechazar con 400 si se selecciona Envío por Pagar pero falta la dirección o comuna', async () => {
    const req = new Request('http://localhost:4321/api/mercadopago/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          full_name: 'Despacho Incompleto',
          email: 'despacho.incompleto@example.com',
          phone: '+56 9 1234 5678',
          rut: '11.111.111-1'
        },
        delivery_type: 'envio_cobro_destino',
        address: '', // Falta dirección
        commune: '',
        items: [{ sku: testSku, cantidad: 1 }]
      })
    });

    const res = await createPreference({ request: req, url: new URL(req.url) } as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('dirección de entrega es obligatoria');
  });

  it('debe procesar exitosamente un pedido de Invitado con Retiro en Oficina sin exigir dirección de despacho', async () => {
    const testEmail = `invitado.retiro.${Date.now()}@testvitest.cl`;
    createdCustomerEmails.push(testEmail);

    const req = new Request('http://localhost:4321/api/mercadopago/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          full_name: 'Invitado Retiro Test',
          email: testEmail,
          phone: '+56 9 8765 4321',
          rut: generateValidRut()
        },
        delivery_type: 'retiro',
        // Sin address ni commune explícitos
        items: [{ sku: testSku, cantidad: 1 }]
      })
    });

    const res = await createPreference({ request: req, url: new URL(req.url) } as any);
    const data = await res.json();
    if (res.status !== 200) {
      console.log('Fallo Retiro en Oficina:', data);
    }
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.orderId).toMatch(/^ST-2026-\d{4}$/);
    createdOrderIds.push(data.orderId);

    // Debe retornar initPoint o sandboxInitPoint (o isPendingCredentials si no hay token configurado)
    if (data.isPendingCredentials) {
      expect(data.isPendingCredentials).toBe(true);
    } else {
      expect(data.initPoint || data.sandboxInitPoint).toBeDefined();
    }

    // Verificar en Supabase que el cliente se guardó como 'invitado' y sin auth_user_id
    const { data: dbCustomer } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('email', testEmail)
      .single();

    expect(dbCustomer).toBeDefined();
    expect(dbCustomer.customer_type).toBe('invitado');
    expect(dbCustomer.auth_user_id).toBeNull();
    expect(dbCustomer.full_name).toBe('Invitado Retiro Test');

    // Verificar en Supabase que la orden se creó correctamente asociada a dicho cliente
    const { data: dbOrder } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', data.orderId)
      .single();

    expect(dbOrder).toBeDefined();
    expect(dbOrder.customer_id).toBe(dbCustomer.id);
    expect(dbOrder.delivery_type).toBe('retiro');
    expect(dbOrder.shipping_address).toContain('Retiro en Oficina Técnica');
    expect(dbOrder.payment_status).toBe('pendiente');
  });

  it('debe procesar exitosamente un pedido de Invitado con Envío por Pagar ingresando región, comuna y dirección', async () => {
    const testEmail = `invitado.envio.${Date.now()}@testvitest.cl`;
    createdCustomerEmails.push(testEmail);

    const req = new Request('http://localhost:4321/api/mercadopago/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          full_name: 'Invitado Envío Nacional',
          email: testEmail,
          phone: '+56 9 9988 7766',
          rut: generateValidRut()
        },
        delivery_type: 'envio_cobro_destino',
        address: 'Av. Libertad 456, Depto 102',
        commune: 'Viña del Mar',
        items: [{ sku: testSku, cantidad: 2 }]
      })
    });

    const res = await createPreference({ request: req, url: new URL(req.url) } as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.orderId).toMatch(/^ST-2026-\d{4}$/);
    createdOrderIds.push(data.orderId);

    // Verificar en Supabase
    const { data: dbOrder } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', data.orderId)
      .single();

    expect(dbOrder).toBeDefined();
    expect(dbOrder.delivery_type).toBe('envio_nacional');
    expect(dbOrder.commune).toBe('Viña del Mar');
    expect(dbOrder.shipping_address).toBe('Av. Libertad 456, Depto 102');
  });
});
