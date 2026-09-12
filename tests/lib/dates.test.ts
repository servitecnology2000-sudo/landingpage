import { describe, it, expect } from 'vitest';
import {
	formatDateTime,
	formatDateOnly,
	formatTimeOnly,
	toValidDate,
	APP_TIMEZONE,
	APP_LOCALE
} from '../../src/lib/dates';

describe('Pruebas Unitarias de Zona Horaria y Localización (src/lib/dates.ts)', () => {
	// Timestamp UTC canónico de prueba: 12 de Septiembre de 2026 a las 17:43:00 UTC
	const testUtcDateStr = '2026-09-12T17:43:00.000Z';

	describe('1. Formateo en Chile (America/Santiago)', () => {
		it('en horario de verano (septiembre, UTC-3) debe mostrar las 14:43 hrs (02:43 p. m.) en vez de 17:43 de Vercel', () => {
			const formatted = formatDateTime(testUtcDateStr, { timeZone: 'America/Santiago', locale: 'es-CL' });
			
			// Validar que incluya el día 12 de septiembre de 2026
			expect(formatted).toContain('12');
			expect(formatted).toContain('2026');

			// Validar que la hora calculada sea exactamente 02:43 p. m. (o 14:43) y NO las 17:43 UTC de Vercel
			const timeStr = formatTimeOnly(testUtcDateStr, { timeZone: 'America/Santiago', hour12: false });
			expect(timeStr).toBe('14:43');

			const time12Str = formatTimeOnly(testUtcDateStr, { timeZone: 'America/Santiago', hour12: true });
			// Debe ser 02:43 p. m. o 2:43 p. m.
			expect(time12Str).toMatch(/0?2:43\s*(p\.\s*m\.|PM)/i);
		});

		it('en horario de invierno (junio, UTC-4) debe ajustar automáticamente a UTC-4 (13:43 hrs) sin código manual', () => {
			const winterUtcDateStr = '2026-06-12T17:43:00.000Z';
			const timeStr = formatTimeOnly(winterUtcDateStr, { timeZone: 'America/Santiago', hour12: false });
			
			// En junio Chile está en UTC-4, por lo tanto 17:43 UTC - 4h = 13:43
			expect(timeStr).toBe('13:43');
		});
	});

	describe('2. Compatibilidad Multirregión SaaS (España y Latam)', () => {
		it('debe formatear con precisión para España (Europe/Madrid, UTC+2 verano -> 19:43)', () => {
			const timeStr = formatTimeOnly(testUtcDateStr, { timeZone: 'Europe/Madrid', hour12: false });
			expect(timeStr).toBe('19:43');
		});

		it('debe formatear con precisión para Colombia (America/Bogota, UTC-5 fijo -> 12:43)', () => {
			const timeStr = formatTimeOnly(testUtcDateStr, { timeZone: 'America/Bogota', hour12: false });
			expect(timeStr).toBe('12:43');
		});

		it('debe formatear con precisión para Argentina (America/Argentina/Buenos_Aires, UTC-3 -> 14:43)', () => {
			const timeStr = formatTimeOnly(testUtcDateStr, { timeZone: 'America/Argentina/Buenos_Aires', hour12: false });
			expect(timeStr).toBe('14:43');
		});

		it('debe formatear con precisión para México (America/Mexico_City, UTC-6 -> 11:43)', () => {
			const timeStr = formatTimeOnly(testUtcDateStr, { timeZone: 'America/Mexico_City', hour12: false });
			expect(timeStr).toBe('11:43');
		});
	});

	describe('3. Helpers formatDateOnly & formatTimeOnly', () => {
		it('formatDateOnly debe omitir la hora y mostrar sólo fecha', () => {
			const dateOnly = formatDateOnly(testUtcDateStr, { timeZone: 'America/Santiago', locale: 'es-CL' });
			expect(dateOnly).toContain('12');
			expect(dateOnly).toContain('2026');
			expect(dateOnly).not.toContain(':');
		});

		it('toValidDate debe parsear correctamente strings, números y objetos Date', () => {
			expect(toValidDate('2026-09-12T17:43:00Z')).toBeInstanceOf(Date);
			expect(toValidDate(1789232580000)).toBeInstanceOf(Date);
			expect(toValidDate(new Date())).toBeInstanceOf(Date);
		});

		it('debe manejar entradas nulas, vacías o corruptas sin arrojar errores', () => {
			expect(formatDateTime(null)).toBe('—');
			expect(formatDateTime(undefined)).toBe('—');
			expect(formatDateTime('')).toBe('—');
			expect(formatDateTime('fecha-invalida')).toBe('—');
			expect(formatDateOnly(null)).toBe('—');
			expect(formatTimeOnly(null)).toBe('—');
		});
	});

	describe('4. Variables globales por defecto', () => {
		it('debe tener America/Santiago o la variable de entorno como APP_TIMEZONE', () => {
			expect(APP_TIMEZONE).toBeDefined();
			expect(typeof APP_TIMEZONE).toBe('string');
			expect(APP_LOCALE).toBeDefined();
		});
	});
});
