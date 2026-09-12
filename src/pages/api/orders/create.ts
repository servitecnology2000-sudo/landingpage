import type { APIRoute } from 'astro';
import { supabase, supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

// Generador de ID con formato ST-2026-XXXX
function generateOrderId(): string {
	const randomNum = Math.floor(1000 + Math.random() * 9000);
	return `ST-2026-${randomNum}`;
}

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		const {
			full_name,
			email,
			phone,
			rut,
			delivery_type,
			commune,
			address,
			shipping_cost,
			items
		} = body;

		if (!full_name || !email || !phone || !rut || !items || !Array.isArray(items) || items.length === 0) {
			return new Response(JSON.stringify({ error: 'Faltan campos obligatorios para el pedido' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Calcular totales
		let subtotal = 0;
		for (const item of items) {
			const qty = Math.max(1, parseInt(item.cantidad, 10) || 1);
			const price = parseFloat(item.precio_venta) || 0;
			subtotal += price * qty;
		}

		const shipCost = delivery_type === 'delivery_rm' ? Math.max(0, parseInt(shipping_cost, 10) || 0) : 0;
		const total_amount = subtotal + shipCost;

		// 1. Guardar o actualizar cliente
		let customerId: string | null = null;
		try {
			const { data: customerData, error: customerError } = await supabaseAdmin
				.from('customers')
				.insert({
					full_name: full_name.trim(),
					email: email.trim().toLowerCase(),
					phone: phone.trim(),
					rut: rut.trim().toUpperCase()
				})
				.select('id')
				.single();

			if (!customerError && customerData) {
				customerId = customerData.id;
			}
		} catch (cErr) {
			console.warn('Advertencia al insertar cliente (posible tabla pendiente en Supabase):', cErr);
		}

		// 2. Validación estricta de stock disponible en Supabase antes de crear la orden
		for (const item of items) {
			if (item.sku) {
				const requestedQty = Math.max(1, parseInt(item.cantidad, 10) || 1);
				const { data: prod } = await supabaseAdmin
					.from('repuestos_productos')
					.select('sku, titulo, stock_cantidad')
					.eq('sku', item.sku)
					.maybeSingle();

				if (prod) {
					const stockDisponible = Math.max(0, parseInt(prod.stock_cantidad, 10) || 0);
					if (stockDisponible < requestedQty) {
						return new Response(JSON.stringify({
							success: false,
							error: `Stock insuficiente para "${prod.titulo}". Disponible: ${stockDisponible}, Solicitado: ${requestedQty}.`
						}), {
							status: 400,
							headers: { 'Content-Type': 'application/json' }
						});
					}
				}
			}
		}

		// 3. Generar ID único ST-2026-XXXX
		const orderId = generateOrderId();
		const reservedUntil = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 horas

		const orderRecord = {
			id: orderId,
			customer_id: customerId,
			items: items.map(item => ({
				sku: item.sku || '',
				titulo: item.titulo || '',
				precio_venta: parseFloat(item.precio_venta) || 0,
				cantidad: Math.max(1, parseInt(item.cantidad, 10) || 1),
				imagen: item.imagen || ''
			})),
			delivery_type: delivery_type === 'delivery_rm' ? 'delivery_rm' : 'retiro',
			commune: delivery_type === 'delivery_rm' ? (commune || '') : 'Retiro en Oficina',
			shipping_cost: shipCost,
			total_amount,
			payment_status: 'pendiente',
			order_status: 'preparacion',
			stock_reserved_until: reservedUntil,
			created_at: new Date().toISOString()
		};

		// 4. Insertar en tabla orders en Supabase
		let orderSavedInDb = false;
		try {
			const { error: orderError } = await supabaseAdmin
				.from('orders')
				.insert(orderRecord);

			if (!orderError) {
				orderSavedInDb = true;

				// 4. Lógica de reserva temporal de stock por 2 horas: decrementar stock_cantidad
				for (const item of items) {
					if (item.sku) {
						try {
							const { data: prod } = await supabaseAdmin
								.from('repuestos_productos')
								.select('stock_cantidad')
								.eq('sku', item.sku)
								.single();

							if (prod && prod.stock_cantidad !== undefined) {
								const newStock = Math.max(0, prod.stock_cantidad - (parseInt(item.cantidad, 10) || 1));
								await supabaseAdmin
									.from('repuestos_productos')
									.update({ stock_cantidad: newStock })
									.eq('sku', item.sku);
							}
						} catch (sErr) {
							console.warn('Error reservando stock de producto:', sErr);
						}
					}
				}
			} else {
				console.warn('Aviso al insertar pedido en BD (puede requerir ejecutar ecommerce_schema.sql):', orderError.message);
			}
		} catch (oErr) {
			console.warn('Excepción guardando pedido en BD:', oErr);
		}

		return new Response(JSON.stringify({
			success: true,
			orderId,
			order: {
				...orderRecord,
				customer: {
					full_name,
					email,
					phone,
					rut,
					address: address || ''
				},
				orderSavedInDb
			}
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (err: any) {
		console.error('Error procesando pedido:', err);
		return new Response(JSON.stringify({ error: err.message || 'Error interno del servidor' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
