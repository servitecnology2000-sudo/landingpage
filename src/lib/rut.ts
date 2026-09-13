/**
 * Utilidades para validación y formateo de RUT chileno y teléfonos (Servitecnology CRM)
 */

export function cleanRut(rut: string): string {
	if (!rut || typeof rut !== 'string') return '';
	return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

/**
 * Algoritmo oficial de validación de RUT chileno (Módulo 11)
 */
export function validateRut(rut: string): boolean {
	const clean = cleanRut(rut);
	if (clean.length < 8 || clean.length > 9) return false;

	const cuerpo = clean.slice(0, -1);
	const dv = clean.slice(-1);

	// No permitir cadenas con puros ceros
	if (/^0+$/.test(cuerpo)) return false;

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

/**
 * Formatea un RUT a su formato formal estándar XX.XXX.XXX-Y
 */
export function formatRut(rut: string): string {
	const clean = cleanRut(rut);
	if (clean.length < 2) return clean;

	const cuerpo = clean.slice(0, -1);
	const dv = clean.slice(-1);

	// Insertar separadores de miles
	let formattedCuerpo = '';
	let count = 0;

	for (let i = cuerpo.length - 1; i >= 0; i--) {
		formattedCuerpo = cuerpo[i] + formattedCuerpo;
		count++;
		if (count % 3 === 0 && i > 0) {
			formattedCuerpo = '.' + formattedCuerpo;
		}
	}

	return `${formattedCuerpo}-${dv}`;
}

/**
 * Extrae los 9 dígitos locales/nacionales chilenos a partir de cualquier formato.
 * Remueve prefijos internacionales (+56, 0056, 56) y ceros a la izquierda.
 */
export function cleanChileanPhone(phoneStr: string): string {
	if (!phoneStr || typeof phoneStr !== 'string') return '';
	let str = phoneStr.trim();

	// 1. Quitar prefijo explícito internacional si viene con + o 00
	if (str.startsWith('+56')) {
		str = str.slice(3);
	} else if (str.startsWith('+ 56')) {
		str = str.slice(4);
	} else if (str.startsWith('0056')) {
		str = str.slice(4);
	}

	// 2. Extraer solo dígitos
	let clean = str.replace(/\D/g, '');

	// 3. Si empezó sin '+' pero viene con prefijo país 56
	// En Chile ningún número nacional comienza con 56 (no existe código de área 56).
	if (clean.length === 11 && clean.startsWith('56')) {
		clean = clean.slice(2);
	} else if (clean.startsWith('56') && (clean.startsWith('569') || clean.startsWith('562') || clean.length > 9)) {
		clean = clean.slice(2);
	} else if (clean === '56') {
		clean = '';
	}

	// 4. Si el usuario ingresó con '0' a la izquierda (ej: 09 1234 5678 o 02 2123 4567)
	if (clean.startsWith('0') && clean.length > 1) {
		clean = clean.slice(1);
	}

	// 5. Los números en Chile tienen un máximo de 9 dígitos nacionales
	return clean.slice(0, 9);
}

/**
 * Valida si un número telefónico corresponde a un teléfono chileno válido (9 dígitos comenzando entre 2 y 9).
 */
export function isValidChileanPhone(phoneStr: string): boolean {
	const clean = cleanChileanPhone(phoneStr);
	if (clean.length !== 9) return false;
	return /^[2-9]\d{8}$/.test(clean);
}

/**
 * Formateador visual telefónico chileno (+56 9 XXXX XXXX / +56 2 XXXX XXXX / +56 XX XXX XXXX)
 */
export function formatChileanPhone(phoneStr: string): string {
	if (!phoneStr || typeof phoneStr !== 'string') return '';
	const trimmed = phoneStr.trim();

	// Si el usuario recién está escribiendo el prefijo '+'
	if (trimmed === '+') return '+';

	const digits = cleanChileanPhone(phoneStr);
	if (!digits) return '';

	if (digits.startsWith('9')) {
		// Celular Móvil: 9 XXXX XXXX
		if (digits.length <= 1) return `+56 ${digits}`;
		if (digits.length <= 5) return `+56 ${digits.slice(0, 1)} ${digits.slice(1)}`;
		return `+56 ${digits.slice(0, 1)} ${digits.slice(1, 5)} ${digits.slice(5, 9)}`;
	} else if (digits.startsWith('2')) {
		// Red Fija Santiago (RM): 2 XXXX XXXX
		if (digits.length <= 1) return `+56 ${digits}`;
		if (digits.length <= 5) return `+56 ${digits.slice(0, 1)} ${digits.slice(1)}`;
		return `+56 ${digits.slice(0, 1)} ${digits.slice(1, 5)} ${digits.slice(5, 9)}`;
	} else if (/^[3-7]/.test(digits)) {
		// Red Fija Regiones (código 2 dígitos: 32, 41, etc.): XX XXX XXXX
		if (digits.length <= 2) return `+56 ${digits}`;
		if (digits.length <= 5) return `+56 ${digits.slice(0, 2)} ${digits.slice(2)}`;
		return `+56 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
	}

	return `+56 ${digits}`;
}

/**
 * Normaliza y valida números telefónicos chilenos (+56 9...)
 */
export function normalizePhone(phone: string): string {
	if (!phone || typeof phone !== 'string') return '';
	const digits = phone.replace(/[^0-9]/g, '');
	
	// Si empieza con 56, asegurarse de que tenga formato 569...
	if (digits.startsWith('56') && digits.length >= 11) {
		return digits.slice(0, 11);
	}
	
	// Si tiene 9 dígitos y empieza con 9
	if (digits.length === 9) {
		return `56${digits}`;
	}

	// Si tiene 8 dígitos (fijo o celular sin 9 inicial)
	if (digits.length === 8) {
		return `569${digits}`;
	}

	return digits;
}

/**
 * Genera el enlace directo a WhatsApp Web con mensaje personalizado
 */
export function getWhatsAppUrl(phone: string, message: string = ''): string {
	const cleanPhone = normalizePhone(phone);
	if (!cleanPhone) return '#';
	const encodedMsg = message ? `?text=${encodeURIComponent(message)}` : '';
	return `https://wa.me/${cleanPhone}${encodedMsg}`;
}

/**
 * Determina si un RUT corresponde a una Empresa / Persona Jurídica (RUT >= 50.000.000)
 * o a una Persona Natural / RUT Personal (RUT < 50.000.000) de acuerdo con la asignación
 * de roles del Servicio de Impuestos Internos (SII) de Chile.
 */
export function isCompanyRut(rut: string): boolean {
	const clean = cleanRut(rut);
	if (!clean || clean.length < 2) return false;
	const cuerpo = clean.slice(0, -1);
	const num = parseInt(cuerpo, 10);
	return !isNaN(num) && num >= 50000000;
}
