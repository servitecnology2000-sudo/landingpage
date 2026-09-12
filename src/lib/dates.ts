/**
 * SERVITECNOLOGY - Módulo Centralizado de Localización y Zona Horaria (SaaS Multi-Región)
 * Manejo profesional de fechas, horas y husos horarios mediante IANA Time Zone Database (Intl).
 * Compatible con horario de verano/invierno (DST) automático sin desfases manuales.
 */

// 1. Zonas horarias predefinidas para expansión internacional del SaaS
export const SUPPORTED_REGIONS = [
	{ code: 'CL', country: 'Chile', timezone: 'America/Santiago', locale: 'es-CL', currency: 'CLP' },
	{ code: 'ES', country: 'España', timezone: 'Europe/Madrid', locale: 'es-ES', currency: 'EUR' },
	{ code: 'AR', country: 'Argentina', timezone: 'America/Argentina/Buenos_Aires', locale: 'es-AR', currency: 'ARS' },
	{ code: 'CO', country: 'Colombia', timezone: 'America/Bogota', locale: 'es-CO', currency: 'COP' },
	{ code: 'MX', country: 'México', timezone: 'America/Mexico_City', locale: 'es-MX', currency: 'MXN' },
	{ code: 'PE', country: 'Perú', timezone: 'America/Lima', locale: 'es-PE', currency: 'PEN' },
	{ code: 'UY', country: 'Uruguay', timezone: 'America/Montevideo', locale: 'es-UY', currency: 'UYU' },
	{ code: 'VE', country: 'Venezuela', timezone: 'America/Caracas', locale: 'es-VE', currency: 'USD' }
] as const;

// 2. Extracción segura de variables de entorno tanto en SSR (Node/Vercel) como en cliente
const _env = typeof process !== 'undefined' && process?.env ? process.env : ({} as Record<string, string>);

export const APP_TIMEZONE = 
	(typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_APP_TIMEZONE) ||
	_env['PUBLIC_APP_TIMEZONE'] ||
	_env['APP_TIMEZONE'] ||
	'America/Santiago';

export const APP_LOCALE = 
	(typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_APP_LOCALE) ||
	_env['PUBLIC_APP_LOCALE'] ||
	_env['APP_LOCALE'] ||
	'es-CL';

export interface FormatDateTimeOptions {
	timeZone?: string;
	locale?: string;
	includeTime?: boolean;
	hour12?: boolean;
	monthFormat?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
}

/**
 * Normaliza cualquier entrada de fecha (string ISO, timestamp numérico o Date) a un objeto Date válido.
 */
export function toValidDate(dateInput: string | number | Date | null | undefined): Date | null {
	if (!dateInput) return null;
	const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
	return isNaN(d.getTime()) ? null : d;
}

/**
 * Formatea fecha y hora respetando estrictamente la zona horaria del tenant configurado.
 * Ejemplo en Chile (UTC-3 verano / UTC-4 invierno): "12 sept 2026, 02:43 p. m."
 */
export function formatDateTime(
	dateInput: string | number | Date | null | undefined,
	options: FormatDateTimeOptions = {}
): string {
	const d = toValidDate(dateInput);
	if (!d) return '—';

	const timeZone = options.timeZone || APP_TIMEZONE;
	const locale = options.locale || APP_LOCALE;
	const includeTime = options.includeTime !== false;
	const hour12 = options.hour12 !== false;
	const month = options.monthFormat || 'short';

	try {
		return d.toLocaleDateString(locale, {
			timeZone,
			day: '2-digit',
			month,
			year: 'numeric',
			...(includeTime ? {
				hour: '2-digit',
				minute: '2-digit',
				hour12
			} : {})
		});
	} catch (e) {
		console.warn(`[formatDateTime] Error formateando con timezone "${timeZone}":`, e);
		return d.toISOString();
	}
}

/**
 * Formatea exclusivamente la fecha (sin hora).
 * Ejemplo: "12 sept 2026" o "12/09/2026"
 */
export function formatDateOnly(
	dateInput: string | number | Date | null | undefined,
	options: Omit<FormatDateTimeOptions, 'includeTime'> = {}
): string {
	return formatDateTime(dateInput, { ...options, includeTime: false });
}

/**
 * Formatea exclusivamente la hora (sin fecha).
 * Ejemplo: "02:43 p. m." o "14:43"
 */
export function formatTimeOnly(
	dateInput: string | number | Date | null | undefined,
	options: { timeZone?: string; locale?: string; hour12?: boolean } = {}
): string {
	const d = toValidDate(dateInput);
	if (!d) return '—';

	const timeZone = options.timeZone || APP_TIMEZONE;
	const locale = options.locale || APP_LOCALE;
	const hour12 = options.hour12 !== false;

	try {
		return d.toLocaleTimeString(locale, {
			timeZone,
			hour: '2-digit',
			minute: '2-digit',
			hour12
		});
	} catch {
		return '—';
	}
}
