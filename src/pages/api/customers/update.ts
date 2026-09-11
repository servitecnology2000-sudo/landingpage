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

		if (!id || !full_name || !email || !phone || !rut || !address) {
			return new Response(JSON.stringify({
				success: false,
				error: 'Faltan campos obligatorios: ID de usuario, Nombre, Email, Teléfono, RUT y Dirección son requeridos.'
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

		// Dirección completa formateada con comuna y región si están disponibles
		const fullAddress = commune ? `${address.trim()}, ${commune}${region ? ` (${region})` : ''}` : address.trim();

		// Actualizar o insertar cliente usando supabaseAdmin para garantizar persistencia y bypass de RLS server-side
		const { data, error } = await supabaseAdmin
			.from('customers')
			.upsert({
				id,
				full_name: full_name.trim(),
				email: email.trim().toLowerCase(),
				phone: phone.trim(),
				rut: rut.trim().toUpperCase(),
				address: fullAddress,
				updated_at: new Date().toISOString()
			}, { onConflict: 'id' })
			.select()
			.single();

		if (error) {
			console.error('Error actualizando perfil de cliente en Supabase:', error);
			return new Response(JSON.stringify({
				success: false,
				error: 'Error al persistir perfil de cliente: ' + error.message
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({
			success: true,
			customer: data
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
