import type { APIRoute } from 'astro';
import { supabase, supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
	try {
		// 1. Extraer token de autorización Bearer
		const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
		let token: string | null = null;

		if (authHeader && authHeader.startsWith('Bearer ')) {
			token = authHeader.replace('Bearer ', '').trim();
		}

		if (!token) {
			return new Response(JSON.stringify({
				success: false,
				error: 'No autorizado. Debes iniciar sesión con tu cuenta de Google para ver tus pedidos.'
			}), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 2. Validar token con Supabase Auth
		const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

		if (authErr || !user || !user.email) {
			return new Response(JSON.stringify({
				success: false,
				error: 'Sesión inválida o expirada. Por favor vuelve a identificarte.'
			}), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const userEmail = user.email.trim().toLowerCase();

		// 3. Vinculación Inteligente Retroactiva:
		// Si existen compras realizadas previamente como invitado con el mismo correo electrónico,
		// enlazar automáticamente auth_user_id y actualizar customer_type a 'registrado'
		try {
			await supabaseAdmin
				.from('customers')
				.update({
					auth_user_id: user.id,
					customer_type: 'registrado',
					updated_at: new Date().toISOString()
				})
				.eq('email', userEmail)
				.is('auth_user_id', null);
		} catch (linkErr) {
			console.warn('Aviso en vinculación automática de pedidos:', linkErr);
		}

		// 4. Obtener todos los IDs de clientes asociados a este usuario (por auth_user_id o email)
		const { data: customerRows, error: custErr } = await supabaseAdmin
			.from('customers')
			.select('*')
			.or(`auth_user_id.eq.${user.id},email.eq.${userEmail}`);

		if (custErr) {
			console.error('Error consultando perfiles de cliente:', custErr);
			return new Response(JSON.stringify({
				success: false,
				error: 'Error al consultar datos de cliente en la base de datos'
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (!customerRows || customerRows.length === 0) {
			return new Response(JSON.stringify({
				success: true,
				orders: [],
				customer: {
					id: user.id,
					full_name: user.user_metadata?.full_name || userEmail.split('@')[0],
					email: userEmail
				}
			}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const customerIds = customerRows.map(c => c.id);
		const primaryCustomer = customerRows.find(c => c.auth_user_id === user.id) || customerRows[0];

		// 5. Consultar las órdenes de compra asociadas ordenadas cronológicamente
		const { data: orders, error: ordersErr } = await supabaseAdmin
			.from('orders')
			.select('*')
			.in('customer_id', customerIds)
			.order('created_at', { ascending: false });

		if (ordersErr) {
			console.error('Error consultando órdenes de compra:', ordersErr);
			return new Response(JSON.stringify({
				success: false,
				error: 'Error al consultar órdenes de compra del cliente'
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({
			success: true,
			orders: orders || [],
			customer: primaryCustomer
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (err: any) {
		console.error('Excepción en /api/account/orders:', err);
		return new Response(JSON.stringify({
			success: false,
			error: err.message || 'Error interno del servidor'
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
