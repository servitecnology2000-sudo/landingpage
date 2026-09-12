/**
 * SERVITECNOLOGY - Motor Analítico Financiero y Comercial (Fase 3)
 * Procesa órdenes, ventas de repuestos, cálculo de KPIs y métricas en tiempo real sobre SSR Astro.
 */

import { getWhatsAppUrl } from './rut';

export type PeriodKey = 'este_mes' | 'ultimos_30' | 'trimestre' | 'historico';

export interface OrderItemJSON {
	sku: string;
	titulo: string;
	precio_venta: number | string;
	cantidad: number | string;
	imagen?: string;
}

export interface AnalyticsOrder {
	id: string;
	total_amount: number | string;
	shipping_cost?: number | string | null;
	shipping_method?: 'retiro' | 'delivery_rm' | 'envio_nacional' | string | null;
	payment_method?: 'mercadopago' | 'transferencia' | string | null;
	payment_status: 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado' | string;
	order_status?: string | null;
	items?: OrderItemJSON[] | string | null;
	customer_id?: string | null;
	created_at: string;
}

export interface FinancialKPIs {
	totalRevenue: number;
	shippingRevenue: number;
	approvedOrdersCount: number;
	totalOrdersCount: number;
	approvalRate: number;
	averageTicket: number;
	totalUnitsSold: number;
}

export interface ProductSales {
	sku: string;
	titulo: string;
	imagen: string;
	unitsSold: number;
	revenue: number;
	currentStock: number;
	minStock: number;
	stockStatus: 'ok' | 'critico' | 'agotado';
}

export interface TimelinePoint {
	dateKey: string;
	label: string;
	revenue: number;
	ordersCount: number;
}

export interface MethodDistribution {
	byPayment: {
		method: string;
		label: string;
		count: number;
		revenue: number;
		percentage: number;
	}[];
	byShipping: {
		method: string;
		label: string;
		count: number;
		percentage: number;
	}[];
}

export interface TopCustomer {
	customerId: string;
	fullName: string;
	rut: string;
	phone: string;
	email: string;
	ordersCount: number;
	totalSpent: number;
	whatsappUrl: string;
}

/**
 * Parsea de forma segura el campo items de una orden (sea array o string JSON).
 */
export function parseOrderItems(rawItems: any): OrderItemJSON[] {
	if (!rawItems) return [];
	if (Array.isArray(rawItems)) return rawItems;
	if (typeof rawItems === 'string') {
		try {
			const parsed = JSON.parse(rawItems);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}
	return [];
}

/**
 * Filtra órdenes por rango temporal seleccionado.
 */
export function filterOrdersByPeriod(
	orders: AnalyticsOrder[],
	period: PeriodKey,
	referenceDate: Date = new Date()
): AnalyticsOrder[] {
	if (!orders || orders.length === 0) return [];
	if (period === 'historico') return orders;

	const now = new Date(referenceDate.getTime());

	let startDate: Date;
	if (period === 'este_mes') {
		startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
	} else if (period === 'ultimos_30') {
		startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	} else if (period === 'trimestre') {
		startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
	} else {
		return orders;
	}

	return orders.filter(o => {
		if (!o.created_at) return false;
		const orderDate = new Date(o.created_at);
		return orderDate >= startDate && orderDate <= now;
	});
}

/**
 * Calcula los indicadores financieros clave (KPIs) a partir de una lista de órdenes.
 */
export function calculateFinancialKPIs(orders: AnalyticsOrder[]): FinancialKPIs {
	if (!orders || orders.length === 0) {
		return {
			totalRevenue: 0,
			shippingRevenue: 0,
			approvedOrdersCount: 0,
			totalOrdersCount: 0,
			approvalRate: 0,
			averageTicket: 0,
			totalUnitsSold: 0
		};
	}

	const totalOrdersCount = orders.length;
	let totalRevenue = 0;
	let shippingRevenue = 0;
	let approvedOrdersCount = 0;
	let totalUnitsSold = 0;

	for (const order of orders) {
		const isApproved = order.payment_status === 'aprobado';
		if (isApproved) {
			approvedOrdersCount++;
			totalRevenue += Number(order.total_amount) || 0;
			shippingRevenue += Number(order.shipping_cost) || 0;

			const items = parseOrderItems(order.items);
			for (const item of items) {
				totalUnitsSold += Math.max(0, parseInt(String(item.cantidad), 10) || 0);
			}
		}
	}

	const averageTicket = approvedOrdersCount > 0 ? Math.round(totalRevenue / approvedOrdersCount) : 0;
	const approvalRate = totalOrdersCount > 0 ? Math.round((approvedOrdersCount / totalOrdersCount) * 1000) / 10 : 0;

	return {
		totalRevenue,
		shippingRevenue,
		approvedOrdersCount,
		totalOrdersCount,
		approvalRate,
		averageTicket,
		totalUnitsSold
	};
}

/**
 * Agrega el desempeño de ventas por producto desglosando los items JSONB de órdenes aprobadas.
 */
export function aggregateTopProducts(
	orders: AnalyticsOrder[],
	catalogProducts: any[] = []
): ProductSales[] {
	if (!orders || orders.length === 0) return [];

	const catalogMap = new Map<string, any>();
	for (const p of catalogProducts) {
		if (p.sku) catalogMap.set(p.sku, p);
	}

	const productMap = new Map<string, {
		sku: string;
		titulo: string;
		imagen: string;
		unitsSold: number;
		revenue: number;
	}>();

	for (const order of orders) {
		if (order.payment_status !== 'aprobado') continue;
		const items = parseOrderItems(order.items);

		for (const item of items) {
			const sku = item.sku || 'SIN-SKU';
			const qty = Math.max(0, parseInt(String(item.cantidad), 10) || 0);
			const price = Number(item.precio_venta) || 0;
			const subtotal = price * qty;

			const existing = productMap.get(sku);
			if (existing) {
				existing.unitsSold += qty;
				existing.revenue += subtotal;
				if (!existing.imagen && item.imagen) existing.imagen = item.imagen;
			} else {
				productMap.set(sku, {
					sku,
					titulo: item.titulo || 'Repuesto sin título',
					imagen: item.imagen || '',
					unitsSold: qty,
					revenue: subtotal
				});
			}
		}
	}

	const result: ProductSales[] = [];

	for (const [sku, sales] of productMap.entries()) {
		const dbProd = catalogMap.get(sku);
		const currentStock = dbProd ? Number(dbProd.stock_cantidad) || 0 : 0;
		const minStock = dbProd ? Number(dbProd.stock_minimo) || 2 : 2;

		let stockStatus: 'ok' | 'critico' | 'agotado' = 'ok';
		if (currentStock <= 0) {
			stockStatus = 'agotado';
		} else if (currentStock <= minStock) {
			stockStatus = 'critico';
		}

		// Si el catálogo tiene imagen oficial y el item no tenía, la adoptamos
		let imagen = sales.imagen;
		if (!imagen && dbProd?.imagenes && dbProd.imagenes.length > 0) {
			imagen = dbProd.imagenes[0];
		}

		result.push({
			...sales,
			imagen,
			currentStock,
			minStock,
			stockStatus
		});
	}

	// Ordenar por recaudación descendente, luego por unidades vendidas
	return result.sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold);
}

