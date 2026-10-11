import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase';

export const prerender = false;

function sanitizeFileName(originalName: string): string {
	const lastDot = originalName.lastIndexOf('.');
	const ext = lastDot !== -1 ? originalName.substring(lastDot + 1).toLowerCase() : 'jpg';
	const nameWithoutExt = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;

	const cleanBase = nameWithoutExt
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');

	const safeBase = cleanBase || 'banner';
	const timeStamp = Date.now().toString().slice(-8);
	return `banner_${safeBase}_${timeStamp}.${ext}`;
}

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

		// 2. Procesar FormData
		const formData = await request.formData();
		const file = formData.get('imagen');
		const titulo = formData.get('titulo')?.toString()?.trim() || '';
		const descripcion = formData.get('descripcion')?.toString()?.trim() || '';
		const altText = formData.get('alt_text')?.toString()?.trim() || titulo || 'Banner promocional SERVITECNOLOGY';
		const linkUrl = formData.get('link_url')?.toString()?.trim() || '';
		const ordenRaw = formData.get('orden')?.toString();
		const orden = ordenRaw !== undefined && ordenRaw !== '' ? parseInt(ordenRaw, 10) : 0;
		const activo = formData.get('activo') === 'false' ? false : true;
		const seccion = formData.get('seccion')?.toString()?.trim() || 'repuestos';

		if (!file || !(file instanceof File) || file.size === 0) {
			return new Response(JSON.stringify({
				success: false,
				error: 'NO_FILE',
				message: 'Debes seleccionar un archivo de imagen válido.'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Validar tamaño máximo (5 MB = 5 * 1024 * 1024 bytes)
		const MAX_SIZE = 5 * 1024 * 1024;
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

		// Validar tipo de archivo
		const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
		if (!allowedTypes.includes(file.type.toLowerCase())) {
			return new Response(JSON.stringify({
				success: false,
				error: 'INVALID_FORMAT',
				message: 'Formato no admitido. Usa imágenes JPG, PNG o WebP.'
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 3. Garantizar existencia del bucket 'banners'
		try {
			const { data: bucketData, error: bucketErr } = await supabaseAdmin.storage.getBucket('banners');
			if (!bucketData || bucketErr) {
				await supabaseAdmin.storage.createBucket('banners', { public: true });
			}
		} catch (e) {
			console.warn('[Admin Banners Upload] Verificación de bucket:', e);
		}

		// 4. Subir imagen a Supabase Storage
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const fileName = sanitizeFileName(file.name);

		const { error: uploadError } = await supabaseAdmin.storage
			.from('banners')
			.upload(fileName, buffer, {
				contentType: file.type || 'image/jpeg',
				upsert: true,
			});

		if (uploadError) {
			console.error('[Admin Banners Upload] Storage error:', uploadError);
			return new Response(JSON.stringify({
				success: false,
				error: 'STORAGE_ERROR',
				message: `Error al almacenar la imagen: ${uploadError.message}`
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// 5. Obtener URL pública
		const { data: urlData } = supabaseAdmin.storage
			.from('banners')
			.getPublicUrl(fileName);

		const publicUrl = urlData.publicUrl;

		// 6. Insertar registro en Postgres
		const { data: insertedData, error: dbError } = await supabaseAdmin
			.from('hero_banners')
			.insert({
				titulo: titulo || file.name.replace(/\.[^/.]+$/, ''),
				descripcion,
				imagen_url: publicUrl,
				storage_path: fileName,
				link_url: linkUrl,
				alt_text: altText,
				seccion: seccion || 'repuestos',
				orden: isNaN(orden) ? 0 : orden,
				activo,
			})
			.select()
			.single();

		if (dbError) {
			console.error('[Admin Banners Upload] DB error:', dbError);
			// Rollback del archivo subido en storage
			await supabaseAdmin.storage.from('banners').remove([fileName]);

			return new Response(JSON.stringify({
				success: false,
				error: 'DATABASE_ERROR',
				message: `Error al registrar el banner en base de datos: ${dbError.message}`
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({
			success: true,
			banner: insertedData,
			message: 'Banner cargado y registrado exitosamente.'
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err: any) {
		console.error('[Admin Banners Upload Exception]', err);
		return new Response(JSON.stringify({
			success: false,
			error: 'SERVER_ERROR',
			message: err?.message || 'Error interno al procesar el banner.'
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
