import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	try {
		let body: any;
		try {
			body = await request.json();
		} catch {
			return new Response(JSON.stringify({
				success: false,
				error: 'Cuerpo de petición inválido (JSON esperado).'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const { order_id, reason } = body || {};

		if (!order_id || typeof order_id !== 'string') {
			return new Response(JSON.stringify({
				success: false,
				error: 'El campo "order_id" es obligatorio.'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const cleanOrderId = order_id.trim().toUpperCase();

		// Consultar estado actual de la orden en Supabase
		const { data: order, error: fetchErr } = await supabaseAdmin
			.from('orders')
			.select('id, payment_status, order_status, stock_reserved_until')
			.eq('id', cleanOrderId)
			.maybeSingle();

		if (fetchErr) {
			console.error(`[cancel-attempt] Error consultando orden ${cleanOrderId}:`, fetchErr);
			return new Response(JSON.stringify({
				success: false,
				error: 'Error al consultar la orden.'
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (!order) {
			return new Response(JSON.stringify({
				success: false,
				error: `No se encontró la orden ${cleanOrderId}.`
			}), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Si la orden ya fue aprobada, no cancelarla
		if (order.payment_status === 'aprobado') {
			return new Response(JSON.stringify({
				success: false,
				error: 'La orden ya se encuentra aprobada y no puede ser cancelada.'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Si ya está cancelada, responder éxito idempotente
		if (order.payment_status === 'cancelado' && order.order_status === 'cancelado') {
			return new Response(JSON.stringify({
				success: true,
				order_id: cleanOrderId,
				status: 'cancelado',
				already_cancelled: true
			}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Actualizar orden a cancelado y liberar reserva de stock inmediatamente
		const note = reason && typeof reason === 'string' 
			? reason.trim() 
			: 'Intento de pago cancelado por el cliente al retornar de pasarela Mercado Pago';

		const { error: updateErr } = await supabaseAdmin
			.from('orders')
			.update({
				payment_status: 'cancelado',
				order_status: 'cancelado',
				stock_reserved_until: new Date(Date.now() - 1000).toISOString(),
				admin_notes: note,
				updated_at: new Date().toISOString()
			})
			.eq('id', cleanOrderId);

		if (updateErr) {
			console.error(`[cancel-attempt] Error cancelando orden ${cleanOrderId}:`, updateErr);
			return new Response(JSON.stringify({
				success: false,
				error: 'Error al actualizar el estado de la orden.'
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		console.log(`[cancel-attempt] Orden ${cleanOrderId} cancelada y stock liberado.`);

		return new Response(JSON.stringify({
			success: true,
			order_id: cleanOrderId,
			status: 'cancelado',
			stock_released: true
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (err: any) {
		console.error('[cancel-attempt] Error no controlado:', err);
		return new Response(JSON.stringify({
			success: false,
			error: err.message || 'Error interno del servidor.'
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
