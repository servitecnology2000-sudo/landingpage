import nodemailer from 'nodemailer';
import { formatDateTime } from './dates';
import { isCompanyRut } from './rut';

const _env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string>);

const smtpHost = _env['SMTP_HOST'] || 'mail.whagil.com';
const smtpPort = parseInt(_env['SMTP_PORT'] || '465', 10);
const smtpUser = _env['SMTP_USER'] || 'notificaciones@servitecnology.com';
const smtpPass = _env['SMTP_PASS'] || 'Notifica*2026';
const senderEmail = _env['SMTP_SENDER_EMAIL'] || 'notificaciones@servitecnology.com';

export const transporter = nodemailer.createTransport({
	host: smtpHost,
	port: smtpPort,
	secure: smtpPort === 465,
	auth: {
		user: smtpUser,
		pass: smtpPass
	},
	tls: {
		rejectUnauthorized: false
	}
});

export interface OrderEmailData {
	orderId: string;
	customerName: string;
	customerEmail: string;
	customerRut: string;
	customerPhone: string;
	customerAddress: string;
	items: Array<{
		sku: string;
		titulo: string;
		precio_venta: number;
		cantidad: number;
	}>;
	totalAmount: number;
	deliveryType: string;
	commune: string;
	paymentId?: string;
	isCompany?: boolean;
}

/**
 * Genera el HTML de confirmación de compra discriminando dinámicamente:
 * - RUT Personal (< 50.000.000): Boleta Electrónica.
 *   - Cobro en destino: "su boleta llegará junto con su compra"
 *   - Retiro en bodega: "su boleta se le entregará al retirar su compra en bodega"
 * - RUT Empresa (>= 50.000.000): Factura Electrónica.
 *   - Cobro en destino: "su factura llegará junto con su compra"
 *   - Retiro en bodega: "su factura se le entregará al retirar su compra en bodega"
 */
