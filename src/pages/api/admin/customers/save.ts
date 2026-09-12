import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase';
import { validateRut, formatRut, normalizePhone } from '../../../../lib/rut';

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

		const {
			id,
			full_name,
			email,
			phone,
			rut,
			address,
			razon_social,
			giro,
			customer_type = 'manual',
			notes
		} = body;

		// 3. Validaciones de negocio
		if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
			return new Response(JSON.stringify({
				success: false,
				error: 'El nombre o razón social del cliente es obligatorio.'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (!email || typeof email !== 'string' || !email.includes('@')) {
			return new Response(JSON.stringify({
				success: false,
				error: 'El correo electrónico ingresado no es válido.'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (!rut || !validateRut(rut)) {
			return new Response(JSON.stringify({
				success: false,
				error: 'El RUT ingresado no es válido según el algoritmo del SII (Módulo 11).'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const normalizedRut = formatRut(rut);
		const normalizedPhone = phone ? normalizePhone(phone) : '';

		const payload: Record<string, any> = {
			full_name: full_name.trim(),
			email: email.trim().toLowerCase(),
			phone: normalizedPhone,
			rut: normalizedRut,
			address: address ? address.trim() : null,
			razon_social: razon_social ? razon_social.trim() : null,
			giro: giro ? giro.trim() : null,
			notes: notes !== undefined ? (notes ? String(notes).trim() : null) : null,
			updated_at: new Date().toISOString()
		};

		if (['registrado', 'invitado', 'manual'].includes(customer_type)) {
			payload.customer_type = customer_type;
		}

		let resultData: any;

		// 4. Edición de cliente existente
		if (id && typeof id === 'string' && id.trim()) {
			const { data, error } = await supabaseAdmin
				.from('customers')
				.update(payload)
				.eq('id', id.trim())
				.select()
				.single();

			if (error || !data) {
				return new Response(JSON.stringify({
					success: false,
					error: 'Error al actualizar cliente en base de datos: ' + (error?.message || 'No encontrado')
				}), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			resultData = data;
		} 
		// 5. Creación de nuevo cliente
		else {
			payload.created_at = new Date().toISOString();
			payload.customer_type = customer_type || 'manual';

			const { data, error } = await supabaseAdmin
				.from('customers')
				.insert(payload)
				.select()
				.single();

			if (error || !data) {
				return new Response(JSON.stringify({
					success: false,
					error: 'Error al crear cliente en base de datos: ' + (error?.message || 'Error desconocido')
				}), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			resultData = data;
		}

		return new Response(JSON.stringify({
			success: true,
			message: id ? 'Cliente actualizado exitosamente' : 'Cliente registrado exitosamente',
			customer: resultData
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (err: any) {
		console.error('Excepción en /api/admin/customers/save:', err);
		return new Response(JSON.stringify({
			success: false,
			error: err.message || 'Error interno del servidor'
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
