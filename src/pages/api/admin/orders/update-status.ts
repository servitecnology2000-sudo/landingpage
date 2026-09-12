import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase';
import {
	sendOrderShippedEmail,
	sendOrderReadyForPickupEmail,
	sendOrderConfirmationEmail
} from '../../../../lib/mailer';

export const prerender = false;

const VALID_ORDER_STATUSES = ['preparacion', 'despachado', 'listo_retiro', 'entregado', 'cancelado'];
const VALID_PAYMENT_STATUSES = ['pendiente', 'en_revision', 'aprobado', 'rechazado', 'cancelado'];

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		// 1. Control de acceso administrativo (Auth Guard)
		const _env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string>);
		const adminSecret = _env['ADMIN_SECRET'] || import.meta.env.ADMIN_SECRET || '';
		
		const sessionCookie = cookies.get('admin_session')?.value;
		const authHeader = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
		const token = sessionCookie || authHeader;

		if (!adminSecret || token !== adminSecret) {
			return new Response(JSON.stringify({
				success: false,
				error: 'No autorizado. Sesión de administración inválida o expirada.'
			}), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 2. Parseo y validación de Payload
		let body: any;
		try {
			body = await request.json();
		} catch (e) {
			return new Response(JSON.stringify({
				success: false,
				error: 'Cuerpo de petición inválido (JSON esperado).'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const {
			order_id,
			order_status,
			payment_status,
			courier,
			tracking_number,
			admin_notes,
			notify_customer = true
		} = body;

		if (!order_id || typeof order_id !== 'string') {
			return new Response(JSON.stringify({
				success: false,
				error: 'El campo "order_id" es obligatorio.'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (order_status && !VALID_ORDER_STATUSES.includes(order_status)) {
			return new Response(JSON.stringify({
				success: false,
				error: `Estado de orden inválido. Estados permitidos: ${VALID_ORDER_STATUSES.join(', ')}.`
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (payment_status && !VALID_PAYMENT_STATUSES.includes(payment_status)) {
			return new Response(JSON.stringify({
				success: false,
				error: `Estado de pago inválido. Estados permitidos: ${VALID_PAYMENT_STATUSES.join(', ')}.`
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Si se marca como despachado, exigir Courier y Tracking Number
		if (order_status === 'despachado') {
			if (!courier || typeof courier !== 'string' || !courier.trim()) {
				return new Response(JSON.stringify({
					success: false,
					error: 'Para marcar un pedido como despachado, debes indicar la empresa de transporte (Courier).'
				}), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			if (!tracking_number || typeof tracking_number !== 'string' || !tracking_number.trim()) {
				return new Response(JSON.stringify({
					success: false,
					error: 'Para marcar un pedido como despachado, el Número de Seguimiento (Tracking) es obligatorio.'
				}), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}

		// 3. Obtener el pedido actual desde Supabase
		const { data: currentOrder, error: fetchErr } = await supabaseAdmin
			.from('orders')
			.select(`
				*,
				customers (
					id,
					full_name,
					email,
					phone,
					rut,
					address
				)
			`)
			.eq('id', order_id.trim())
			.single();

		if (fetchErr || !currentOrder) {
			return new Response(JSON.stringify({
				success: false,
				error: `No se encontró la orden con identificador ${order_id}.`
			}), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 4. Construir objeto de actualización
		const updatePayload: Record<string, any> = {
			updated_at: new Date().toISOString()
		};

		if (order_status) {
			updatePayload.order_status = order_status;
			if (order_status === 'despachado') {
				updatePayload.courier = courier.trim();
				updatePayload.tracking_number = tracking_number.trim();
				updatePayload.shipped_at = new Date().toISOString();
			} else if (order_status === 'listo_retiro') {
				updatePayload.ready_pickup_at = new Date().toISOString();
			}
		}

		if (payment_status) {
			updatePayload.payment_status = payment_status;
		}

		if (admin_notes !== undefined) {
			updatePayload.admin_notes = admin_notes ? String(admin_notes).trim() : null;
		}

		// 5. Ejecutar actualización en Supabase
		const { data: updatedOrder, error: updateErr } = await supabaseAdmin
			.from('orders')
			.update(updatePayload)
			.eq('id', order_id.trim())
			.select(`
				*,
				customers (
					id,
					full_name,
					email,
					phone,
					rut,
					address
				)
			`)
			.single();

		if (updateErr || !updatedOrder) {
			console.error('Error al actualizar orden en Supabase:', updateErr);
			return new Response(JSON.stringify({
				success: false,
				error: 'Error al actualizar pedido en base de datos: ' + (updateErr?.message || 'Error desconocido')
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 6. Notificaciones condicionales por correo electrónico
		let emailSent = false;
		const customer = updatedOrder.customers || {};
		const customerEmail = customer.email;
		const customerName = customer.full_name || 'Cliente';

		if (notify_customer && customerEmail) {
			// A. Notificación de Despacho
			if (order_status === 'despachado') {
				try {
					emailSent = await sendOrderShippedEmail({
						orderId: updatedOrder.id,
						customerName,
						customerEmail,
						courier: updatedOrder.courier || courier,
						trackingNumber: updatedOrder.tracking_number || tracking_number,
						shippingAddress: updatedOrder.shipping_address,
						commune: updatedOrder.commune,
						items: updatedOrder.items || []
					});
				} catch (mailErr) {
					console.error('Fallo al enviar correo de despacho:', mailErr);
				}
			}
			// B. Notificación de Retiro en Sucursal
			else if (order_status === 'listo_retiro') {
				try {
					emailSent = await sendOrderReadyForPickupEmail({
						orderId: updatedOrder.id,
						customerName,
						customerEmail,
						items: updatedOrder.items || []
					});
				} catch (mailErr) {
					console.error('Fallo al enviar correo de retiro:', mailErr);
				}
			}
			// C. Confirmación de Pago Aprobado Manual (Transferencias)
			else if (payment_status === 'aprobado' && currentOrder.payment_status !== 'aprobado') {
				try {
					emailSent = await sendOrderConfirmationEmail({
						orderId: updatedOrder.id,
						customerName,
						customerEmail,
						customerRut: customer.rut || '',
						customerPhone: customer.phone || '',
						customerAddress: updatedOrder.shipping_address || '',
						items: updatedOrder.items || [],
						totalAmount: Number(updatedOrder.total_amount) || 0,
						deliveryType: updatedOrder.delivery_type,
						commune: updatedOrder.commune || ''
					});
				} catch (mailErr) {
					console.error('Fallo al enviar correo de confirmación de pago manual:', mailErr);
				}
			}
		}

		return new Response(JSON.stringify({
			success: true,
			message: 'Pedido actualizado exitosamente',
			order: updatedOrder,
			emailSent
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (err: any) {
		console.error('Excepción no controlada en /api/admin/orders/update-status:', err);
		return new Response(JSON.stringify({
			success: false,
			error: err.message || 'Error interno del servidor'
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