export function getOrderConfirmationEmailHtml(data: OrderEmailData): string {
	const isCompany = typeof data.isCompany === 'boolean'
		? data.isCompany
		: isCompanyRut(data.customerRut);

	const isPickup = data.deliveryType === 'retiro';
	const docType = isCompany ? 'factura' : 'boleta';
	const docTypeLabel = isCompany ? 'Factura' : 'Boleta';
	const accentColor = isCompany ? '#00CFFF' : '#00FF7F';

	// Frase de aviso tributario y entrega
	const taxDocumentMessage = isPickup
		? `su ${docType} se le entregará al retirar su compra en bodega`
		: `su ${docType} llegará junto con su compra`;

	const taxDocumentMessageCapitalized = isPickup
		? `Su ${docType} se le entregará al retirar su compra en bodega`
		: `Su ${docType} llegará junto con su compra`;

	const itemsHtml = data.items.map(it => `
		<tr>
			<td style="padding: 12px; border-bottom: 1px solid #27272a; color: #ffffff; font-size: 13px;">
				<strong>${it.titulo}</strong><br>
				<span style="color: #71717a; font-size: 11px; font-family: monospace;">SKU: ${it.sku}</span>
			</td>
			<td style="padding: 12px; border-bottom: 1px solid #27272a; color: #a1a1aa; font-size: 13px; text-align: center;">
				${it.cantidad}
			</td>
			<td style="padding: 12px; border-bottom: 1px solid #27272a; color: #00FF7F; font-size: 13px; text-align: right; font-weight: bold; font-family: monospace;">
				$${(it.precio_venta * it.cantidad).toLocaleString('es-CL')} CLP
			</td>
		</tr>
	`).join('');

	const deliveryText = isPickup 
		? 'Retiro en Oficina Técnica / Bodega (Santiago Centro)' 
		: `Despacho por Pagar / Cobro en Destino (${data.commune || 'Destino Nacional'})`;

	return `
	<!DOCTYPE html>
	<html lang="es">
	<head>
		<meta charset="utf-8">
		<title>Confirmación de Pedido ${data.orderId} — SERVITECNOLOGY</title>
	</head>
	<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e4e7;">
		<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 40px 10px;">
			<tr>
				<td align="center">
					<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #09090b; border: 1px solid #27272a; border-radius: 20px; overflow: hidden; max-width: 600px; width: 100%;">
						
						<!-- Header -->
						<tr>
							<td style="background: linear-gradient(135deg, #09090b 0%, #18181b 100%); padding: 30px; text-align: center; border-bottom: 2px solid ${accentColor};">
								<h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 2px;">
									SERVITECNOLOGY
								</h1>
								<p style="margin: 5px 0 0 0; color: ${accentColor}; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
									¡Pago Confirmado & Pedido Registrado!
								</p>
							</td>
						</tr>

						<!-- Order Code Hero Box -->
						<tr>
							<td style="padding: 30px 30px 10px 30px;">
								<p style="margin: 0 0 15px 0; font-size: 14px; color: #d4d4d8;">
									Hola <strong>${data.customerName}</strong>,
								</p>
								<p style="margin: 0 0 20px 0; font-size: 13px; color: #a1a1aa; line-height: 1.6;">
									Hemos recibido tu pago mediante Mercado Pago. A continuación te presentamos el resumen oficial de tu orden de compra y los detalles para tu entrega:
								</p>

								<div style="background-color: #18181b; border: 1px solid #3f3f46; border-radius: 12px; padding: 15px; text-align: center; margin-bottom: 25px;">
									<span style="font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 1px;">Código de Orden Único:</span>
									<div style="font-size: 26px; font-weight: 900; color: #00CFFF; font-family: monospace; letter-spacing: 2px; margin-top: 5px;">
										${data.orderId}
									</div>
									<div style="margin-top: 6px; display: inline-block; padding: 3px 10px; border-radius: 6px; background-color: ${isCompany ? 'rgba(0, 207, 255, 0.15)' : 'rgba(0, 255, 127, 0.15)'}; border: 1px solid ${accentColor};">
										<span style="font-size: 10px; font-weight: bold; color: ${accentColor}; text-transform: uppercase; letter-spacing: 0.5px;">
											${isCompany ? '🏢 Factura Electrónica SII' : '👤 Boleta Electrónica SII'}
										</span>
									</div>
									${data.paymentId ? `<div style="margin-top: 8px; font-size: 11px; color: #a1a1aa; font-family: monospace;">ID Transacción MP: ${data.paymentId}</div>` : ''}
								</div>
							</td>
						</tr>

						<!-- Items Table -->
						<tr>
							<td style="padding: 0 30px 20px 30px;">
								<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
									<thead>
										<tr style="background-color: #18181b;">
											<th style="padding: 10px 12px; text-align: left; color: #a1a1aa; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #3f3f46;">Repuesto / Producto</th>
											<th style="padding: 10px 12px; text-align: center; color: #a1a1aa; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #3f3f46;">Cant.</th>
											<th style="padding: 10px 12px; text-align: right; color: #a1a1aa; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #3f3f46;">Total</th>
										</tr>
									</thead>
									<tbody>
										${itemsHtml}
									</tbody>
									<tfoot>
										<tr>
											<td colspan="2" style="padding: 15px 12px; text-align: right; color: #ffffff; font-size: 14px; font-weight: bold;">
												Total Pagado en Web:
											</td>
											<td style="padding: 15px 12px; text-align: right; color: #00FF7F; font-size: 16px; font-weight: 900; font-family: monospace;">
												$${data.totalAmount.toLocaleString('es-CL')} CLP
											</td>
										</tr>
									</tfoot>
								</table>
							</td>
						</tr>

						<!-- Delivery & Billing Info Box -->
						<tr>
							<td style="padding: 0 30px 30px 30px;">
								<div style="background-color: #121215; border: 1px solid #27272a; border-radius: 12px; padding: 20px; font-size: 12px; line-height: 1.6;">
									<h4 style="margin: 0 0 10px 0; color: ${accentColor}; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
										📦 Datos de Logística & ${docTypeLabel} Electrónica SII
									</h4>
									<p style="margin: 0 0 5px 0;"><strong>${isCompany ? 'Razón Social / Empresa:' : 'Cliente / Titular:'}</strong> ${data.customerName}</p>
									<p style="margin: 0 0 5px 0;"><strong>RUT ${isCompany ? 'Empresa' : 'Titular'}:</strong> <span style="font-family: monospace;">${data.customerRut}</span></p>
									<p style="margin: 0 0 5px 0;"><strong>Teléfono de Contacto:</strong> ${data.customerPhone}</p>
									<p style="margin: 0 0 5px 0;"><strong>Método de Entrega:</strong> ${deliveryText}</p>
									<p style="margin: 0 0 5px 0;"><strong>Dirección Registrada:</strong> ${data.customerAddress}</p>
									
									<!-- Notificación de Documento Tributario (Boleta o Factura) -->
									<div style="margin-top: 14px; padding: 14px 16px; background-color: ${isCompany ? 'rgba(0, 207, 255, 0.08)' : 'rgba(0, 255, 127, 0.08)'}; border: 1px solid ${isCompany ? 'rgba(0, 207, 255, 0.3)' : 'rgba(0, 255, 127, 0.3)'}; border-left: 4px solid ${accentColor}; border-radius: 8px;">
										<div style="font-size: 11px; color: ${accentColor}; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
											${isCompany ? '📑 Emisión de Factura Electrónica (SII)' : '📄 Emisión de Boleta Electrónica (SII)'}:
										</div>
										<p style="margin: 0; color: #ffffff; font-size: 13px; font-weight: bold; line-height: 1.5;">
											${taxDocumentMessageCapitalized}.
										</p>
										<p style="margin: 4px 0 0 0; color: #a1a1aa; font-size: 11px; line-height: 1.4;">
											${isCompany 
												? 'Documento tributario formal para crédito fiscal emitido conforme a las directrices del SII por SERVITECNOLOGY SpA.' 
												: 'Comprobante tributario oficial de ventas emitido conforme a las directrices del SII por SERVITECNOLOGY SpA.'}
										</p>
									</div>

									${!isPickup ? `
									<div style="margin-top: 12px; padding: 12px; background-color: rgba(234, 179, 8, 0.1); border-left: 3px solid #eab308; color: #fef08a; font-size: 11px; border-radius: 4px;">
										<strong>Recordatorio Envíos:</strong> Tu paquete será despachado bajo la modalidad <strong>Cobro en Destino (Flete por pagar)</strong> vía Starken o Chilexpress. El valor del flete lo cancelas directamente al courier al recibir. Te enviaremos tu número de seguimiento en cuanto sea depositado.
									</div>` : `
									<div style="margin-top: 12px; padding: 12px; background-color: rgba(0, 255, 127, 0.05); border-left: 3px solid #00FF7F; color: #d4d4d8; font-size: 11px; border-radius: 4px;">
										<strong>Recordatorio Retiro en Bodega:</strong> Puedes retirar en nuestra oficina técnica/bodega central en Santiago Centro de Lunes a Viernes de 09:30 a 18:30 hrs presentando tu código de orden <strong>${data.orderId}</strong>.
									</div>`}
								</div>
							</td>
						</tr>

						<!-- Footer -->
						<tr>
							<td style="background-color: #121215; padding: 20px 30px; text-align: center; border-top: 1px solid #27272a; font-size: 11px; color: #71717a;">
								<p style="margin: 0 0 5px 0;">SERVITECNOLOGY SpA — Santiago Centro, Chile</p>
								<p style="margin: 0 0 5px 0;">Soporte y Consultas: <a href="mailto:contacto@servitecnology.com" style="color: #00CFFF; text-decoration: none;">contacto@servitecnology.com</a> | WhatsApp: +56 9 4867 2300</p>
								<p style="margin: 0; color: #52525b;">${isCompany ? 'Todas las compras empresariales incluyen Factura Electrónica conforme a las directrices del SII.' : 'Todas las compras incluyen Boleta Electrónica conforme a las directrices del SII.'}</p>
							</td>
						</tr>

					</table>
				</td>
			</tr>
		</table>
	</body>
	</html>
	`;
}

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<boolean> {
	try {
		const isCompany = typeof data.isCompany === 'boolean'
			? data.isCompany
			: isCompanyRut(data.customerRut);
		const docLabel = isCompany ? 'Factura' : 'Boleta';

		const htmlContent = getOrderConfirmationEmailHtml(data);

		await transporter.sendMail({
			from: `"Servitecnology Notificaciones" <${senderEmail}>`,
			to: data.customerEmail,
			bcc: senderEmail, // Copia oculta para respaldo interno
			subject: `Confirmación de Compra [${docLabel}] Pedido ${data.orderId} — SERVITECNOLOGY`,
			html: htmlContent
		});

		return true;
	} catch (err) {
		console.error('Error enviando correo de confirmación de pedido:', err);
		return false;
	}
}

