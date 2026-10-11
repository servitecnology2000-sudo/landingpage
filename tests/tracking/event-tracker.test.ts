import { describe, it, expect } from 'vitest';
import { POST } from '../../src/pages/api/track';

describe('Rastreador de Tráfico y Conversiones (/api/track)', () => {
	it('debe rechazar solicitudes con JSON inválido o malformado', async () => {
		const request = new Request('http://localhost:4321/api/track', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '{ invalid_json'
		});

		const response = await POST({ request } as any);
		expect(response.status).toBe(400);
		const json = await response.json();
		expect(json.error).toBe('Cuerpo de solicitud inválido');
	});

	it('debe rechazar solicitudes si falta el campo obligatorio tipo_evento', async () => {
		const request = new Request('http://localhost:4321/api/track', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				elemento_id: 'btn_whatsapp_flotante',
				url_origen: '/repuestos'
			})
		});

		const response = await POST({ request } as any);
		expect(response.status).toBe(400);
		const json = await response.json();
		expect(json.error).toBe('tipo_evento es requerido');
	});

	it('debe procesar exitosamente un evento de clic a WhatsApp', async () => {
		const request = new Request('http://localhost:4321/api/track', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				tipo_evento: 'clic_boton',
				elemento_id: 'btn_whatsapp_flotante',
				url_origen: '/repuestos'
			})
		});

		const response = await POST({ request } as any);
		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json.success).toBe(true);
	});

	it('debe procesar exitosamente un evento de visita a página', async () => {
		const request = new Request('http://localhost:4321/api/track', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				tipo_evento: 'visita_pagina',
				url_origen: '/repuestos'
			})
		});

		const response = await POST({ request } as any);
		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json.success).toBe(true);
	});
});
