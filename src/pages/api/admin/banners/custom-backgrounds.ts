import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase';

export const prerender = false;

function sanitizeFileName(originalName: string, prefix: string): string {
	const lastDot = originalName.lastIndexOf('.');
	const ext = lastDot !== -1 ? originalName.substring(lastDot + 1).toLowerCase() : 'webp';
	const nameWithoutExt = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;

	const cleanBase = nameWithoutExt
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');

	const timeStamp = Date.now().toString().slice(-8);
	return `${prefix}_${cleanBase || 'bg'}_${timeStamp}.${ext}`;
}

function verifyAuth(request: Request, cookies: any): boolean {
	const _env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string>);
	const adminSecret = _env['ADMIN_SECRET'] || (import.meta as any).env?.ADMIN_SECRET || '20181860';

	const sessionCookie = cookies.get('admin_session')?.value;
	const authHeader = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
	const token = sessionCookie || authHeader;

	return Boolean(adminSecret && token === adminSecret);
}

// GET: Consultar el estado actual de los fondos personalizados
export const GET: APIRoute = async ({ request, cookies }) => {
	if (!verifyAuth(request, cookies)) {
		return new Response(JSON.stringify({ success: false, error: 'UNAUTHORIZED' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const { data, error } = await supabaseAdmin
			.from('hero_banners')
			.select('seccion, imagen_url, storage_path, activo')
			.in('seccion', ['repuestos_fondo_busqueda', 'repuestos_fondo_carrusel', 'menu_principal'])
			.eq('activo', true);

		if (error) {
			return new Response(JSON.stringify({ success: false, error: error.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const searchBg = data?.find(b => b.seccion === 'repuestos_fondo_busqueda')?.imagen_url || null;
		const carouselBg = data?.find(b => b.seccion === 'repuestos_fondo_carrusel')?.imagen_url || null;
		const menuBg = data?.find(b => b.seccion === 'menu_principal')?.imagen_url || null;

		return new Response(JSON.stringify({
			success: true,
			searchBg,
			carouselBg,
			menuBg,
			isOriginalRepuestos: !searchBg && !carouselBg,
			isOriginalMenu: !menuBg,
			isOriginal: !searchBg && !carouselBg && !menuBg
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e: any) {
		return new Response(JSON.stringify({ success: false, error: e?.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

// POST: Modificar o Restaurar Fondos
export const POST: APIRoute = async ({ request, cookies }) => {
	if (!verifyAuth(request, cookies)) {
		return new Response(JSON.stringify({
			success: false,
			error: 'UNAUTHORIZED',
			message: 'No tienes sesión administrativa activa.'
		}), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		let action = '';
		let file: any = null;
		let presetUrl = '';

		const contentType = request.headers.get('content-type') || '';
		if (contentType.includes('application/json')) {
			const body = await request.json().catch(() => ({}));
			action = body.action ? String(body.action).trim() : '';
			presetUrl = body.preset_url ? String(body.preset_url).trim() : '';
		} else {
			const formData = await request.formData();
			action = formData.get('action')?.toString()?.trim() || '';
			file = formData.get('imagen');
			presetUrl = formData.get('preset_url')?.toString()?.trim() || '';
		}

		// ACCIÓN 1A: Restaurar colores originales exclusivamente del Menú Principal
		if (action === 'reset_menu_original') {
			const { error: resetErr } = await supabaseAdmin
				.from('hero_banners')
				.update({ activo: false, updated_at: new Date().toISOString() })
				.eq('seccion', 'menu_principal');

			if (resetErr) {
				return new Response(JSON.stringify({ success: false, error: resetErr.message }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			return new Response(JSON.stringify({
				success: true,
				message: 'Se ha restaurado el diseño original del menú principal exitosamente.'
			}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// ACCIÓN 1B: Restaurar colores y fondos originales exclusivamente de Repuestos
		if (action === 'reset_original') {
			const { error: resetErr } = await supabaseAdmin
				.from('hero_banners')
				.update({ activo: false, updated_at: new Date().toISOString() })
				.in('seccion', ['repuestos_fondo_busqueda', 'repuestos_fondo_carrusel']);

			if (resetErr) {
				return new Response(JSON.stringify({ success: false, error: resetErr.message }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			return new Response(JSON.stringify({
				success: true,
				message: 'Se han restaurado los colores y fondos originales de la sección de búsqueda y del carrusel exitosamente.'
			}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// ACCIÓN 2: Establecer fondo de búsqueda, fondo de carrusel o fondo de menú principal
		if (action === 'set_search_bg' || action === 'set_carousel_bg' || action === 'set_menu_bg') {
			let targetSection = 'repuestos_fondo_busqueda';
			let prefix = 'bg_search';
			let label = 'Fondo de Búsqueda';

			if (action === 'set_carousel_bg') {
				targetSection = 'repuestos_fondo_carrusel';
				prefix = 'bg_carousel';
				label = 'Fondo del Carrusel';
			} else if (action === 'set_menu_bg') {
				targetSection = 'menu_principal';
				prefix = 'bg_menu';
				label = 'Fondo del Menú Principal';
			}

			let finalImageUrl = '';
			let storagePath: string | null = null;

			// Caso A: Imagen subida por archivo
			if (file && file instanceof File && file.size > 0) {
				const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
				if (file.size > MAX_SIZE) {
					return new Response(JSON.stringify({
						success: false,
						error: 'FILE_TOO_LARGE',
						message: 'El archivo excede el tamaño máximo permitido de 5 MB.'
					}), {
						status: 400,
						headers: { 'Content-Type': 'application/json' }
					});
				}

				const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
				if (!allowedTypes.includes(file.type.toLowerCase())) {
					return new Response(JSON.stringify({
						success: false,
						error: 'INVALID_FORMAT',
						message: 'Formato no admitido. Usa JPG, PNG o WebP.'
					}), {
						status: 400,
						headers: { 'Content-Type': 'application/json' }
					});
				}

				// Subir a bucket 'banners'
				const fileName = sanitizeFileName(file.name, prefix);
				const buffer = Buffer.from(await file.arrayBuffer());

				const { error: uploadError } = await supabaseAdmin.storage
					.from('banners')
					.upload(fileName, buffer, {
						contentType: file.type || 'image/webp',
						upsert: true
					});

				if (uploadError) {
					return new Response(JSON.stringify({
						success: false,
						error: 'STORAGE_ERROR',
						message: `Error al almacenar la imagen: ${uploadError.message}`
					}), {
						status: 500,
						headers: { 'Content-Type': 'application/json' }
					});
				}

				const { data: urlData } = supabaseAdmin.storage.from('banners').getPublicUrl(fileName);
				finalImageUrl = urlData.publicUrl;
				storagePath = fileName;
			} else if (presetUrl) {
				// Caso B: Selección de preajuste existente
				finalImageUrl = presetUrl;
			} else {
				return new Response(JSON.stringify({
					success: false,
					error: 'NO_IMAGE_PROVIDED',
					message: 'Debes seleccionar un archivo o un diseño preajustado.'
				}), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			// Desactivar registros anteriores para esta sección
			await supabaseAdmin
				.from('hero_banners')
				.update({ activo: false, updated_at: new Date().toISOString() })
				.eq('seccion', targetSection);

			// Insertar nuevo registro activo
			const { data: inserted, error: insertError } = await supabaseAdmin
				.from('hero_banners')
				.insert({
					titulo: label,
					descripcion: `Personalización de ${label.toLowerCase()} para /repuestos`,
					imagen_url: finalImageUrl,
					storage_path: storagePath,
					seccion: targetSection,
					activo: true,
					orden: 0
				})
				.select()
				.single();

			if (insertError) {
				return new Response(JSON.stringify({
					success: false,
					error: 'DATABASE_ERROR',
					message: `Error al registrar el fondo: ${insertError.message}`
				}), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			return new Response(JSON.stringify({
				success: true,
				record: inserted,
				imageUrl: finalImageUrl,
				message: `${label} actualizado y activado exitosamente.`
			}), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({
			success: false,
			error: 'INVALID_ACTION',
			message: 'Acción no reconocida.'
		}), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err: any) {
		console.error('[Admin Custom Backgrounds Exception]', err);
		return new Response(JSON.stringify({
			success: false,
			error: 'SERVER_ERROR',
			message: err?.message || 'Error interno al procesar los fondos.'
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
