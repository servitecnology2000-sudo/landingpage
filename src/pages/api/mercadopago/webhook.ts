import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { mpClient } from '../../../lib/mercadopago';
import { Payment } from 'mercadopago';
import { reconcileApprovedOrder } from '../../../lib/order-reconciliation';

export const prerender = false;

// Webhook oficial de Mercado Pago para conciliación y actualización de órdenes
export const POST: APIRoute = async ({ request }) => {
	try {
		const url = new URL(request.url);
		const body = await request.json().catch(() => ({}));

		// Mercado Pago puede enviar el id del pago en el query param (?data.id=... o ?id=...) o en el body
		const paymentId =
			url.searchParams.get('data.id') ||
			url.searchParams.get('id') ||
			body?.data?.id ||
			body?.id;

		const type =
			url.searchParams.get('type') ||
			url.searchParams.get('topic') ||
			body?.type ||
			body?.action;

		// Si es una notificación de prueba o no contiene ID de pago, responder 200 para validar webhook
		if (!paymentId) {
			return new Response(JSON.stringify({ received: true, message: 'Webhook recibido sin paymentId' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		console.log(`[MercadoPago Webhook] Recibida notificación para ID: ${paymentId}, type: ${type}`);

		// Si es una notificación de merchant_order u order, responder 200 (se procesará cuando llegue la notificación de 'payment')
		if (type === 'merchant_order' || type === 'order' || url.searchParams.get('topic') === 'merchant_order' || url.searchParams.get('topic') === 'order') {
			console.log(`[MercadoPago Webhook] Notificación informativa de ${type || 'order'} ${paymentId} recibida.`);
			return new Response(JSON.stringify({ received: true, type: type || 'order' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 1. Consultar el estado real del pago en la API de Mercado Pago
		const paymentApi = new Payment(mpClient);
		const payment = await paymentApi.get({ id: paymentId });

		if (!payment) {
			console.warn(`[MercadoPago Webhook] No se encontró el pago ${paymentId} en Mercado Pago.`);
			return new Response(JSON.stringify({ received: true, error: 'Pago no encontrado en Mercado Pago' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const orderId = payment.external_reference; // ST-2026-XXXX
		const status = payment.status; // 'approved', 'rejected', 'pending', 'cancelled'

		if (!orderId) {
			console.warn(`[MercadoPago Webhook] El pago ${paymentId} no tiene external_reference asociado.`);
			return new Response(JSON.stringify({ received: true, message: 'Sin external_reference' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 2. Buscar la orden correspondiente en Supabase
		const { data: order, error: orderErr } = await supabaseAdmin
			.from('orders')
			.select('*')
			.eq('id', orderId)
			.single();

		if (orderErr || !order) {
			console.error(`[MercadoPago Webhook] No se encontró la orden ${orderId} en la base de datos.`);
			return new Response(JSON.stringify({ received: true, error: 'Orden no encontrada en Supabase' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 3. IDEMPOTENCIA: Si la orden ya estaba aprobada, no volver a procesar ni decrementar stock
		if (order.payment_status === 'aprobado') {
			console.log(`[MercadoPago Webhook] La orden ${orderId} ya se encuentra aprobada previamente. Omitiendo duplicados.`);
			return new Response(JSON.stringify({ received: true, message: 'Orden ya procesada con anterioridad' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 4. SI EL PAGO FUE APROBADO ('approved')
		if (status === 'approved') {
			console.log(`[MercadoPago Webhook] Pago APROBADO para orden ${orderId}. Ejecutando conciliación unificada...`);
			await reconcileApprovedOrder({
				orderId,
				paymentId: String(paymentId)
			});
		} else if (status === 'rejected' || status === 'cancelled') {
			console.log(`[MercadoPago Webhook] Pago ${status} para la orden ${orderId}`);
			await supabaseAdmin
				.from('orders')
				.update({
					payment_status: status === 'rejected' ? 'rechazado' : 'cancelado',
					order_status: 'cancelado',
					stock_reserved_until: new Date(Date.now() - 1000).toISOString(),
					mp_payment_id: String(paymentId),
					updated_at: new Date().toISOString()
				})
				.eq('id', orderId);
		}

		return new Response(JSON.stringify({ received: true, status }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (err: any) {
		console.error('[MercadoPago Webhook] Error procesando notificación:', err);
		// Responder 200 para evitar que Mercado Pago reintente infinitamente ante errores no críticos
		return new Response(JSON.stringify({ received: true, error: err.message }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

// Responder GET 200 para pruebas de conectividad de webhook
export const GET: APIRoute = async () => {
	return new Response(JSON.stringify({ status: 'active', service: 'MercadoPago Webhook SERVITECNOLOGY' }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
};
