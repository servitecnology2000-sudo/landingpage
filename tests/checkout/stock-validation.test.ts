import { describe, it, expect } from 'vitest';
import { addToCart, updateItemQuantity, getCart, clearCart, saveCart } from '../../src/lib/cart';
import { POST as validateStockRoute } from '../../src/pages/api/cart/validate-stock';
import { POST as createOrderRoute } from '../../src/pages/api/orders/create';

describe('Validación de Stock en Carrito y Checkout', () => {
  it('addToCart debe limitar la cantidad si supera el stock_disponible', () => {
    clearCart();
    const item = {
      sku: 'TEST-STOCK-SKU-1',
      titulo: 'Producto Test 1',
      precio_venta: 10000,
      cantidad: 1,
      imagen: '',
      stock_disponible: 1
    };

    // Primera adición exitosa
    const res1 = addToCart(item);
    expect(res1.success).toBe(true);

    // Intentar agregar otra unidad cuando solo hay 1 disponible
    const res2 = addToCart({ ...item, cantidad: 1 });
    expect(res2.success).toBe(false);
    expect(res2.clamped).toBe(true);
    expect(res2.newQty).toBe(1);

    const cart = getCart();
    expect(cart.find(i => i.sku === item.sku)?.cantidad).toBe(1);
    clearCart();
  });

  it('updateItemQuantity debe respetar el maxStockLimit y no permitir excederlo', () => {
    clearCart();
    saveCart([{
      sku: 'A2514_DSM',
      titulo: 'Adaptador de Corriente Samsung',
      precio_venta: 12900,
      cantidad: 1,
      imagen: '',
      stock_disponible: 1
    }]);

    // Intentar subir a 2 cuando el límite es 1
    const res = updateItemQuantity('A2514_DSM', 2, 1);
    expect(res.clamped).toBe(true);
    expect(res.newQty).toBe(1);

    const cart = getCart();
    expect(cart[0].cantidad).toBe(1);
    clearCart();
  });

  it('/api/cart/validate-stock debe devolver stock real de Supabase para A2514_DSM', async () => {
    const req = new Request('http://localhost:4321/api/cart/validate-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skus: ['A2514_DSM'] })
    });

    const res = await validateStockRoute({ request: req } as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.stocks['A2514_DSM']).toBeDefined();
    expect(data.stocks['A2514_DSM'].stock).toBe(1);
    expect(data.stocks['A2514_DSM'].is_available).toBe(true);
  });

  it('/api/orders/create debe rechazar pedido si la cantidad solicitada supera el stock físico', async () => {
    const req = new Request('http://localhost:4321/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Comprador Test',
        email: 'test@servitecnology.com',
        phone: '+56912345678',
        rut: '12.345.678-5',
        delivery_type: 'retiro',
        items: [
          { sku: 'A2514_DSM', titulo: 'Adaptador de Corriente Samsung', cantidad: 5, precio_venta: 12900 }
        ]
      })
    });

    const res = await createOrderRoute({ request: req } as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Stock insuficiente');
  });
});
