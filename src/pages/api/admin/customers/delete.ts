import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		// 1. Control de Acceso Administrativo
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

		// 2. Parseo de datos
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

		const { customer_id } = body;

		if (!customer_id || typeof customer_id !== 'string') {
			return new Response(JSON.stringify({
				success: false,
				error: 'El campo "customer_id" es obligatorio.'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 3. Desvincular órdenes asociadas de forma segura (preservando el historial financiero)
		try {
			await supabaseAdmin
				.from('orders')
				.update({ customer_id: null })
				.eq('customer_id', customer_id.trim());
		} catch (ordErr) {
			console.warn('Aviso al desvincular órdenes del cliente:', ordErr);
		}

		// 4. Eliminar registro del cliente
		const { error: deleteErr } = await supabaseAdmin
			.from('customers')
			.delete()
			.eq('id', customer_id.trim());

		if (deleteErr) {
			return new Response(JSON.stringify({
				success: false,
				error: 'Error al eliminar cliente: ' + deleteErr.message
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({
			success: true,
			message: 'Cliente eliminado correctamente del directorio'
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (err: any) {
		console.error('Excepción en /api/admin/customers/delete:', err);
		return new Response(JSON.stringify({
			success: false,
			error: err.message || 'Error interno del servidor'
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
