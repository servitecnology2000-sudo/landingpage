import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

// GET: Consulta pública del fondo activo del menú principal global
export const GET: APIRoute = async () => {
	try {
		const { data, error } = await supabase
			.from('hero_banners')
			.select('imagen_url')
			.eq('seccion', 'menu_principal')
			.eq('activo', true)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (error) {
			return new Response(JSON.stringify({ active: false, imageUrl: null, error: error.message }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({
			active: Boolean(data?.imagen_url),
			imageUrl: data?.imagen_url || null
		}), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=30, s-maxage=30'
			}
		});
	} catch (e: any) {
		return new Response(JSON.stringify({ active: false, imageUrl: null, error: e?.message }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
