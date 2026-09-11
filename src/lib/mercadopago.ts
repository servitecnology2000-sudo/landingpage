import { MercadoPagoConfig, Preference } from 'mercadopago';

const _env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string>);

const mpAccessToken =
	_env['MERCADOPAGO_ACCESS_TOKEN'] ||
	_env['ML_PRUEBAS_ACCESS_TOKEN'] ||
	_env['ML_PRODUCCION_ACCESS_TOKEN'] ||
	import.meta.env.MERCADOPAGO_ACCESS_TOKEN ||
	import.meta.env.ML_PRUEBAS_ACCESS_TOKEN ||
	import.meta.env.ML_PRODUCCION_ACCESS_TOKEN ||
	'';

export const isMercadoPagoConfigured = Boolean(mpAccessToken && mpAccessToken.trim().length > 10);

export const mpClient = new MercadoPagoConfig({
	accessToken: mpAccessToken,
	options: { timeout: 8000 }
});

export const preferenceClient = new Preference(mpClient);
