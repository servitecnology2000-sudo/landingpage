import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

// Algoritmo de validación de RUT Chileno (Módulo 11)
function validateRut(rut: string): boolean {
	if (!rut || typeof rut !== 'string') return false;
	const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
	if (clean.length < 8 || clean.length > 9) return false;

	const cuerpo = clean.slice(0, -1);
	const dv = clean.slice(-1);

	let suma = 0;
	let multiplo = 2;

	for (let i = cuerpo.length - 1; i >= 0; i--) {
		suma += parseInt(cuerpo[i], 10) * multiplo;
		multiplo = multiplo < 7 ? multiplo + 1 : 2;
	}

	const dvEsperado = 11 - (suma % 11);
	let dvCalculado = '';
	if (dvEsperado === 11) dvCalculado = '0';
	else if (dvEsperado === 10) dvCalculado = 'K';
	else dvCalculado = dvEsperado.toString();

	return dv === dvCalculado;
}

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		const { id, full_name, email, phone, rut, address, commune, region } = body;

		if (!full_name || !email || !phone || !rut) {
			return new Response(JSON.stringify({
				success: false,
				error: 'Faltan campos obligatorios: Nombre, Email, Teléfono y RUT son requeridos.'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (!validateRut(rut)) {
			return new Response(JSON.stringify({
				success: false,
				error: 'El RUT ingresado no es válido según el algoritmo del SII (Módulo 11). Verifica el dígito verificador.'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const baseAddress = (address && address.trim().length > 0) ? address.trim() : 'Retiro en Oficina Técnica (Santiago Centro)';
		const suffix = commune ? `${commune}${region ? ` (${region})` : ''}` : '';
		const fullAddress = (suffix && !baseAddress.includes(commune)) ? `${baseAddress}, ${suffix}` : baseAddress;

		const cleanEmail = email.trim().toLowerCase();
		const formattedRut = rut.trim().toUpperCase();

		let targetId = id;
		if (!targetId) {
			// Buscar si ya existe por RUT o Email
			const { data: existing } = await supabaseAdmin
				.from('customers')
				.select('id')
				.or(`rut.eq.${formattedRut},email.eq.${cleanEmail}`)
				.limit(1)
				.maybeSingle();

			if (existing) {
				targetId = existing.id;
			}
		}

		let resultData = null;
		if (targetId) {
			const { data, error } = await supabaseAdmin
				.from('customers')
				.update({
					full_name: full_name.trim(),
					email: cleanEmail,
					phone: phone.trim(),
					rut: formattedRut,
					address: fullAddress,
					updated_at: new Date().toISOString()
				})
				.eq('id', targetId)
				.select()
				.single();

			if (error) {
				throw error;
			}
			resultData = data;
		} else {
			const { data, error } = await supabaseAdmin
				.from('customers')
				.insert({
					full_name: full_name.trim(),
					email: cleanEmail,
					phone: phone.trim(),
					rut: formattedRut,
					address: fullAddress,
					customer_type: 'invitado',
					auth_user_id: null,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				})
				.select()
				.single();

			if (error) {
				throw error;
			}
			resultData = data;
		}

		return new Response(JSON.stringify({
			success: true,
			customer: resultData
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (err: any) {
		console.error('Excepción en /api/customers/update:', err);
		return new Response(JSON.stringify({
			success: false,
			error: err.message || 'Error interno del servidor'
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
