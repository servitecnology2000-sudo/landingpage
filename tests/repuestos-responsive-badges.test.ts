import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Certificación DoD: Responsive Móvil y Colores de Estados en /repuestos', () => {
	const rootDir = process.cwd();

	// ─── 1. Aislamiento Estricto: Portada (/) y Hero Intactos ─────────────────
	describe('1. Aislamiento Estricto de la Portada', () => {
		const indexPath = path.join(rootDir, 'src', 'pages', 'index.astro');
		const heroPath = path.join(rootDir, 'src', 'components', 'Hero.astro');

		it('src/pages/index.astro debe permanecer intacto y sin componentes de repuestos', () => {
			expect(fs.existsSync(indexPath)).toBe(true);
			const indexContent = fs.readFileSync(indexPath, 'utf-8');
			expect(indexContent).not.toContain('RepuestosBannersCarousel');
			expect(indexContent).not.toContain('RepuestosCatalogNav');
			expect(indexContent).toContain('import Hero from');
		});

		it('src/components/Hero.astro debe permanecer intacto', () => {
			expect(fs.existsSync(heroPath)).toBe(true);
			const heroContent = fs.readFileSync(heroPath, 'utf-8');
			expect(heroContent).not.toContain('hero_banners');
			expect(heroContent).not.toContain('RepuestosBannersCarousel');
		});
	});

	// ─── 2. Contención de Desbordamiento y Responsive Móvil ───────────────────
	describe('2. Contención de Desbordamiento Horizontal en /repuestos', () => {
		const repuestosPath = path.join(rootDir, 'src', 'pages', 'repuestos.astro');
		const navPath = path.join(rootDir, 'src', 'components', 'RepuestosCatalogNav.astro');
		const carouselPath = path.join(rootDir, 'src', 'components', 'RepuestosBannersCarousel.astro');

		it('src/pages/repuestos.astro debe incluir contención overflow-x-clip en <main>', () => {
			expect(fs.existsSync(repuestosPath)).toBe(true);
			const repuestosContent = fs.readFileSync(repuestosPath, 'utf-8');
			expect(repuestosContent).toMatch(/<main\s+class="[^"]*overflow-x-clip/);
		});

		it('src/components/RepuestosCatalogNav.astro debe contener el resplandor absoluto con overflow-hidden', () => {
			expect(fs.existsSync(navPath)).toBe(true);
			const navContent = fs.readFileSync(navPath, 'utf-8');
			expect(navContent).toContain('id="repuestos-top-nav"');
			expect(navContent).toMatch(/id="repuestos-top-nav"[^>]*overflow-hidden/);
		});

		it('src/components/RepuestosBannersCarousel.astro debe delimitar la pastilla flotante contra desbordamientos', () => {
			expect(fs.existsSync(carouselPath)).toBe(true);
			const carouselContent = fs.readFileSync(carouselPath, 'utf-8');
			expect(carouselContent).toContain('max-w-[calc(100%-2rem)]');
			// Título responsivo con saltos de palabra
			expect(carouselContent).toContain('break-words');
		});
	});

	// ─── 3. Distinción Cromática de Estados de Producto (Verde vs Naranja) ────
	describe('3. Diferenciación Cromática de Estados (Nuevo vs Usado Verificado)', () => {
		const catalogPath = path.join(rootDir, 'src', 'components', 'Catalog.astro');
		const slugPath = path.join(rootDir, 'src', 'pages', 'repuesto', '[slug].astro');

		it('Catalog.astro debe asignar verde esmeralda a "Nuevo" y naranja/ámbar a "Usado Verificado"', () => {
			expect(fs.existsSync(catalogPath)).toBe(true);
			const catalogContent = fs.readFileSync(catalogPath, 'utf-8');
			
			// Condición basada en product.estado
			expect(catalogContent).toContain("product.estado?.toLowerCase() === 'nuevo'");
			// Clases de verde esmeralda para Nuevo
			expect(catalogContent).toContain('text-emerald-300');
			expect(catalogContent).toContain('bg-emerald-500/15');
			expect(catalogContent).toContain('border-emerald-500/30');
			// Clases de naranja/ámbar para Usado Verificado
			expect(catalogContent).toContain('text-amber-300');
			expect(catalogContent).toContain('bg-amber-500/15');
			expect(catalogContent).toContain('border-amber-500/30');
		});

		it('repuesto/[slug].astro debe aplicar la misma diferenciación cromática consistente', () => {
			expect(fs.existsSync(slugPath)).toBe(true);
			const slugContent = fs.readFileSync(slugPath, 'utf-8');
			
			expect(slugContent).toContain("product.estado?.toLowerCase() === 'nuevo'");
			expect(slugContent).toContain('text-emerald-300');
			expect(slugContent).toContain('bg-emerald-500/15');
			expect(slugContent).toContain('text-amber-300');
			expect(slugContent).toContain('bg-amber-500/15');
		});
	});

	// ─── 4. Botones de Compra y Distribución de Tarjetas ───────────────────────
	describe('4. Optimización de Botones de Compra en Tarjetas', () => {
		const catalogPath = path.join(rootDir, 'src', 'components', 'Catalog.astro');

		it('Catalog.astro debe otorgar flex-1 min-w-0 a "Agregar al Carrito" y shrink-0 a "Detalles"', () => {
			const catalogContent = fs.readFileSync(catalogPath, 'utf-8');
			expect(catalogContent).toContain('btn-add-cart flex-1 min-w-0');
			expect(catalogContent).toContain('shrink-0 flex items-center justify-center gap-1');
			expect(catalogContent).toContain('p-4 sm:p-6');
		});

		it('Catalog.astro debe separar verticalmente la barra de carrito de WhatsApp en móvil', () => {
			const catalogContent = fs.readFileSync(catalogPath, 'utf-8');
			// bottom-24 en móvil para despejar WhatsApp (bottom-6 right-6), y bottom-6 en sm+
			expect(catalogContent).toContain('bottom-24 sm:bottom-6');
		});
	});
});