/**
 * Agrupa las ventas aprobadas en puntos cronológicos para el gráfico de barras SVG.
 */
export function aggregateTimeline(
	orders: AnalyticsOrder[],
	period: PeriodKey,
	referenceDate: Date = new Date()
): TimelinePoint[] {
	const approvedOrders = (orders || []).filter(o => o.payment_status === 'aprobado');
	const now = new Date(referenceDate.getTime());

	const pointsMap = new Map<string, { label: string; revenue: number; ordersCount: number }>();

	// Definir rango de días a inicializar
	let daysCount = 30;
	if (period === 'este_mes') {
		daysCount = Math.max(1, now.getDate());
	} else if (period === 'ultimos_30') {
		daysCount = 30;
	} else if (period === 'trimestre') {
		daysCount = 90;
	} else {
		// Para histórico, si hay órdenes, tomar últimos 30 días con actividad o 30 días atrás
		daysCount = 30;
	}

	// Para trimestre (90 días), agrupar por bloques de semanas (12-13 semanas)
	if (period === 'trimestre') {
		const weeksCount = 13;
		for (let i = weeksCount - 1; i >= 0; i--) {
			const weekStart = new Date(now.getTime() - (i * 7 + 6) * 24 * 60 * 60 * 1000);
			const weekEnd = new Date(now.getTime() - (i * 7) * 24 * 60 * 60 * 1000);
			const key = `W-${weekStart.toISOString().split('T')[0]}`;
			const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
			pointsMap.set(key, { label, revenue: 0, ordersCount: 0 });
		}

		for (const order of approvedOrders) {
			if (!order.created_at) continue;
			const orderDate = new Date(order.created_at);
			for (let i = weeksCount - 1; i >= 0; i--) {
				const weekStart = new Date(now.getTime() - (i * 7 + 6) * 24 * 60 * 60 * 1000);
				const weekEnd = new Date(now.getTime() - (i * 7) * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
				if (orderDate >= weekStart && orderDate < weekEnd) {
					const key = `W-${weekStart.toISOString().split('T')[0]}`;
					const pt = pointsMap.get(key);
					if (pt) {
						pt.revenue += Number(order.total_amount) || 0;
						pt.ordersCount += 1;
					}
					break;
				}
			}
		}

		return Array.from(pointsMap.entries()).map(([dateKey, val]) => ({
			dateKey,
			label: val.label,
			revenue: val.revenue,
			ordersCount: val.ordersCount
		}));
	}

	// Para días individuales (este_mes, ultimos_30, historico)
	const startDate = period === 'este_mes'
		? new Date(now.getFullYear(), now.getMonth(), 1)
		: new Date(now.getTime() - (daysCount - 1) * 24 * 60 * 60 * 1000);

	for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
		const isoDate = d.toISOString().split('T')[0];
		const dayNum = d.getDate();
		const monthNum = d.getMonth() + 1;
		const label = `${dayNum < 10 ? '0' + dayNum : dayNum}/${monthNum < 10 ? '0' + monthNum : monthNum}`;
		pointsMap.set(isoDate, { label, revenue: 0, ordersCount: 0 });
	}

	for (const order of approvedOrders) {
		if (!order.created_at) continue;
		const iso = order.created_at.split('T')[0];
		const pt = pointsMap.get(iso);
		if (pt) {
			pt.revenue += Number(order.total_amount) || 0;
			pt.ordersCount += 1;
		}
	}

	return Array.from(pointsMap.entries()).map(([dateKey, val]) => ({
		dateKey,
		label: val.label,
		revenue: val.revenue,
		ordersCount: val.ordersCount
	}));
}

