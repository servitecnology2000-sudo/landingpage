import { supabaseAdmin } from './supabase';
import { sendOrderConfirmationEmail } from './mailer';

export interface ReconcileResult {
	success: boolean;
	alreadyProcessed: boolean;
	orderId: string;
	error?: string;
}

/**
 * Servicio unificado e idempotente de conciliación de pedidos aprobados.
 * Es invocado de forma segura tanto por el Webhook de Mercado Pago como por
 * la pantalla de retorno /pedido/[id] (doble conciliación a prueba de fallos).
 */
export async function reconcileApprovedOrder({
	orderId,
	paymentId
}: {
	orderId: string;
	paymentId?: string | number | null;
}): Promise<ReconcileResult> {
	try {
		if (!orderId) {
			return { success: false, alreadyProcessed: false, orderId: '', error: 'orderId es requerido' };
		}

		// 1. Consultar orden actual en Supabase
		const { data: order, error: orderErr } = await supabaseAdmin
			.from('orders')
			.select('*')
			.eq('id', orderId)
			.single();

		if (orderErr || !order) {
			console.error(`[reconcileApprovedOrder] No se encontró la orden ${orderId}:`, orderErr);
			return { success: false, alreadyProcessed: false, orderId, error: 'Orden no encontrada' };
		}

		const strPaymentId = paymentId ? String(paymentId) : null;

		// 2. IDEMPOTENCIA: Si ya está aprobada, no repetir descuento de stock ni correos
		if (order.payment_status === 'aprobado') {
			// Si no tenía mp_payment_id y ahora lo tenemos, actualizarlo
			if (strPaymentId && !order.mp_payment_id) {
				await supabaseAdmin
					.from('orders')
					.update({
						mp_payment_id: strPaymentId,
						updated_at: new Date().toISOString()
					})
					.eq('id', orderId);
			}
			return { success: true, alreadyProcessed: true, orderId };
		}

		// 3. Actualizar estado de la orden a 'aprobado' y registrar N° Operación MP
		const { error: updateErr } = await supabaseAdmin
			.from('orders')
			.update({
				payment_status: 'aprobado',
				mp_payment_id: strPaymentId,
				updated_at: new Date().toISOString()
			})
			.eq('id', orderId);

		if (updateErr) {
			console.error(`[reconcileApprovedOrder] Error actualizando orden ${orderId}:`, updateErr);
			return { success: false, alreadyProcessed: false, orderId, error: updateErr.message };
		}

		// 4. Decrementar stock definitivo en repuestos_productos por cada item
		if (order.items && Array.isArray(order.items)) {
			for (const item of order.items) {
				try {
					const qtyPurchased = Math.max(1, parseInt(item.cantidad, 10) || 1);
					const { data: currentProduct } = await supabaseAdmin
						.from('repuestos_productos')
						.select('stock_cantidad')
						.eq('sku', item.sku)
						.single();

					if (currentProduct) {
						const newStock = Math.max(0, currentProduct.stock_cantidad - qtyPurchased);
						await supabaseAdmin
							.from('repuestos_productos')
							.update({ stock_cantidad: newStock })
							.eq('sku', item.sku);

						console.log(`[reconcileApprovedOrder] Stock actualizado para SKU ${item.sku}: ${currentProduct.stock_cantidad} -> ${newStock}`);
					}
				} catch (stockErr) {
					console.error(`[reconcileApprovedOrder] Error decrementando stock para SKU ${item.sku}:`, stockErr);
				}
			}
		}

		// 5. Enviar correo formal tanto al comprador como al vendedor
		if (order.customer_id) {
			try {
				const { data: customer } = await supabaseAdmin
					.from('customers')
					.select('*')
					.eq('id', order.customer_id)
					.single();

				if (customer) {
					await sendOrderConfirmationEmail({
						orderId: order.id,
						customerName: customer.full_name,
						customerEmail: customer.email,
						customerRut: customer.rut || '',
						customerPhone: customer.phone || '',
						customerAddress: order.shipping_address || customer.address || '',
						items: order.items || [],
						totalAmount: order.total_amount,
						deliveryType: order.delivery_type,
						commune: order.commune || '',
						paymentId: strPaymentId || undefined
					});
					console.log(`[reconcileApprovedOrder] Correo de confirmación enviado exitosamente a ${customer.email} y administradores`);
				}
			} catch (mailErr) {
				console.error('[reconcileApprovedOrder] Error al enviar correo de confirmación:', mailErr);
			}
		}

		return { success: true, alreadyProcessed: false, orderId };
	} catch (err: any) {
		console.error('[reconcileApprovedOrder] Excepción general:', err);
		return { success: false, alreadyProcessed: false, orderId, error: err.message };
	}
}
