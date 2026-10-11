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

		const { id, titulo, descripcion, alt_text, link_url, seccion, orden, activo } = body || {};

		if (!id) {
			return new Response(JSON.stringify({
				success: false,
				error: 'MISSING_ID',
				message: 'El identificador del banner es requerido.'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Construir objeto de actualización dinámico
		const updateData: Record<string, any> = {
			updated_at: new Date().toISOString()
		};

		if (titulo !== undefined) updateData.titulo = String(titulo).trim();
		if (descripcion !== undefined) updateData.descripcion = String(descripcion).trim();
		if (alt_text !== undefined) updateData.alt_text = String(alt_text).trim();
		if (link_url !== undefined) updateData.link_url = String(link_url).trim();
		if (seccion !== undefined) updateData.seccion = String(seccion).trim();
		if (orden !== undefined) updateData.orden = parseInt(orden, 10) || 0;
		if (activo !== undefined) updateData.activo = Boolean(activo);

		const { data, error } = await supabaseAdmin
			.from('hero_banners')
			.update(updateData)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			console.error('[Admin Banners Update] Error DB:', error);
			return new Response(JSON.stringify({
				success: false,
				error: 'DATABASE_ERROR',
				message: `Error al actualizar banner: ${error.message}`
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({
			success: true,
			banner: data,
			message: 'Banner actualizado exitosamente.'
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err: any) {
		console.error('[Admin Banners Update Exception]', err);
		return new Response(JSON.stringify({
			success: false,
			error: 'SERVER_ERROR',
			message: err?.message || 'Error interno al actualizar el banner.'
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