export interface OrderShippedEmailData {
	orderId: string;
	customerName: string;
	customerEmail: string;
	courier: string;
	trackingNumber: string;
	shippingAddress?: string;
	commune?: string;
	items?: Array<{
		sku: string;
		titulo: string;
		precio_venta: number;
		cantidad: number;
	}>;
}

export function getCourierTrackingUrl(courier: string, trackingNumber: string): string {
	const c = (courier || '').toLowerCase();
	const code = encodeURIComponent(trackingNumber.trim());
	if (c.includes('starken')) {
		return `https://www.starken.cl/seguimiento?codigo=${code}`;
	}
	if (c.includes('chilexpress')) {
		return `https://www.chilexpress.cl/`;
	}
	if (c.includes('correos')) {
		return `https://www.correos.cl/`;
	}
	if (c.includes('blue')) {
		return `https://www.bluex.cl/`;
	}
	return `https://www.google.com/search?q=seguimiento+${encodeURIComponent(courier)}+${code}`;
}

export async function sendOrderShippedEmail(data: OrderShippedEmailData): Promise<boolean> {
	try {
		const trackingUrl = getCourierTrackingUrl(data.courier, data.trackingNumber);
		const itemsHtml = (data.items || []).map(it => `
			<tr>
				<td style="padding: 10px 12px; border-bottom: 1px solid #27272a; color: #ffffff; font-size: 13px;">
					<strong>${it.titulo}</strong><br>
					<span style="color: #71717a; font-size: 11px; font-family: monospace;">SKU: ${it.sku}</span>
				</td>
				<td style="padding: 10px 12px; border-bottom: 1px solid #27272a; color: #a1a1aa; font-size: 13px; text-align: center;">
					${it.cantidad}
				</td>
			</tr>
		`).join('');

		const htmlContent = `
		<!DOCTYPE html>
		<html lang="es">
		<head>
			<meta charset="utf-8">
			<title>¡Tu pedido ${data.orderId} ha sido despachado!</title>
		</head>
		<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e4e7;">
			<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 40px 10px;">
				<tr>
					<td align="center">
						<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #09090b; border: 1px solid #27272a; border-radius: 20px; overflow: hidden; max-width: 600px; width: 100%;">
							
							<!-- Header -->
							<tr>
								<td style="background: linear-gradient(135deg, #09090b 0%, #18181b 100%); padding: 30px; text-align: center; border-bottom: 2px solid #00CFFF;">
									<h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 2px;">
										SERVITECNOLOGY
									</h1>
									<p style="margin: 5px 0 0 0; color: #00CFFF; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
										🚀 ¡Tu Pedido Va en Camino!
									</p>
								</td>
							</tr>

							<!-- Content -->
							<tr>
								<td style="padding: 30px 30px 15px 30px;">
									<p style="margin: 0 0 15px 0; font-size: 14px; color: #d4d4d8;">
										Hola <strong>${data.customerName}</strong>,
									</p>
									<p style="margin: 0 0 20px 0; font-size: 13px; color: #a1a1aa; line-height: 1.6;">
										Te informamos que tu pedido <strong>${data.orderId}</strong> ya ha sido embalado, verificado por nuestro equipo técnico y entregado a la empresa de transporte correspondiente.
									</p>

									<!-- Logistics Hero Card -->
									<div style="background-color: #121215; border: 1px solid #00CFFF; border-radius: 14px; padding: 22px; margin-bottom: 25px; text-align: center;">
										<span style="font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 1px;">Empresa de Encomienda:</span>
										<div style="font-size: 20px; font-weight: 800; color: #ffffff; margin-top: 4px; margin-bottom: 12px;">
											📦 ${data.courier}
										</div>

										<span style="font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 1px;">Número de Seguimiento / N° de Flete:</span>
										<div style="font-size: 24px; font-weight: 900; color: #00FF7F; font-family: monospace; letter-spacing: 2px; margin-top: 5px; margin-bottom: 18px;">
											${data.trackingNumber}
										</div>

										<a href="${trackingUrl}" target="_blank" style="display: inline-block; background: linear-gradient(to right, #00CFFF, #00FF7F); color: #000000; font-size: 13px; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
											🔍 Rastrear Envío en Línea
										</a>
									</div>

									${data.shippingAddress ? `
									<div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 15px; margin-bottom: 20px; font-size: 12px;">
										<strong style="color: #00CFFF;">Destino de Entrega:</strong><br>
										<span style="color: #d4d4d8;">${data.shippingAddress} ${data.commune ? `(${data.commune})` : ''}</span>
									</div>` : ''}

									<div style="padding: 12px; background-color: rgba(234, 179, 8, 0.1); border-left: 3px solid #eab308; color: #fef08a; font-size: 11px; border-radius: 4px; margin-bottom: 20px;">
										<strong>Modalidad de Encomienda:</strong> Envío por Pagar (Cobro en Destino). Recuerda tener a mano el importe estimado del flete para cancelarlo directamente a ${data.courier} al recibir el paquete en tu domicilio o sucursal.
									</div>
								</td>
							</tr>

							<!-- Items Table -->
							${itemsHtml ? `
							<tr>
								<td style="padding: 0 30px 20px 30px;">
									<h4 style="margin: 0 0 10px 0; font-size: 12px; color: #a1a1aa; text-transform: uppercase;">
										Repuestos Despachados
									</h4>
									<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
										<thead>
											<tr style="background-color: #18181b;">
												<th style="padding: 8px 12px; text-align: left; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Producto</th>
												<th style="padding: 8px 12px; text-align: center; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Cantidad</th>
											</tr>
										</thead>
										<tbody>
											${itemsHtml}
										</tbody>
									</table>
								</td>
							</tr>` : ''}

							<!-- Footer -->
							<tr>
								<td style="background-color: #121215; padding: 20px 30px; text-align: center; border-top: 1px solid #27272a; font-size: 11px; color: #71717a;">
									<p style="margin: 0 0 5px 0;">SERVITECNOLOGY SpA — Santiago Centro, Chile</p>
									<p style="margin: 0 0 5px 0;">¿Dudas con tu despacho? <a href="mailto:contacto@servitecnology.com" style="color: #00CFFF; text-decoration: none;">contacto@servitecnology.com</a> | WhatsApp: +56 9 4867 2300</p>
								</td>
							</tr>

						</table>
					</td>
				</tr>
			</table>
		</body>
		</html>
		`;

		await transporter.sendMail({
			from: `"Servitecnology Despachos" <${senderEmail}>`,
			to: data.customerEmail,
			bcc: senderEmail,
			subject: `🚀 Tu pedido ${data.orderId} ha sido despachado (${data.courier}) — SERVITECNOLOGY`,
			html: htmlContent
		});

		return true;
	} catch (err) {
		console.error('Error enviando correo de despacho:', err);
		return false;
	}
}

