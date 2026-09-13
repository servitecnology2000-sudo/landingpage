import { MercadoPagoConfig, Preference, Order, Payment } from 'mercadopago';

const _env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string>);

// Modo de entorno explícito: 'production', 'sandbox', 'development', etc.
// Si MERCADOPAGO_ENV no está definido, se infiere según las credenciales disponibles
const envSetting = (_env['MERCADOPAGO_ENV'] || import.meta.env.MERCADOPAGO_ENV || '').toLowerCase().trim();

const isSandboxExplicit = ['sandbox', 'development', 'dev', 'test', 'testing', 'prueba', 'pruebas'].includes(envSetting);
const isProductionExplicit = ['production', 'prod', 'produccion', 'live'].includes(envSetting);

export const isSandbox = isSandboxExplicit 
	? true 
	: isProductionExplicit 
		? false 
		: !Boolean(_env['ML_PRODUCCION_ACCESS_TOKEN'] || import.meta.env.ML_PRODUCCION_ACCESS_TOKEN);

export const mpAccessToken = isSandbox
	? (_env['ML_PRUEBAS_ACCESS_TOKEN'] || import.meta.env.ML_PRUEBAS_ACCESS_TOKEN || _env['MERCADOPAGO_ACCESS_TOKEN'] || import.meta.env.MERCADOPAGO_ACCESS_TOKEN || '')
	: (_env['ML_PRODUCCION_ACCESS_TOKEN'] || import.meta.env.ML_PRODUCCION_ACCESS_TOKEN || _env['MERCADOPAGO_ACCESS_TOKEN'] || import.meta.env.MERCADOPAGO_ACCESS_TOKEN || '');

export const mpPublicKey = isSandbox
	? (_env['ML_PRUEBAS_PUBLIC_KEY'] || import.meta.env.ML_PRUEBAS_PUBLIC_KEY || '')
	: (_env['ML_PRODUCCION_PUBLIC_KEY'] || import.meta.env.ML_PRODUCCION_PUBLIC_KEY || '');

export const isMercadoPagoConfigured = Boolean(mpAccessToken && mpAccessToken.trim().length > 10);

export const mpClient = new MercadoPagoConfig({
	accessToken: mpAccessToken,
	options: { timeout: 8000 }
});

export const orderClient = new Order(mpClient);
export const preferenceClient = new Preference(mpClient);
export const paymentClient = new Payment(mpClient);

