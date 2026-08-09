import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

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
	// ─── Resolve env vars ────────────────────────────────────────────────────────
	const SUPABASE_URL =
		process.env['PUBLIC_SUPABASE_URL'] ||
		import.meta.env.PUBLIC_SUPABASE_URL ||
		'https://mivsnmvupahgbrjfdyhl.supabase.co';

	const SERVICE_ROLE_KEY =
		process.env['SUPABASE_SERVICE_ROLE_KEY'] ||
		import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
		'';

	const ANON_KEY =
		process.env['PUBLIC_SUPABASE_ANON_KEY'] ||
		import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdnNubXZ1cGFoZ2JyamZkeWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NDIzMjcsImV4cCI6MjA5OTIxODMyN30.aj9zXGTF6FwjpKmkfTIbfxN3USS3gHIxpP4GB38XNAw';

	// Use SERVICE_ROLE_KEY if present, otherwise fallback to ANON_KEY
	const apiKeyToUse = SERVICE_ROLE_KEY || ANON_KEY;

	if (!SERVICE_ROLE_KEY) {
		console.warn('[API Admin Upload] SUPABASE_SERVICE_ROLE_KEY is empty. Falling back to ANON_KEY.');
	}

	// ─── Auth Verification ───────────────────────────────────────────────────────
	const adminSecret =
		process.env['ADMIN_SECRET'] ||
		import.meta.env.ADMIN_SECRET ||
		'20181860';
	const sessionCookie = cookies.get('admin_session');

	if (sessionCookie?.value !== adminSecret) {
		return new Response(
			JSON.stringify({ success: false, error: 'UNAUTHORIZED', message: 'No tienes sesión administrativa activa.' }),
			{ status: 401, headers: { 'Content-Type': 'application/json' } }
		);
	}

	// ─── Build Supabase Client ───────────────────────────────────────────────────
	const adminClient = createClient(SUPABASE_URL, apiKeyToUse, {
		auth: { persistSession: false, autoRefreshToken: false },
	});

	try {
		const formData = await request.formData();
		const rawFiles = formData.getAll('imagen');
		const files = rawFiles.filter((f): f is File => f instanceof File && f.size > 0);
		const categoria = formData.get('categoria')?.toString() || 'soporte-tecnico';
		const titulo = formData.get('titulo')?.toString() || '';

		if (files.length === 0) {
			return new Response(
				JSON.stringify({ success: false, error: 'NO_FILES', message: 'Por favor selecciona al menos una imagen válida.' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		// ─── Bucket Check & Auto-Creation ────────────────────────────────────────
		try {
			const { data: bucketData, error: getBucketErr } = await adminClient.storage.getBucket('trabajos_galeria');
			if (!bucketData || getBucketErr) {
				const { error: createErr } = await adminClient.storage.createBucket('trabajos_galeria', { public: true });
				if (createErr) {
					console.error('[API Admin Upload] Bucket notice:', createErr?.message);
				}
			}
		} catch (e) {
			console.log('[API Admin Upload] Bucket check log:', e);
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

					// Upload to Supabase Storage
					const { data: uploadData, error: uploadError } = await adminClient.storage
						.from('trabajos_galeria')
						.upload(fileName, buffer, {
							contentType: file.type || 'image/jpeg',
							upsert: true,
						});

					if (uploadError) {
						console.error(`[Storage Error on "${file.name}"]`, uploadError);
						errors.push(`"${file.name}": ${uploadError.message}`);
						return;
					}

					// Get public URL
					const { data: publicUrlData } = adminClient.storage
						.from('trabajos_galeria')
						.getPublicUrl(fileName);

					const itemTitle =
						files.length > 1 && titulo
							? `${titulo} (${index + 1})`
							: titulo || `Trabajo realizado - ${categoria}`;

					// Insert into Database
					const { data: insertedData, error: dbError } = await adminClient
						.from('trabajos_galeria')
						.insert({
							titulo: itemTitle,
							imagen_url: publicUrlData.publicUrl,
							storage_path: fileName,
							categoria: categoria,
							activo: true,
						})
						.select();

					if (dbError) {
						console.error(`[DB Insert Error on "${file.name}"]`, dbError);
						// Rollback storage file
						await adminClient.storage.from('trabajos_galeria').remove([fileName]);
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
						? 'Error RLS en Supabase: Ejecuta el script SQL "trabajos_galeria_schema.sql" en el SQL Editor de tu proyecto Supabase.'
						: `Error al procesar imágenes: ${errors.join(' | ')}`,
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
				records: insertedRecords,
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
