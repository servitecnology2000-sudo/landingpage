import { describe, it, expect } from 'vitest';
import { POST as uploadBanner } from '../../src/pages/api/admin/banners/upload';
import { POST as updateBanner } from '../../src/pages/api/admin/banners/update';
import { POST as deleteBanner } from '../../src/pages/api/admin/banners/delete';

describe('Pruebas de Endpoints de Banners y Carrusel (/api/admin/banners/*)', () => {
	const adminSecret = process.env.ADMIN_SECRET || '20181860';

	// ─── 1. Endpoint /api/admin/banners/upload ─────────────────────────────────
	describe('POST /api/admin/banners/upload', () => {
		it('debe rechazar con 401 Unauthorized si no hay sesión ni token administrativo', async () => {
			const formData = new FormData();
			const req = new Request('http://localhost:4321/api/admin/banners/upload', {
				method: 'POST',
				body: formData
			});

			const response = await uploadBanner({
				request: req,
				cookies: { get: () => undefined }
			} as any);

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toBe('UNAUTHORIZED');
		});

		it('debe rechazar con 400 Bad Request si no se envía ningún archivo de imagen', async () => {
			const formData = new FormData();
			formData.append('titulo', 'Banner Sin Archivo');

			const req = new Request('http://localhost:4321/api/admin/banners/upload', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${adminSecret}`
				},
				body: formData
			});

			const response = await uploadBanner({
				request: req,
				cookies: { get: () => undefined }
			} as any);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toBe('NO_FILE');
		});

		it('debe rechazar con 400 Bad Request si el archivo no tiene formato de imagen válido', async () => {
			const formData = new FormData();
			const textBlob = new Blob(['archivo de texto no valido'], { type: 'text/plain' });
			formData.append('imagen', textBlob, 'documento.txt');
			formData.append('titulo', 'Banner Invalido');

			const req = new Request('http://localhost:4321/api/admin/banners/upload', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${adminSecret}`
				},
				body: formData
			});

			const response = await uploadBanner({
				request: req,
				cookies: { get: () => undefined }
			} as any);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toBe('INVALID_FORMAT');
		});
	});

	// ─── 2. Endpoint /api/admin/banners/update ─────────────────────────────────
	describe('POST /api/admin/banners/update', () => {
		it('debe rechazar con 401 Unauthorized si no hay sesión administrativa', async () => {
			const req = new Request('http://localhost:4321/api/admin/banners/update', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: 'some-id', activo: false })
			});

			const response = await updateBanner({
				request: req,
				cookies: { get: () => undefined }
			} as any);

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toBe('UNAUTHORIZED');
		});

		it('debe rechazar con 400 Bad Request si falta el id del banner', async () => {
			const req = new Request('http://localhost:4321/api/admin/banners/update', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${adminSecret}`
				},
				body: JSON.stringify({ titulo: 'Sin ID' })
			});

			const response = await updateBanner({
				request: req,
				cookies: { get: () => undefined }
			} as any);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toBe('MISSING_ID');
		});

		it('debe rechazar con 400 Bad Request si el cuerpo no es JSON válido', async () => {
			const req = new Request('http://localhost:4321/api/admin/banners/update', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${adminSecret}`
				},
				body: 'invalid-json'
			});

			const response = await updateBanner({
				request: req,
				cookies: { get: () => undefined }
			} as any);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toBe('INVALID_JSON');
		});
	});

	// ─── 3. Endpoint /api/admin/banners/delete ─────────────────────────────────
	describe('POST /api/admin/banners/delete', () => {
		it('debe rechazar con 401 Unauthorized si no hay sesión administrativa', async () => {
			const req = new Request('http://localhost:4321/api/admin/banners/delete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: 'some-id' })
			});

			const response = await deleteBanner({
				request: req,
				cookies: { get: () => undefined }
			} as any);

			expect(response.status).toBe(401);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toBe('UNAUTHORIZED');
		});

		it('debe rechazar con 400 Bad Request si falta el parámetro id', async () => {
			const req = new Request('http://localhost:4321/api/admin/banners/delete', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${adminSecret}`
				},
				body: JSON.stringify({})
			});

			const response = await deleteBanner({
				request: req,
				cookies: { get: () => undefined }
			} as any);

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toBe('MISSING_ID');
		});
	});
});
