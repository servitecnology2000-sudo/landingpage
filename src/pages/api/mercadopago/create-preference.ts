import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { preferenceClient, isMercadoPagoConfigured, isSandbox } from '../../../lib/mercadopago';

export const prerender = false;

// Generador de identificador único de orden con formato ST-2026-XXXX
function generateOrderId(): string {
	const randomNum = Math.floor(1000 + Math.random() * 9000);
	return `ST-2026-${randomNum}`;
}

export const POST: APIRoute = async ({ request, url }) => {
	try {
		const body = await request.json();
		const { customer_id, delivery_type, commune, address, items } = body;

		if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
			return new Response(JSON.stringify({
				success: false,
				error: 'Faltan parámetros obligatorios: customer_id y lista de items son requeridos.'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 1. Obtener datos del cliente en Supabase
		const { data: customer, error: customerErr } = await supabaseAdmin
			.from('customers')
			.select('*')
			.eq('id', customer_id)
			.single();

		if (customerErr || !customer) {
			return new Response(JSON.stringify({
				success: false,
				error: 'No se encontró el perfil del cliente. Por favor completa tus datos en el paso anterior.'
			}), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 2. VALIDACIÓN ESTRICTA ANTI-FRAUDE DE PRECIOS Y STOCK EN SERVIDOR
		// Consultar la tabla repuestos_productos para validar que cada producto exista, tenga stock y tomar su precio real
		const skus = items.map((it: any) => it.sku).filter(Boolean);
		const { data: dbProducts, error: dbErr } = await supabaseAdmin
			.from('repuestos_productos')
			.select('id, sku, titulo, precio_venta, stock_cantidad, imagenes')
			.in('sku', skus);

		if (dbErr || !dbProducts) {
			return new Response(JSON.stringify({
				success: false,
				error: 'Error consultando inventario de repuestos: ' + (dbErr?.message || 'Error desconocido')
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const dbProductMap = new Map(dbProducts.map(p => [p.sku, p]));
		const validatedOrderItems: any[] = [];
		const mpItemsPayload: any[] = [];
		let totalAmount = 0;

		for (const requestedItem of items) {
			const product = dbProductMap.get(requestedItem.sku);
			if (!product) {
				return new Response(JSON.stringify({
					success: false,
					error: `El producto con SKU ${requestedItem.sku} no existe o fue retirado del catálogo.`
				}), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			const requestedQty = Math.max(1, parseInt(requestedItem.cantidad, 10) || 1);

			// Validar stock disponible
			if (product.stock_cantidad < requestedQty) {
				return new Response(JSON.stringify({
					success: false,
					error: `Stock insuficiente para "${product.titulo}". Disponible: ${product.stock_cantidad}, Solicitado: ${requestedQty}.`
				}), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			const unitPrice = parseFloat(product.precio_venta) || 0;
			totalAmount += unitPrice * requestedQty;

			// Item validado para Supabase orders
			validatedOrderItems.push({
				sku: product.sku,
				titulo: product.titulo,
				precio_venta: unitPrice,
				cantidad: requestedQty,
				imagen: product.imagenes?.[0] || ''
			});

			// Item formateado para Mercado Pago SDK
			mpItemsPayload.push({
				id: product.sku,
				title: product.titulo,
				quantity: requestedQty,
				unit_price: unitPrice,
				currency_id: 'CLP',
				picture_url: product.imagenes?.[0] || undefined
			});
		}

		if (totalAmount <= 0) {
			return new Response(JSON.stringify({
				success: false,
				error: 'El monto total de la orden debe ser superior a $0 CLP.'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 3. Crear orden en public.orders en estado pendiente
		const orderId = generateOrderId();
		const orderRecord = {
			id: orderId,
			customer_id: customer.id,
			items: validatedOrderItems,
			delivery_type: delivery_type === 'retiro' ? 'retiro' : 'envio_nacional',
			commune: commune || 'Santiago Centro',
			shipping_address: address || customer.address || 'Retiro en Oficina',
			shipping_cost: 0, // Cobro en Destino
			total_amount: totalAmount,
			payment_status: 'pendiente',
			order_status: 'preparacion',
			mp_preference_id: null as string | null,
			created_at: new Date().toISOString()
		};

		const { error: orderInsertErr } = await supabaseAdmin
			.from('orders')
			.insert(orderRecord);

		if (orderInsertErr) {
			console.error('Error insertando orden en Supabase:', orderInsertErr);
			return new Response(JSON.stringify({
				success: false,
				error: 'Error al registrar el pedido preliminar: ' + orderInsertErr.message
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 4. Si Mercado Pago aún no tiene el Access Token configurado en .env (esperando aprobación)
		// Devolvemos modo simulación / fallback para no romper el flujo
		if (!isMercadoPagoConfigured) {
			return new Response(JSON.stringify({
				success: true,
				isPendingCredentials: true,
				orderId,
				message: 'Orden preliminar creada con éxito. Las credenciales de Mercado Pago están pendientes de aprobación en el .env.',
				redirectUrl: `/pedido/${orderId}?status=pending_credentials`
			}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 5. Generar Preferencia Oficial con el SDK de Mercado Pago
		// NOTA: Mercado Pago exige estrictamente que las back_urls sean URLs públicas con protocolo HTTPS válido para admitir auto_return
		const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
		const baseUrl = isLocalhost ? 'https://servitecnology.com' : url.origin;

		const payerEmail = isSandbox
			? (customer.email?.includes('@testuser.com') ? customer.email : (process.env['ML_PRUEBAS_COMPRADOR_EMAIL'] || 'test_user_4386276905329265909@testuser.com'))
			: customer.email;

		const preferenceData: any = {
			items: mpItemsPayload,
			payer: {
				name: isSandbox ? 'Comprador de Prueba' : customer.full_name,
				email: payerEmail,
				identification: {
					type: 'RUT',
					number: isSandbox ? '11111111-1' : (customer.rut || '')
				}
			},
			back_urls: {
				success: `${baseUrl}/pedido/${orderId}?payment=success`,
				failure: `${baseUrl}/checkout?payment=failure&order=${orderId}`,
				pending: `${baseUrl}/pedido/${orderId}?payment=pending`
			},
			auto_return: 'approved',
			external_reference: orderId,
			statement_descriptor: 'SERVITECNOLOGY',
			notification_url: `${baseUrl}/api/mercadopago/webhook`
		};

		const mpResponse = await preferenceClient.create({ body: preferenceData });

		// Actualizar orden con el preference_id de Mercado Pago
		if (mpResponse.id) {
			await supabaseAdmin
				.from('orders')
				.update({ mp_preference_id: mpResponse.id })
				.eq('id', orderId);
		}

		const effectiveInitPoint = isSandbox && mpResponse.sandbox_init_point
			? mpResponse.sandbox_init_point
			: (mpResponse.init_point || mpResponse.sandbox_init_point);

		return new Response(JSON.stringify({
			success: true,
			orderId,
			preferenceId: mpResponse.id,
			initPoint: effectiveInitPoint,
			sandboxInitPoint: mpResponse.sandbox_init_point,
			isSandbox
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (err: any) {
		console.error('Error en /api/mercadopago/create-preference:', err);
		return new Response(JSON.stringify({
			success: false,
			error: err.message || 'Error al conectar con la pasarela de pago de Mercado Pago'
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
