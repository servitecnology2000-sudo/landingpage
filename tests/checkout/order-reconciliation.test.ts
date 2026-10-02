import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { reconcileApprovedOrder } from '../../src/lib/order-reconciliation';
import { POST as createPreference } from '../../src/pages/api/mercadopago/create-preference';
import { supabaseAdmin } from '../../src/lib/supabase';
import { transporter } from '../../src/lib/mailer';

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

describe('Conciliación Unificada de Pedidos y Actualización Reactiva de Comprador', () => {
  let testSku = 'TEST-RECON-SKU-001';
  let testProductCreated = false;
  const initialStock = 20;
  const createdOrderIds: string[] = [];
  const createdCustomerIds: string[] = [];
  const createdCustomerEmails: string[] = [];

  beforeAll(async () => {
    // Crear producto exclusivo para este test para aislar el decremento de stock
    const { data: newProd, error } = await supabaseAdmin
      .from('repuestos_productos')
      .insert({
        sku: testSku,
        titulo: 'Repuesto Test Conciliación Vitest',
        slug: `test-sku-recon-${Date.now()}`,
        categoria: 'pantallas',
        descripcion: 'Producto de prueba para conciliación de órdenes',
        precio_venta: 12000,
        precio_costo: 8000,
        stock_cantidad: initialStock,
        estado: 'nuevo',
        imagenes: ['https://servitecnology.com/imagenes/logost.png']
      })
      .select()
      .single();

    if (!error && newProd) {
      testProductCreated = true;
    }
  });

  afterAll(async () => {
    vi.restoreAllMocks();

    if (createdOrderIds.length > 0) {
      await supabaseAdmin
        .from('orders')
        .delete()
        .in('id', createdOrderIds);
    }

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

    if (testProductCreated) {
      await supabaseAdmin
        .from('repuestos_productos')
        .delete()
        .eq('sku', testSku);
    }
  });

  it('debe ejecutar la conciliación aprobando la orden, guardando mp_payment_id, decrementando stock y disparando mailer', async () => {
    const testEmail = `recon.cliente.${Date.now()}@testvitest.cl`;
    createdCustomerEmails.push(testEmail);

    // 1. Crear cliente
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .insert({
        full_name: 'Cliente Para Conciliar',
        email: testEmail,
        phone: '+56 9 1234 5678',
        rut: generateValidRut(),
        customer_type: 'invitado'
      })
      .select()
      .single();

    expect(customer).toBeDefined();
    createdCustomerIds.push(customer.id);

    // 2. Crear orden pendiente
    const orderId = `ST-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    createdOrderIds.push(orderId);

    const { data: order } = await supabaseAdmin
      .from('orders')
      .insert({
        id: orderId,
        customer_id: customer.id,
        items: [{ sku: testSku, cantidad: 2, precio_venta: 12000, titulo: 'Repuesto Test' }],
        delivery_type: 'retiro',
        shipping_address: 'Retiro en Oficina Técnica',
        commune: 'Santiago Centro',
        shipping_cost: 0,
        total_amount: 24000,
        payment_status: 'pendiente',
        order_status: 'preparacion',
        mp_payment_id: null
      })
      .select()
      .single();

    expect(order).toBeDefined();

    // Espiar transporter.sendMail para comprobar envío y destinatarios
    const sendMailSpy = vi.spyOn(transporter, 'sendMail').mockResolvedValueOnce({} as any);

    const testPaymentId = '180918033851';
    const result = await reconcileApprovedOrder({
      orderId,
      paymentId: testPaymentId
    });

    expect(result.success).toBe(true);
    expect(result.alreadyProcessed).toBe(false);

    // Verificar en BD que la orden pasó a aprobado y guardó mp_payment_id
    const { data: updatedOrder } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    expect(updatedOrder.payment_status).toBe('aprobado');
    expect(updatedOrder.mp_payment_id).toBe(testPaymentId);

    // Verificar que el stock disminuyó en 2
    const { data: prodAfter } = await supabaseAdmin
      .from('repuestos_productos')
      .select('stock_cantidad')
      .eq('sku', testSku)
      .single();

    expect(prodAfter.stock_cantidad).toBe(initialStock - 2);

    // Verificar que se llamó al mailer con destinatario cliente y bcc
    expect(sendMailSpy).toHaveBeenCalledTimes(1);
    const mailArgs = sendMailSpy.mock.calls[0][0];
    expect(mailArgs.to).toBe(testEmail);
    expect(mailArgs.bcc).toBeDefined();
  });

  it('debe ser estrictamente idempotente: una segunda llamada no debe decrementar stock ni reenviar correos', async () => {
    const testEmail = `recon.idempotent.${Date.now()}@testvitest.cl`;
    createdCustomerEmails.push(testEmail);

    const { data: customer } = await supabaseAdmin
      .from('customers')
      .insert({
        full_name: 'Cliente Idempotencia',
        email: testEmail,
        phone: '+56 9 5555 6666',
        rut: generateValidRut(),
        customer_type: 'invitado'
      })
      .select()
      .single();

    expect(customer).toBeDefined();
    createdCustomerIds.push(customer.id);

    const orderId = `ST-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    createdOrderIds.push(orderId);

    await supabaseAdmin
      .from('orders')
      .insert({
        id: orderId,
        customer_id: customer.id,
        items: [{ sku: testSku, cantidad: 1, precio_venta: 12000, titulo: 'Repuesto Test' }],
        delivery_type: 'retiro',
        shipping_address: 'Retiro en Oficina Técnica',
        commune: 'Santiago Centro',
        shipping_cost: 0,
        total_amount: 12000,
        payment_status: 'pendiente',
        order_status: 'preparacion',
        mp_payment_id: null
      });

    const sendMailSpy = vi.spyOn(transporter, 'sendMail').mockResolvedValue({} as any);

    // Primera conciliación
    const result1 = await reconcileApprovedOrder({
      orderId,
      paymentId: '180918033852'
    });
    expect(result1.success).toBe(true);
    expect(result1.alreadyProcessed).toBe(false);
    expect(sendMailSpy).toHaveBeenCalledTimes(1);

    const { data: prodAfterFirst } = await supabaseAdmin
      .from('repuestos_productos')
      .select('stock_cantidad')
      .eq('sku', testSku)
      .single();

    // Segunda conciliación (debe ser ignorada pacíficamente)
    sendMailSpy.mockClear();
    const result2 = await reconcileApprovedOrder({
      orderId,
      paymentId: '180918033852'
    });

    expect(result2.success).toBe(true);
    expect(result2.alreadyProcessed).toBe(true);

    // Stock debe ser exactamente el mismo de la primera llamada
    const { data: prodAfterSecond } = await supabaseAdmin
      .from('repuestos_productos')
      .select('stock_cantidad')
      .eq('sku', testSku)
      .single();

    expect(prodAfterSecond.stock_cantidad).toBe(prodAfterFirst.stock_cantidad);

    // No debe haber enviado un segundo correo
    expect(sendMailSpy).not.toHaveBeenCalled();
  });

  it('debe actualizar los datos del cliente en customers cuando el usuario modifica el formulario en checkout con customer_id existente', async () => {
    const initialEmail = `user.existente.${Date.now()}@testvitest.cl`;
    createdCustomerEmails.push(initialEmail);

    // 1. Crear cliente con datos antiguos
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .insert({
        full_name: 'Nombre Antiguo Pedro',
        email: initialEmail,
        phone: '+56 9 1111 2222',
        rut: generateValidRut(),
        customer_type: 'registrado'
      })
      .select()
      .single();

    expect(existingCustomer).toBeDefined();
    createdCustomerIds.push(existingCustomer.id);

    // 2. Simular que en /checkout el usuario modifica su nombre y teléfono
    const updatedName = 'Nombre Actualizado Jesús';
    const updatedPhone = '+56 9 9988 7766';
    const newRut = generateValidRut();

    const req = new Request('http://localhost:4321/api/mercadopago/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: existingCustomer.id,
        customer: {
          full_name: updatedName,
          email: initialEmail,
          phone: updatedPhone,
          rut: newRut,
          identification_type: 'rut',
          auth_user_id: existingCustomer.auth_user_id || null,
          address: 'Nueva Dirección Taller 555',
          commune: 'Santiago'
        },
        delivery_type: 'retiro',
        items: [{ sku: testSku, cantidad: 1 }]
      })
    });

    const res = await createPreference({ request: req, url: new URL(req.url) } as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    createdOrderIds.push(data.orderId);

    // 3. Verificar que en la base de datos customers se guardaron los NUEVOS datos
    const { data: freshCustomer } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', existingCustomer.id)
      .single();

    expect(freshCustomer.full_name).toBe(updatedName);
    expect(freshCustomer.phone).toBe(updatedPhone);
    expect(freshCustomer.rut).toBe(newRut);
  });
});
