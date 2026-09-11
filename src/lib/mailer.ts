import nodemailer from 'nodemailer';

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

interface OrderEmailData {
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
}

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<boolean> {
	try {
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

		const deliveryText = data.deliveryType === 'retiro' 
			? 'Retiro en Oficina Técnica (Santiago Centro)' 
			: `Despacho por Pagar / Cobro en Destino (${data.commune})`;

		const htmlContent = `
		<!DOCTYPE html>
		<html lang="es">
		<head>
			<meta charset="utf-8">
			<title>Confirmación de Pedido ${data.orderId}</title>
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
									<p style="margin: 5px 0 0 0; color: #00FF7F; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
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
										${data.paymentId ? `<span style="font-size: 11px; color: #a1a1aa; font-family: monospace;">ID Transacción MP: ${data.paymentId}</span>` : ''}
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
										<h4 style="margin: 0 0 10px 0; color: #00CFFF; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
											📦 Datos de Logística & Facturación SII
										</h4>
										<p style="margin: 0 0 5px 0;"><strong>Razón Social / Cliente:</strong> ${data.customerName}</p>
										<p style="margin: 0 0 5px 0;"><strong>RUT:</strong> <span style="font-family: monospace;">${data.customerRut}</span></p>
										<p style="margin: 0 0 5px 0;"><strong>Teléfono de Contacto:</strong> ${data.customerPhone}</p>
										<p style="margin: 0 0 5px 0;"><strong>Método de Entrega:</strong> ${deliveryText}</p>
										<p style="margin: 0 0 5px 0;"><strong>Dirección Registrada:</strong> ${data.customerAddress}</p>
										
										${data.deliveryType !== 'retiro' ? `
										<div style="margin-top: 12px; padding: 10px; background-color: rgba(234, 179, 8, 0.1); border-left: 3px solid #eab308; color: #fef08a; font-size: 11px;">
											<strong>Recordatorio Envíos:</strong> Tu paquete será despachado bajo la modalidad <strong>Cobro en Destino (Flete por pagar)</strong> vía Starken o Chilexpress. El valor del flete lo cancelas directamente al courier al recibir. Te enviaremos tu número de seguimiento en cuanto sea depositado.
										</div>` : ''}
									</div>
								</td>
							</tr>

							<!-- Footer -->
							<tr>
								<td style="background-color: #121215; padding: 20px 30px; text-align: center; border-top: 1px solid #27272a; font-size: 11px; color: #71717a;">
									<p style="margin: 0 0 5px 0;">SERVITECNOLOGY SpA — Santiago Centro, Chile</p>
									<p style="margin: 0 0 5px 0;">Soporte y Consultas: <a href="mailto:contacto@servitecnology.com" style="color: #00CFFF; text-decoration: none;">contacto@servitecnology.com</a> | WhatsApp: +56 9 4867 2300</p>
									<p style="margin: 0; color: #52525b;">Todas las compras incluyen Factura Electrónica conforme a las directrices del SII.</p>
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
			from: `"Servitecnology Notificaciones" <${senderEmail}>`,
			to: data.customerEmail,
			bcc: senderEmail, // Copia oculta para respaldo interno
			subject: `Confirmación de Compra Pedido ${data.orderId} — SERVITECNOLOGY`,
			html: htmlContent
		});

		return true;
	} catch (err) {
		console.error('Error enviando correo de confirmación de pedido:', err);
		return false;
	}
}
