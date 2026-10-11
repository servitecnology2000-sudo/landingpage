import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	try {
		let body: { tipo_evento?: string; elemento_id?: string; url_origen?: string } = {};
		
		const contentType = request.headers.get('content-type') || '';
		try {
			if (contentType.includes('application/json')) {
				body = await request.json();
			} else {
				const text = await request.text();
				if (text) {
					try {
						body = JSON.parse(text);
					} catch (e) {
						// Fallback for form/urlencoded if ever sent
						const params = new URLSearchParams(text);
						body = {
							tipo_evento: params.get('tipo_evento') || undefined,
							elemento_id: params.get('elemento_id') || undefined,
							url_origen: params.get('url_origen') || undefined,
						};
					}
				}
			}
		} catch (parseErr) {
			return new Response(JSON.stringify({ error: 'Cuerpo de solicitud inválido' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const tipo_evento = body.tipo_evento?.trim();
		if (!tipo_evento) {
			return new Response(JSON.stringify({ error: 'tipo_evento es requerido' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const elemento_id = body.elemento_id ? body.elemento_id.trim() : null;
		const url_origen = body.url_origen ? body.url_origen.trim() : null;

		const { error } = await supabaseAdmin
			.from('metricas_eventos')
			.insert([
				{
					tipo_evento,
					elemento_id,
					url_origen
				}
			]);

		if (error) {
			console.error('[API /api/track] Error inserting event:', error.message);
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err: any) {
		console.error('[API /api/track] Unexpected error:', err);
		return new Response(JSON.stringify({ error: err?.message || 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