export interface OrderReadyPickupEmailData {
	orderId: string;
	customerName: string;
	customerEmail: string;
	items?: Array<{
		sku: string;
		titulo: string;
		precio_venta: number;
		cantidad: number;
	}>;
}

export async function sendOrderReadyForPickupEmail(data: OrderReadyPickupEmailData): Promise<boolean> {
	try {
		const itemsHtml = (data.items || []).map(it => `
			<tr>
				<td style="padding: 10px 12px; border-bottom: 1px solid #27272a; color: #ffffff; font-size: 13px;">
					<strong>${it.titulo}</strong><br>
					<span style="color: #71717a; font-size: 11px; font-family: monospace;">SKU: ${it.sku}</span>
				</td>
				<td style="padding: 10px 12px; border-bottom: 1px solid #27272a; color: #a1a1aa; font-size: 13px; text-align: center;">
					${it.cantidad}
				</td>
			</tr>
		`).join('');

		const htmlContent = `
		<!DOCTYPE html>
		<html lang="es">
		<head>
			<meta charset="utf-8">
			<title>Tu pedido ${data.orderId} está listo para retiro</title>
		</head>
		<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e4e7;">
			<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 40px 10px;">
				<tr>
					<td align="center">
						<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #09090b; border: 1px solid #27272a; border-radius: 20px; overflow: hidden; max-width: 600px; width: 100%;">
							
							<!-- Header -->
							<tr>
								<td style="background: linear-gradient(135deg, #09090b 0%, #18181b 100%); padding: 30px; text-align: center; border-bottom: 2px solid #00FF7F;">
									<h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 2px;">
										SERVITECNOLOGY
									</h1>
									<p style="margin: 5px 0 0 0; color: #00FF7F; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
										📦 ¡Pedido Listo Para Retiro en Sucursal!
									</p>
								</td>
							</tr>

							<!-- Content -->
							<tr>
								<td style="padding: 30px 30px 15px 30px;">
									<p style="margin: 0 0 15px 0; font-size: 14px; color: #d4d4d8;">
										Hola <strong>${data.customerName}</strong>,
									</p>
									<p style="margin: 0 0 20px 0; font-size: 13px; color: #a1a1aa; line-height: 1.6;">
										Tu pedido <strong>${data.orderId}</strong> ya se encuentra preparado, embalado y listo para ser retirado en nuestra oficina técnica central.
									</p>

									<!-- Pickup Card -->
									<div style="background-color: #121215; border: 1px solid #00FF7F; border-radius: 14px; padding: 22px; margin-bottom: 25px;">
										<h3 style="margin: 0 0 12px 0; color: #00FF7F; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
											📍 Punto de Retiro Oficial
										</h3>
										<p style="margin: 0 0 8px 0; font-size: 13px; color: #ffffff;">
											<strong>Oficina Técnica SERVITECNOLOGY</strong><br>
											Santiago Centro, Región Metropolitana, Chile.
										</p>
										<p style="margin: 0 0 12px 0; font-size: 12px; color: #a1a1aa;">
											⏰ <strong>Horario de Atención:</strong> Lunes a Viernes de 09:30 a 18:30 hrs (continuado).
										</p>
										<div style="margin-top: 15px; padding: 12px; background-color: #18181b; border-radius: 8px; font-size: 12px; color: #d4d4d8;">
											<strong>Requisitos para el retiro:</strong>
											<ul style="margin: 6px 0 0 0; padding-left: 20px; color: #a1a1aa;">
												<li>Presentar Cédula de Identidad del comprador o titular.</li>
												<li>Indicar el código de orden: <strong style="color: #00CFFF; font-family: monospace;">${data.orderId}</strong>.</li>
												<li>Si retira un tercero: debe presentar copia de la cédula del comprador y el código de compra.</li>
											</ul>
										</div>
									</div>
								</td>
							</tr>

							<!-- Items Table -->
							${itemsHtml ? `
							<tr>
								<td style="padding: 0 30px 20px 30px;">
									<h4 style="margin: 0 0 10px 0; font-size: 12px; color: #a1a1aa; text-transform: uppercase;">
										Repuestos a Retirar
									</h4>
									<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
										<thead>
											<tr style="background-color: #18181b;">
												<th style="padding: 8px 12px; text-align: left; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Producto</th>
												<th style="padding: 8px 12px; text-align: center; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Cantidad</th>
											</tr>
										</thead>
										<tbody>
											${itemsHtml}
										</tbody>
									</table>
								</td>
							</tr>` : ''}

							<!-- Footer -->
							<tr>
								<td style="background-color: #121215; padding: 20px 30px; text-align: center; border-top: 1px solid #27272a; font-size: 11px; color: #71717a;">
									<p style="margin: 0 0 5px 0;">SERVITECNOLOGY SpA — Santiago Centro, Chile</p>
									<p style="margin: 0 0 5px 0;">¿Necesitas coordinar tu entrega? <a href="mailto:contacto@servitecnology.com" style="color: #00CFFF; text-decoration: none;">contacto@servitecnology.com</a> | WhatsApp: +56 9 4867 2300</p>
								</td>
							</tr>

						</table>
					</td>
				</tr>
			</table>
		</body>
		</html>
		`;

		await transporter.sendMail({
			from: `"Servitecnology Taller" <${senderEmail}>`,
			to: data.customerEmail,
			bcc: senderEmail,
			subject: `📦 Tu pedido ${data.orderId} está listo para retiro en sucursal — SERVITECNOLOGY`,
			html: htmlContent
		});

		return true;
	} catch (err) {
		console.error('Error enviando correo de retiro:', err);
		return false;
	}
}

