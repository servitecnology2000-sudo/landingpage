import { describe, it, expect } from 'vitest';
import {
	calculateFinancialKPIs,
	aggregateTopProducts,
	filterOrdersByPeriod,
	aggregateTimeline,
	aggregateMethodDistribution,
	aggregateTopCustomers,
	detectInventoryAlerts,
	type AnalyticsOrder
} from '../../src/lib/analytics';

describe('Pruebas del Motor Analítico (src/lib/analytics.ts)', () => {
	// Fecha de referencia fija para pruebas deterministas: 2026-09-12T12:00:00Z
	const refDate = new Date('2026-09-12T12:00:00Z');

	const mockOrders: AnalyticsOrder[] = [
		{
			id: 'ST-2026-0001',
			total_amount: 50000,
			shipping_cost: 5000,
			shipping_method: 'delivery_rm',
			payment_method: 'mercadopago',
			payment_status: 'aprobado',
			created_at: '2026-09-10T10:00:00Z',
			customer_id: 'cust-1',
			items: [
				{ sku: 'TOS-ROLLER-01', titulo: 'Rodillo Toshiba', precio_venta: 20000, cantidad: 2 },
				{ sku: 'HP-TONER-02', titulo: 'Tóner HP', precio_venta: 10000, cantidad: 1 }
			]
		},
		{
			id: 'ST-2026-0002',
			total_amount: 30000,
			shipping_cost: 0,
			shipping_method: 'retiro',
			payment_method: 'transferencia',
			payment_status: 'aprobado',
			created_at: '2026-09-11T15:30:00Z',
			customer_id: 'cust-2',
			items: [
				{ sku: 'TOS-ROLLER-01', titulo: 'Rodillo Toshiba', precio_venta: 20000, cantidad: 1 },
				{ sku: 'RICOH-GEAR-03', titulo: 'Engranaje Ricoh', precio_venta: 10000, cantidad: 1 }
			]
		},
		{
			id: 'ST-2026-0003',
			total_amount: 80000,
			shipping_cost: 8000,
			shipping_method: 'envio_nacional',
			payment_method: 'mercadopago',
			payment_status: 'pendiente', // NO debe sumar a facturación
			created_at: '2026-09-12T09:00:00Z',
			customer_id: 'cust-1',
			items: [
				{ sku: 'HP-FUSER-04', titulo: 'Fusor HP', precio_venta: 80000, cantidad: 1 }
			]
		},
		{
			id: 'ST-2026-0004',
			total_amount: 25000,
			shipping_cost: 0,
			shipping_method: 'retiro',
			payment_method: 'transferencia',
			payment_status: 'cancelado', // NO debe sumar a facturación
			created_at: '2026-09-01T14:00:00Z',
			customer_id: 'cust-3',
			items: []
		},
		{
			id: 'ST-2026-0005',
			total_amount: 40000,
			shipping_cost: 4000,
			shipping_method: 'delivery_rm',
			payment_method: 'mercadopago',
			payment_status: 'aprobado',
			created_at: '2026-08-15T11:00:00Z', // Mes anterior (Agosto 2026)
			customer_id: 'cust-1',
			items: [
				{ sku: 'HP-TONER-02', titulo: 'Tóner HP', precio_venta: 10000, cantidad: 4 }
			]
		}
	];

	const mockCatalog = [
		{ sku: 'TOS-ROLLER-01', titulo: 'Rodillo Toshiba Oficial', stock_cantidad: 1, stock_minimo: 2, imagenes: ['/img/tos.jpg'] },
		{ sku: 'HP-TONER-02', titulo: 'Tóner HP Original', stock_cantidad: 0, stock_minimo: 3, imagenes: ['/img/hp.jpg'] },
		{ sku: 'RICOH-GEAR-03', titulo: 'Engranaje Ricoh', stock_cantidad: 15, stock_minimo: 5, imagenes: [] }
	];

	describe('1. calculateFinancialKPIs', () => {
		it('debe retornar ceros de forma segura si la lista de órdenes está vacía', () => {
			const kpis = calculateFinancialKPIs([]);
			expect(kpis.totalRevenue).toBe(0);
			expect(kpis.shippingRevenue).toBe(0);
			expect(kpis.approvedOrdersCount).toBe(0);
			expect(kpis.totalOrdersCount).toBe(0);
			expect(kpis.approvalRate).toBe(0);
			expect(kpis.averageTicket).toBe(0);
			expect(kpis.totalUnitsSold).toBe(0);
		});

		it('debe sumar ingresos y unidades SOLO de órdenes aprobadas', () => {
			// Del mockOrders, las órdenes aprobadas son: ST-0001 ($50.000), ST-0002 ($30.000) y ST-0005 ($40.000)
			const kpis = calculateFinancialKPIs(mockOrders);

			expect(kpis.totalOrdersCount).toBe(5);
			expect(kpis.approvedOrdersCount).toBe(3);
			expect(kpis.totalRevenue).toBe(120000); // 50000 + 30000 + 40000
			expect(kpis.shippingRevenue).toBe(9000); // 5000 + 0 + 4000
			expect(kpis.averageTicket).toBe(40000); // 120000 / 3
			expect(kpis.approvalRate).toBe(60); // 3 de 5 = 60%
			// Unidades: ST-1 (2+1=3) + ST-2 (1+1=2) + ST-5 (4) = 9 unidades
			expect(kpis.totalUnitsSold).toBe(9);
		});
	});

	describe('2. filterOrdersByPeriod', () => {
		it('debe filtrar correctamente las órdenes del mes en curso (Septiembre 2026)', () => {
			const filtered = filterOrdersByPeriod(mockOrders, 'este_mes', refDate);
			// ST-1, ST-2, ST-3, ST-4 son de septiembre. ST-5 es de agosto (queda excluida).
			expect(filtered.length).toBe(4);
			expect(filtered.map(o => o.id)).toContain('ST-2026-0001');
			expect(filtered.map(o => o.id)).not.toContain('ST-2026-0005');
		});

		it('debe retornar todas las órdenes cuando el período es histórico', () => {
			const filtered = filterOrdersByPeriod(mockOrders, 'historico', refDate);
			expect(filtered.length).toBe(5);
		});

		it('debe incluir órdenes en últimos 30 días (desde 13 Ago hasta 12 Sep)', () => {
			const filtered = filterOrdersByPeriod(mockOrders, 'ultimos_30', refDate);
			// 15 de agosto está dentro de los últimos 30 días de 12 de septiembre
			expect(filtered.length).toBe(5);
		});
	});

	describe('3. aggregateTopProducts', () => {
		it('debe agregar ventas por SKU, sumar unidades e ingresos y asignar estado de stock', () => {
			const products = aggregateTopProducts(mockOrders, mockCatalog);

			expect(products.length).toBe(3); // TOS-ROLLER-01, HP-TONER-02, RICOH-GEAR-03

			// TOS-ROLLER-01: ST-1 (2 * 20000 = 40000) + ST-2 (1 * 20000 = 20000) = $60.000, 3 unidades
			const toshiba = products.find(p => p.sku === 'TOS-ROLLER-01');
			expect(toshiba).toBeDefined();
			expect(toshiba?.unitsSold).toBe(3);
			expect(toshiba?.revenue).toBe(60000);
			expect(toshiba?.currentStock).toBe(1);
			expect(toshiba?.stockStatus).toBe('critico'); // stock 1 <= minStock 2

			// HP-TONER-02: ST-1 (1 * 10000 = 10000) + ST-5 (4 * 10000 = 40000) = $50.000, 5 unidades
			const hp = products.find(p => p.sku === 'HP-TONER-02');
			expect(hp).toBeDefined();
			expect(hp?.unitsSold).toBe(5);
			expect(hp?.revenue).toBe(50000);
			expect(hp?.currentStock).toBe(0);
			expect(hp?.stockStatus).toBe('agotado'); // stock 0

			// RICOH-GEAR-03: ST-2 (1 * 10000 = 10000) = $10.000, 1 unidad
			const ricoh = products.find(p => p.sku === 'RICOH-GEAR-03');
			expect(ricoh).toBeDefined();
			expect(ricoh?.unitsSold).toBe(1);
			expect(ricoh?.revenue).toBe(10000);
			expect(ricoh?.currentStock).toBe(15);
			expect(ricoh?.stockStatus).toBe('ok'); // stock 15 > minStock 5

			// El primer producto debe ser el de mayor recaudación (TOS-ROLLER-01 con $60.000)
			expect(products[0].sku).toBe('TOS-ROLLER-01');
		});

		it('debe manejar órdenes con items en formato JSON string', () => {
			const stringItemOrder: AnalyticsOrder[] = [{
				id: 'ST-STRING-01',
				total_amount: 15000,
				payment_status: 'aprobado',
				created_at: '2026-09-12T10:00:00Z',
				items: JSON.stringify([
					{ sku: 'CANON-01', titulo: 'Repuesto Canon', precio_venta: 15000, cantidad: 1 }
				])
			}];

			const products = aggregateTopProducts(stringItemOrder, []);
			expect(products.length).toBe(1);
			expect(products[0].sku).toBe('CANON-01');
			expect(products[0].unitsSold).toBe(1);
			expect(products[0].revenue).toBe(15000);
		});
	});

	describe('4. aggregateTimeline', () => {
		it('debe generar puntos para el gráfico cronológico de este_mes', () => {
			const timeline = aggregateTimeline(mockOrders, 'este_mes', refDate);
			expect(timeline.length).toBe(12); // Del 1 al 12 de septiembre

			// El día 10 de septiembre debe tener la orden ST-1 ($50.000)
			const day10 = timeline.find(t => t.dateKey === '2026-09-10');
			expect(day10).toBeDefined();
			expect(day10?.revenue).toBe(50000);
			expect(day10?.ordersCount).toBe(1);

			// El día 11 de septiembre debe tener la orden ST-2 ($30.000)
			const day11 = timeline.find(t => t.dateKey === '2026-09-11');
			expect(day11).toBeDefined();
			expect(day11?.revenue).toBe(30000);
			expect(day11?.ordersCount).toBe(1);
		});
	});

	describe('5. aggregateMethodDistribution', () => {
		it('debe desglosar correctamente métodos de pago y de entrega', () => {
			const dist = aggregateMethodDistribution(mockOrders);

			// Pagos aprobados: ST-1 (mercadopago $50k), ST-2 (transferencia $30k), ST-5 (mercadopago $40k)
			// Total aprobadas = 3. Mercado Pago = 2 (66.7%), Transferencia = 1 (33.3%)
			expect(dist.byPayment.length).toBe(2);
			const mp = dist.byPayment.find(p => p.method === 'mercadopago');
			expect(mp?.count).toBe(2);
			expect(mp?.revenue).toBe(90000);
			expect(mp?.percentage).toBe(66.7);

			// Envíos sobre total 5: delivery_rm (2), retiro (2), envio_nacional (1)
			expect(dist.byShipping.length).toBe(3);
			const retiro = dist.byShipping.find(s => s.method === 'retiro');
			expect(retiro?.count).toBe(2);
			expect(retiro?.percentage).toBe(40);
		});
	});

	describe('6. aggregateTopCustomers y detectInventoryAlerts', () => {
		it('debe identificar los clientes con mayor aportación de ingresos aprobados', () => {
			const customersMap = new Map([
				['cust-1', { full_name: 'Juan Pérez', rut: '11.111.111-1', phone: '+56912345678', email: 'juan@test.cl' }],
				['cust-2', { full_name: 'Empresa SpA', rut: '76.123.456-7', phone: '+56987654321', email: 'contacto@empresa.cl' }]
			]);

			// cust-1: ST-1 ($50.000) + ST-5 ($40.000) = $90.000
			// cust-2: ST-2 ($30.000) = $30.000
			const top = aggregateTopCustomers(mockOrders, customersMap);

			expect(top.length).toBe(2);
			expect(top[0].customerId).toBe('cust-1');
			expect(top[0].totalSpent).toBe(90000);
			expect(top[0].ordersCount).toBe(2);
			expect(top[0].whatsappUrl).toContain('wa.me/56912345678');

			expect(top[1].customerId).toBe('cust-2');
			expect(top[1].totalSpent).toBe(30000);
		});

		it('debe detectar alertas de repuestos que están agotados o en stock crítico', () => {
			const products = aggregateTopProducts(mockOrders, mockCatalog);
			const alerts = detectInventoryAlerts(products);

			// En mockCatalog, HP-TONER-02 está agotado y TOS-ROLLER-01 está crítico
			expect(alerts.length).toBe(2);
			expect(alerts.map(a => a.sku)).toContain('HP-TONER-02');
			expect(alerts.map(a => a.sku)).toContain('TOS-ROLLER-01');
			expect(alerts.map(a => a.sku)).not.toContain('RICOH-GEAR-03'); // Este está 'ok' con 15 unidades
		});
	});
});
