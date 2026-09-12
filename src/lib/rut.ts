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
