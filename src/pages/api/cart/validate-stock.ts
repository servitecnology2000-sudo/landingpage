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

		const { skus } = body || {};

		if (!skus || !Array.isArray(skus) || skus.length === 0) {
			return new Response(JSON.stringify({
				success: true,
				stocks: {}
			}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Normalizar y limpiar lista de SKUs
		const cleanSkus = skus
			.filter(s => typeof s === 'string' && s.trim())
			.map(s => s.trim());

		if (cleanSkus.length === 0) {
			return new Response(JSON.stringify({
				success: true,
				stocks: {}
			}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Consultar productos en Supabase por lista de SKUs
		const { data: prods, error: fetchErr } = await supabaseAdmin
			.from('repuestos_productos')
			.select('id, sku, titulo, precio_venta, stock_cantidad, estado')
			.in('sku', cleanSkus);

		if (fetchErr) {
			console.error('[validate-stock] Error al consultar Supabase:', fetchErr);
			return new Response(JSON.stringify({
				success: false,
				error: 'Error al consultar disponibilidad de stock.'
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const stocks: Record<string, { stock: number; price: number; title: string; is_available: boolean }> = {};

		(prods || []).forEach(p => {
			const stockNum = Math.max(0, parseInt(p.stock_cantidad, 10) || 0);
			stocks[p.sku] = {
				stock: stockNum,
				price: Number(p.precio_venta) || 0,
				title: p.titulo || '',
				is_available: stockNum > 0
			};
		});

		// Para SKUs no encontrados en BD
		cleanSkus.forEach(s => {
			if (!stocks[s]) {
				stocks[s] = {
					stock: 0,
					price: 0,
					title: 'Producto no disponible',
					is_available: false
				};
			}
		});

		return new Response(JSON.stringify({
			success: true,
			stocks
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (err: any) {
		console.error('[validate-stock] Error inesperado:', err);
		return new Response(JSON.stringify({
			success: false,
			error: err.message || 'Error interno del servidor.'
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
