import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase';

export const prerender = false;

function sanitizeFileName(originalName: string, index: number): string {
	const lastDot = originalName.lastIndexOf('.');
	const ext = lastDot !== -1 ? originalName.substring(lastDot + 1).toLowerCase() : 'jpeg';
	const nameWithoutExt = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;

	const cleanBase = nameWithoutExt
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');

	const safeBase = cleanBase || 'imagen';
	const timeStamp = Date.now().toString().slice(-6);
	return `${safeBase}_${timeStamp}_${index + 1}.${ext}`;
}

export const POST: APIRoute = async ({ request, cookies }) => {
	// Auth verification
	const _env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string>);
	const adminSecret = _env['ADMIN_SECRET'] || import.meta.env.ADMIN_SECRET || '20181860';
	const sessionCookie = cookies.get('admin_session');

	if (sessionCookie?.value !== adminSecret) {
		return new Response(
			JSON.stringify({ success: false, error: 'UNAUTHORIZED', message: 'No tienes sesión administrativa activa.' }),
			{ status: 401, headers: { 'Content-Type': 'application/json' } }
		);
	}

	try {
		const formData = await request.formData();
		const rawFiles = formData.getAll('imagen');
		const files = rawFiles.filter((f): f is File => f instanceof File && f.size > 0);
		const categoria = formData.get('categoria')?.toString() || 'Soporte';
		const titulo = formData.get('titulo')?.toString() || '';

		if (files.length === 0) {
			return new Response(
				JSON.stringify({ success: false, error: 'NO_FILES', message: 'Por favor selecciona al menos una imagen válida.' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		// Bucket Check & Auto-Creation (with public: true) using Admin Client
		try {
			const { data: bucketData, error: getBucketErr } = await supabaseAdmin.storage.getBucket('trabajos_galeria');
			if (!bucketData || getBucketErr) {
				await supabaseAdmin.storage.createBucket('trabajos_galeria', { public: true });
			}
		} catch (e) {
			console.log('[API Admin] Bucket check/create log:', e);
		}

		let uploadedCount = 0;
		const errors: string[] = [];
		const insertedRecords: any[] = [];

		await Promise.all(
			files.map(async (file, index) => {
				try {
					const arrayBuffer = await file.arrayBuffer();
					const buffer = Buffer.from(arrayBuffer);
					const cleanName = sanitizeFileName(file.name, index);
					const fileName = `${categoria.toLowerCase()}_${cleanName}`;

					// Upload to Supabase Storage using Admin client (Service Role bypasses RLS)
					const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
						.from('trabajos_galeria')
						.upload(fileName, buffer, {
							contentType: file.type || 'image/jpeg',
							upsert: true
						});

					if (uploadError) {
						console.error(`[Storage Error on ${file.name}]`, uploadError);
						errors.push(`"${file.name}": ${uploadError.message}`);
						return;
					}

					// Get public URL
					const { data: publicUrlData } = supabaseAdmin.storage
						.from('trabajos_galeria')
						.getPublicUrl(fileName);

					const itemTitle = files.length > 1 && titulo
						? `${titulo} (${index + 1})`
						: (titulo || `Trabajo realizado - ${categoria}`);

					// Insert into Database using Admin client
					const { data: insertedData, error: dbError } = await supabaseAdmin
						.from('trabajos_galeria')
						.insert({
							titulo: itemTitle,
							imagen_url: publicUrlData.publicUrl,
							storage_path: fileName,
							categoria: categoria,
							activo: true
						})
						.select();

					if (dbError) {
						console.error(`[DB Insert Error on ${file.name}]`, dbError);
						// Rollback storage file
						await supabaseAdmin.storage.from('trabajos_galeria').remove([fileName]);
						errors.push(`"${file.name}": ${dbError.message}`);
					} else {
						uploadedCount++;
						if (insertedData?.[0]) {
							insertedRecords.push(insertedData[0]);
						}
					}
				} catch (err: any) {
					errors.push(`"${file.name}": ${err?.message || 'Error inesperado'}`);
				}
			})
		);

		if (errors.length > 0 && uploadedCount === 0) {
			const isRls = errors.some(e => e.toLowerCase().includes('row-level security') || e.toLowerCase().includes('rls'));
			return new Response(
				JSON.stringify({
					success: false,
					error: isRls ? 'RLS_VIOLATION' : 'UPLOAD_FAILED',
					message: isRls
						? 'Error RLS en Supabase: Las políticas RLS de la tabla bloquean la inserción. Solución: Ejecuta el script SQL "trabajos_galeria_schema.sql" en el SQL Editor de tu proyecto Supabase o añade SUPABASE_SERVICE_ROLE_KEY en las variables de entorno de Vercel.'
						: `Error al subir imágenes: ${errors.join(' | ')}`
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		return new Response(
			JSON.stringify({
				success: true,
				uploadedCount,
				totalFiles: files.length,
				errors: errors.length > 0 ? errors : null,
				records: insertedRecords
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err: any) {
		console.error('[API Admin Upload Error]', err);
		return new Response(
			JSON.stringify({ success: false, error: 'SERVER_ERROR', message: err?.message || 'Error interno del servidor.' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