export interface OrderDeliveredEmailData {
	orderId: string;
	customerName: string;
	customerEmail: string;
	deliveryType?: string;
	deliveryAddress?: string;
	commune?: string;
	adminNotes?: string;
	deliveredAt?: string | Date;
	items?: Array<{
		sku: string;
		titulo: string;
		precio_venta: number;
		cantidad: number;
	}>;
}

export async function sendOrderDeliveredEmail(data: OrderDeliveredEmailData): Promise<boolean> {
	try {
		const formattedDate = formatDateTime(data.deliveredAt || new Date());
		const deliveryMode = data.deliveryType === 'retiro'
			? 'Retiro en Sucursal Central (Santiago Centro)'
			: `Despacho a Domicilio / Destino${data.commune ? ` (${data.commune})` : ''}`;

		const itemsHtml = (data.items || []).map(it => `
			<tr>
				<td style="padding: 10px 12px; border-bottom: 1px solid #27272a; color: #ffffff; font-size: 13px;">
					<strong>${it.titulo}</strong><br>
					<span style="color: #71717a; font-size: 11px; font-family: monospace;">SKU: ${it.sku}</span>
				</td>
				<td style="padding: 10px 12px; border-bottom: 1px solid #27272a; color: #a1a1aa; font-size: 13px; text-align: center;">
					${it.cantidad}
				</td>
				<td style="padding: 10px 12px; border-bottom: 1px solid #27272a; color: #00FF7F; font-size: 13px; text-align: right; font-weight: bold; font-family: monospace;">
					$${(it.precio_venta * it.cantidad).toLocaleString('es-CL')} CLP
				</td>
			</tr>
		`).join('');

		const htmlContent = `
		<!DOCTYPE html>
		<html lang="es">
		<head>
			<meta charset="utf-8">
			<title>Tu pedido ${data.orderId} ha sido entregado exitosamente</title>
		</head>
		<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e4e7;">
			<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 40px 10px;">
				<tr>
					<td align="center">
						<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #09090b; border: 1px solid #27272a; border-radius: 20px; overflow: hidden; max-width: 600px; width: 100%;">
							
							<!-- Header -->
							<tr>
								<td style="background: linear-gradient(135deg, #09090b 0%, #18181b 100%); padding: 30px; text-align: center; border-bottom: 2px solid #00FF7F;">
									<h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 2px;">
										SERVITECNOLOGY
									</h1>
									<p style="margin: 5px 0 0 0; color: #00FF7F; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
										🏁 ¡Pedido Entregado y Finalizado!
									</p>
								</td>
							</tr>

							<!-- Content -->
							<tr>
								<td style="padding: 30px 30px 15px 30px;">
									<p style="margin: 0 0 15px 0; font-size: 14px; color: #d4d4d8;">
										Hola <strong>${data.customerName}</strong>,
									</p>
									<p style="margin: 0 0 20px 0; font-size: 13px; color: #a1a1aa; line-height: 1.6;">
										Te confirmamos que tu pedido con código <strong style="color: #00CFFF; font-family: monospace;">${data.orderId}</strong> ha sido marcado como <strong>ENTREGADO</strong> y finalizado en nuestros registros oficiales.
									</p>

									<!-- Delivery Detail Box -->
									<div style="background-color: #121215; border: 1px solid #27272a; border-left: 4px solid #00FF7F; border-radius: 14px; padding: 20px; margin-bottom: 20px;">
										<h3 style="margin: 0 0 12px 0; color: #00FF7F; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
											📋 Constancia Oficial de Entrega
										</h3>
										<p style="margin: 0 0 8px 0; font-size: 13px; color: #ffffff;">
											<strong>Modalidad:</strong> ${deliveryMode}
										</p>
										<p style="margin: 0 0 8px 0; font-size: 12px; color: #a1a1aa;">
											⏰ <strong>Fecha y Hora de Entrega:</strong> ${formattedDate}
										</p>
										${data.deliveryAddress ? `
										<p style="margin: 0 0 8px 0; font-size: 12px; color: #a1a1aa;">
											📍 <strong>Dirección:</strong> ${data.deliveryAddress}
										</p>` : ''}
										${data.adminNotes ? `
										<div style="margin-top: 12px; padding: 10px 12px; background-color: #18181b; border: 1px solid rgba(0, 255, 127, 0.2); border-radius: 8px;">
											<span style="font-size: 11px; color: #00FF7F; font-weight: bold; text-transform: uppercase;">Receptor / Nota de Entrega en Taller:</span>
											<p style="margin: 4px 0 0 0; font-size: 13px; color: #ffffff;">"${data.adminNotes}"</p>
										</div>` : ''}
									</div>

									<!-- Security Notice Box -->
									<div style="background-color: rgba(0, 207, 255, 0.04); border: 1px solid rgba(0, 207, 255, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 25px;">
										<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
											<span style="font-size: 16px;">🛡️</span>
											<strong style="color: #00CFFF; font-size: 13px;">Notificación de Seguridad y Protocolo de Retiro:</strong>
										</div>
										<p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
											Este correo es un aviso automático de entrega efectiva. Si no realizaste este retiro o no autorizaste a un tercero para recibir tus productos, por favor contáctanos <strong>de manera inmediata</strong> a través de nuestro WhatsApp oficial de soporte para activar el protocolo de seguridad.
										</p>
									</div>
								</td>
							</tr>

							<!-- Items Table -->
							${itemsHtml ? `
							<tr>
								<td style="padding: 0 30px 20px 30px;">
									<h4 style="margin: 0 0 10px 0; font-size: 12px; color: #a1a1aa; text-transform: uppercase;">
										📦 Repuestos Entregados
									</h4>
									<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
										<thead>
											<tr style="background-color: #18181b;">
												<th style="padding: 8px 12px; text-align: left; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Producto</th>
												<th style="padding: 8px 12px; text-align: center; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Cant.</th>
												<th style="padding: 8px 12px; text-align: right; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Subtotal</th>
											</tr>
										</thead>
										<tbody>
											${itemsHtml}
										</tbody>
									</table>
								</td>
							</tr>` : ''}

							<!-- Warranty Box -->
							<tr>
								<td style="padding: 0 30px 25px 30px;">
									<div style="background-color: #121215; border: 1px solid #27272a; border-radius: 12px; padding: 16px; text-align: center;">
										<h4 style="margin: 0 0 6px 0; color: #ffffff; font-size: 13px;">
											🔧 Garantía Técnica SERVITECNOLOGY (3 Meses)
										</h4>
										<p style="margin: 0 0 12px 0; font-size: 12px; color: #71717a; line-height: 1.5;">
											Tus componentes y repuestos cuentan con garantía legal por fallas o defectos de fábrica. Conserva este comprobante para cualquier atención técnica o cambio.
										</p>
										<a href="https://wa.me/56948672300?text=Hola%20tengo%20una%20consulta%20sobre%20mi%20pedido%20entregado%20${data.orderId}" style="display: inline-block; background: #25D366; color: #000000; font-weight: bold; font-size: 12px; padding: 10px 20px; border-radius: 8px; text-decoration: none;">
											💬 Contactar a Soporte por WhatsApp
										</a>
									</div>
								</td>
							</tr>

							<!-- Footer -->
							<tr>
								<td style="background-color: #121215; padding: 20px 30px; text-align: center; border-top: 1px solid #27272a; font-size: 11px; color: #71717a;">
									<p style="margin: 0 0 5px 0;">SERVITECNOLOGY SpA — Santiago Centro, Región Metropolitana, Chile</p>
									<p style="margin: 0 0 5px 0;">Atención Técnica y Despachos: <a href="mailto:contacto@servitecnology.com" style="color: #00CFFF; text-decoration: none;">contacto@servitecnology.com</a> | WhatsApp: +56 9 4867 2300</p>
								</td>
							</tr>

						</table>
					</td>
				</tr>
			</table>
		</body>
		</html>
		`;

		await transporter.sendMail({
			from: `"Servitecnology Taller" <${senderEmail}>`,
			to: data.customerEmail,
			bcc: senderEmail,
			subject: `🏁 Tu pedido ${data.orderId} ha sido entregado exitosamente — SERVITECNOLOGY`,
			html: htmlContent
		});

		return true;
	} catch (err) {
		console.error('Error enviando correo de entrega:', err);
		return false;
	}
}