/**
 * Calcula la distribución porcentual por método de pago y logística de entrega.
 */
export function aggregateMethodDistribution(orders: AnalyticsOrder[]): MethodDistribution {
	if (!orders || orders.length === 0) {
		return { byPayment: [], byShipping: [] };
	}

	const approvedOrders = orders.filter(o => o.payment_status === 'aprobado');
	const totalApprovedCount = approvedOrders.length;

	// Pagos
	const payCounts = new Map<string, { count: number; revenue: number }>();
	for (const o of approvedOrders) {
		const method = o.payment_method || 'desconocido';
		const cur = payCounts.get(method) || { count: 0, revenue: 0 };
		cur.count += 1;
		cur.revenue += Number(o.total_amount) || 0;
		payCounts.set(method, cur);
	}

	const byPayment = Array.from(payCounts.entries()).map(([method, data]) => {
		let label = method;
		if (method === 'mercadopago') label = 'Mercado Pago (Tarjetas / Débito)';
		else if (method === 'transferencia') label = 'Transferencia BancoEstado';

		const percentage = totalApprovedCount > 0 ? Math.round((data.count / totalApprovedCount) * 1000) / 10 : 0;
		return {
			method,
			label,
			count: data.count,
			revenue: data.revenue,
			percentage
		};
	}).sort((a, b) => b.count - a.count);

	// Envíos (sobre todas las órdenes creadas)
	const shipCounts = new Map<string, number>();
	for (const o of orders) {
		const method = o.shipping_method || 'retiro';
		shipCounts.set(method, (shipCounts.get(method) || 0) + 1);
	}

	const totalOrdersCount = orders.length;
	const byShipping = Array.from(shipCounts.entries()).map(([method, count]) => {
		let label = method;
		if (method === 'retiro') label = 'Retiro en Sucursal (Santiago Centro)';
		else if (method === 'delivery_rm') label = 'Delivery Express RM';
		else if (method === 'envio_nacional') label = 'Envío Nacional (Starken / Chilexpress)';

		const percentage = totalOrdersCount > 0 ? Math.round((count / totalOrdersCount) * 1000) / 10 : 0;
		return {
			method,
			label,
			count,
			percentage
		};
	}).sort((a, b) => b.count - a.count);

	return { byPayment, byShipping };
}

/**
 * Agrega los clientes con mayor aportación de ingresos en el período.
 */
export function aggregateTopCustomers(
	orders: AnalyticsOrder[],
	customersMap: Map<string, any> = new Map(),
	limit: number = 5
): TopCustomer[] {
	if (!orders || orders.length === 0) return [];

	const customerSales = new Map<string, { count: number; total: number }>();

	for (const o of orders) {
		if (o.payment_status !== 'aprobado' || !o.customer_id) continue;
		const cur = customerSales.get(o.customer_id) || { count: 0, total: 0 };
		cur.count += 1;
		cur.total += Number(o.total_amount) || 0;
		customerSales.set(o.customer_id, cur);
	}

	const result: TopCustomer[] = [];

	for (const [custId, stats] of customerSales.entries()) {
		const cust = customersMap.get(custId);
		const fullName = cust?.full_name || cust?.razon_social || 'Cliente de Compra';
		const rut = cust?.rut || 'Sin RUT';
		const phone = cust?.phone || '';
		const email = cust?.email || '';
		const whatsappUrl = phone ? getWhatsAppUrl(phone, `Hola ${fullName}, te contactamos desde SERVITECNOLOGY respecto a tus compras.`) : '';

		result.push({
			customerId: custId,
			fullName,
			rut,
			phone,
			email,
			ordersCount: stats.count,
			totalSpent: stats.total,
			whatsappUrl
		});
	}

	return result.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, limit);
}

/**
 * Detecta repuestos con alta demanda en el período que presentan stock crítico o agotado.
 */
export function detectInventoryAlerts(products: ProductSales[], maxResults: number = 6): ProductSales[] {
	if (!products || products.length === 0) return [];

	return products
		.filter(p => p.stockStatus === 'critico' || p.stockStatus === 'agotado')
		.slice(0, maxResults);
}
