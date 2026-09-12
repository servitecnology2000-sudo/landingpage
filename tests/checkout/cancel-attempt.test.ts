import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as cancelAttempt } from '../../src/pages/api/mercadopago/cancel-attempt';
import { supabaseAdmin } from '../../src/lib/supabase';

describe('Endpoint /api/mercadopago/cancel-attempt - Cancelación y Liberación de Stock', () => {
  const testOrderId = `ST-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  beforeAll(async () => {
    // Crear una orden de prueba en estado pendiente con reserva de stock
    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from('orders')
      .insert({
        id: testOrderId,
        payment_status: 'pendiente',
        order_status: 'preparacion',
        total_amount: 15990,
        shipping_cost: 0,
        delivery_type: 'retiro',
        stock_reserved_until: futureDate,
        items: [
          { sku: 'TEST-SKU-001', titulo: 'Repuesto Test', cantidad: 1, precio_venta: 15990 }
        ]
      });
  });

  afterAll(async () => {
    // Limpieza
    await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', testOrderId);
  });

  it('debe responder 400 si falta el campo order_id', async () => {
    const req = new Request('http://localhost:4321/api/mercadopago/cancel-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const res = await cancelAttempt({ request: req } as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('debe responder 404 si la orden no existe', async () => {
    const req = new Request('http://localhost:4321/api/mercadopago/cancel-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: 'ST-2026-0001' })
    });

    const res = await cancelAttempt({ request: req } as any);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('debe cancelar exitosamente el intento y liberar la reserva de stock', async () => {
    const req = new Request('http://localhost:4321/api/mercadopago/cancel-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: testOrderId,
        reason: 'Cliente canceló el pago al volver de pasarela'
      })
    });

    const res = await cancelAttempt({ request: req } as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe('cancelado');
    expect(json.stock_released).toBe(true);

    // Verificar en Supabase
    const { data: updatedOrder } = await supabaseAdmin
      .from('orders')
      .select('payment_status, order_status, stock_reserved_until, admin_notes')
      .eq('id', testOrderId)
      .single();

    expect(updatedOrder?.payment_status).toBe('cancelado');
    expect(updatedOrder?.order_status).toBe('cancelado');
    expect(new Date(updatedOrder?.stock_reserved_until).getTime()).toBeLessThan(Date.now());
    expect(updatedOrder?.admin_notes).toContain('Cliente canceló el pago');
  });

  it('debe ser idempotente si se llama nuevamente para una orden ya cancelada', async () => {
    const req = new Request('http://localhost:4321/api/mercadopago/cancel-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: testOrderId })
    });

    const res = await cancelAttempt({ request: req } as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.already_cancelled).toBe(true);
  });
});
