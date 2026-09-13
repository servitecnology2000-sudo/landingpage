import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { orderClient, preferenceClient, isMercadoPagoConfigured, isSandbox } from '../../../lib/mercadopago';
import { validateRut, formatRut } from '../../../lib/rut';

export const prerender = false;

// Generador de identificador único de orden con formato ST-2026-XXXX
function generateOrderId(): string {
	const randomNum = Math.floor(1000 + Math.random() * 9000);
	return `ST-2026-${randomNum}`;
}

export const POST: APIRoute = async ({ request, url }) => {
	try {
		const body = await request.json();
		const { customer_id, customer: customerPayload, delivery_type, commune, address, items } = body;

		if (!items || !Array.isArray(items) || items.length === 0) {
			return new Response(JSON.stringify({
				success: false,
				error: 'La lista de items en el pedido es obligatoria.'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 1. Normalización y validación condicional del método de entrega
		const normDeliveryType = (delivery_type === 'envio_cobro_destino' || delivery_type === 'envio_nacional') 
			? 'envio_nacional' 
			: 'retiro';

		if (normDeliveryType === 'envio_nacional') {
			if (!address || typeof address !== 'string' || !address.trim()) {
				return new Response(JSON.stringify({
					success: false,
					error: 'La dirección de entrega es obligatoria para la modalidad de envío por pagar.'
				}), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			if (!commune || typeof commune !== 'string' || !commune.trim()) {
				return new Response(JSON.stringify({
					success: false,
					error: 'La comuna de destino es obligatoria para la modalidad de envío por pagar.'
				}), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}

		const effectiveAddress = normDeliveryType === 'retiro'
			? (address?.trim() || 'Retiro en Oficina Técnica (Santiago Centro)')
			: address.trim();

		const effectiveCommune = normDeliveryType === 'retiro'
			? (commune?.trim() || 'Santiago Centro')
			: commune.trim();

		// 2. Obtener o crear perfil de cliente en public.customers (Soporte Invitado & Registrado)
		let customer: any = null;

		if (customer_id) {
			const { data: existingById } = await supabaseAdmin
				.from('customers')
				.select('*')
				.eq('id', customer_id)
				.maybeSingle();

			if (existingById) {
				customer = existingById;
			}
		}

		if (!customer && customerPayload) {
			const { full_name, email, phone, rut, auth_user_id } = customerPayload;

			if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
				return new Response(JSON.stringify({
					success: false,
					error: 'El Nombre y Apellido o Razón Social es obligatorio para la emisión de la factura SII.'
				}), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			if (!rut || !validateRut(rut)) {
				return new Response(JSON.stringify({
					success: false,
					error: 'El RUT ingresado no es válido según el algoritmo del SII (Módulo 11).'
				}), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			if (!email || typeof email !== 'string' || !email.includes('@')) {
				return new Response(JSON.stringify({
					success: false,
					error: 'El correo electrónico es obligatorio y debe tener un formato válido.'
				}), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
				return new Response(JSON.stringify({
					success: false,
					error: 'El teléfono de contacto es obligatorio para la coordinación de despacho/entrega.'
				}), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			const cleanEmail = email.trim().toLowerCase();
			const formattedRut = formatRut(rut);

			// Buscar si ya existe por RUT o Email
			const { data: existingCustomer } = await supabaseAdmin
				.from('customers')
				.select('*')
				.or(`rut.eq.${formattedRut},email.eq.${cleanEmail}`)
				.limit(1)
				.maybeSingle();

			if (existingCustomer) {
				const updateFields: any = {
					full_name: full_name.trim(),
					email: cleanEmail,
					phone: phone.trim(),
					address: effectiveAddress,
					updated_at: new Date().toISOString()
				};
				if (auth_user_id && !existingCustomer.auth_user_id) {
					updateFields.auth_user_id = auth_user_id;
					updateFields.customer_type = 'registrado';
				}
				const { data: updatedCustomer } = await supabaseAdmin
					.from('customers')
					.update(updateFields)
					.eq('id', existingCustomer.id)
					.select()
					.single();

				customer = updatedCustomer || existingCustomer;
			} else {
				const { data: newCustomer, error: insertCustomerErr } = await supabaseAdmin
					.from('customers')
					.insert({
						full_name: full_name.trim(),
						email: cleanEmail,
						phone: phone.trim(),
						rut: formattedRut,
						address: effectiveAddress,
						customer_type: auth_user_id ? 'registrado' : 'invitado',
						auth_user_id: auth_user_id || null,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString()
					})
					.select()
					.single();

				if (insertCustomerErr || !newCustomer) {
					console.error('Error insertando cliente invitado:', insertCustomerErr);
					return new Response(JSON.stringify({
						success: false,
						error: 'Error al registrar perfil de cliente: ' + (insertCustomerErr?.message || 'Error desconocido')
					}), {
						status: 500,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				customer = newCustomer;
			}
		}

		if (!customer) {
			return new Response(JSON.stringify({
				success: false,
				error: 'Faltan datos del comprador. Por favor completa tus datos de facturación SII.'
			}), {
				status: 400,
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
			delivery_type: normDeliveryType,
			commune: effectiveCommune,
			shipping_address: effectiveAddress,
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

		// 5. Estrategia Dual de Pago: Intentar API de Orders (nueva) y fallback a API de Preferences (clásica)
		// NOTA: Mercado Pago exige estrictamente que las URLs sean públicas con protocolo HTTPS válido para admitir auto_return
		const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
		const baseUrl = isLocalhost ? 'https://servitecnology.com' : url.origin;

		const payerEmail = isSandbox
			? (customer.email?.includes('@testuser.com') ? customer.email : (process.env['ML_PRUEBAS_COMPRADOR_EMAIL'] || 'test_user_4386276905329265909@testuser.com'))
			: customer.email;

		let checkoutUrl: string | null = null;
		let checkoutId: string | null = null;

		// Intento 1: API de Orders (Estándar moderno unificado de Mercado Pago /v1/orders)
		try {
			const orderPayload: any = {
				type: 'online',
				processing_mode: 'manual',
				total_amount: String(totalAmount),
				external_reference: orderId,
				description: `Pedido ${orderId} - SERVITECNOLOGY`,
				payer: {
					email: payerEmail,
					identification: {
						type: isSandbox ? 'Otro' : 'RUT',
						number: isSandbox ? '123456789' : (customer.rut || '')
					}
				},
				items: validatedOrderItems.map(it => ({
					title: it.titulo,
					quantity: it.cantidad,
					unit_price: String(it.precio_venta)
				})),
				config: {
					statement_descriptor: 'SERVITECNOLOGY',
					online: {
						success_url: `${baseUrl}/pedido/${orderId}?payment=success`,
						failure_url: `${baseUrl}/checkout?payment=failure&order=${orderId}`,
						pending_url: `${baseUrl}/pedido/${orderId}?payment=pending`,
						auto_return: 'approved',
						callback_url: `${baseUrl}/api/mercadopago/webhook`
					}
				}
			};

			const orderResponse: any = await orderClient.create({ body: orderPayload });
			if (orderResponse?.checkout_url) {
				checkoutUrl = orderResponse.checkout_url;
				checkoutId = orderResponse.id || null;
				console.log(`[create-preference] Orden generada exitosamente con API de Orders (ID: ${checkoutId})`);
			}
		} catch (orderError: any) {
			console.warn('[create-preference] Orders API no disponible para este token o cuenta, recurriendo a Preferences API:', orderError?.message || orderError);
		}

		// Intento 2 (Fallback transparente): API de Preferences (Checkout Pro clásico)
		if (!checkoutUrl) {
			const preferenceData: any = {
				items: mpItemsPayload,
				payer: {
					name: isSandbox ? 'Comprador de Prueba' : customer.full_name,
					email: payerEmail,
					identification: {
						type: isSandbox ? 'Otro' : 'RUT',
						number: isSandbox ? '123456789' : (customer.rut || '')
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
			// Usar init_point oficial para evitar bucles de redirección entre sandbox.mercadopago.cl y mercadopago.cl (ERR_TOO_MANY_REDIRECTS)
			checkoutUrl = mpResponse.init_point || mpResponse.sandbox_init_point || null;
			checkoutId = mpResponse.id || null;
		}

		if (!checkoutUrl) {
			throw new Error('No se pudo obtener la URL de checkout de Mercado Pago');
		}

		// Actualizar orden con el preference_id / order_id de Mercado Pago
		if (checkoutId) {
			await supabaseAdmin
				.from('orders')
				.update({ mp_preference_id: checkoutId })
				.eq('id', orderId);
		}

		return new Response(JSON.stringify({
			success: true,
			orderId,
			preferenceId: checkoutId,
			initPoint: checkoutUrl,
			checkoutUrl,
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
