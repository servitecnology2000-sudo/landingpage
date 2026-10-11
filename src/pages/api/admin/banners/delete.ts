import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		// 1. Control de Acceso Administrativo
		const _env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string>);
		const adminSecret = _env['ADMIN_SECRET'] || import.meta.env.ADMIN_SECRET || '20181860';

		const sessionCookie = cookies.get('admin_session')?.value;
		const authHeader = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
		const token = sessionCookie || authHeader;

		if (!adminSecret || token !== adminSecret) {
			return new Response(JSON.stringify({
				success: false,
				error: 'UNAUTHORIZED',
				message: 'No tienes sesión administrativa activa.'
			}), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 2. Parsear Payload JSON
		let body: any;
		try {
			body = await request.json();
		} catch (e) {
			return new Response(JSON.stringify({
				success: false,
				error: 'INVALID_JSON',
				message: 'Cuerpo de petición inválido (JSON requerido).'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const { id, storage_path } = body || {};

		if (!id) {
			return new Response(JSON.stringify({
				success: false,
				error: 'MISSING_ID',
				message: 'El identificador del banner es obligatorio.'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 3. Eliminar archivo de Supabase Storage si se especificó el storage_path
		if (storage_path) {
			try {
				const { error: storageErr } = await supabaseAdmin.storage
					.from('banners')
					.remove([storage_path]);
				if (storageErr) {
					console.warn('[Admin Banners Delete] Advertencia al eliminar archivo de storage:', storageErr);
				}
			} catch (e) {
				console.error('[Admin Banners Delete] Error en storage delete:', e);
			}
		}

		// 4. Eliminar registro de la base de datos
		const { error: dbError } = await supabaseAdmin
			.from('hero_banners')
			.delete()
			.eq('id', id);

		if (dbError) {
			console.error('[Admin Banners Delete] Error DB:', dbError);
			return new Response(JSON.stringify({
				success: false,
				error: 'DATABASE_ERROR',
				message: `Error al eliminar banner: ${dbError.message}`
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({
			success: true,
			message: 'Banner eliminado exitosamente.'
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err: any) {
		console.error('[Admin Banners Delete Exception]', err);
		return new Response(JSON.stringify({
			success: false,
			error: 'SERVER_ERROR',
			message: err?.message || 'Error interno al eliminar el banner.'
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
