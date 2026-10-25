import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Certificación DoD: Personalización de Fondos de /repuestos y Menú Principal Global', () => {
	const rootDir = process.cwd();

	// ─── 1. Endpoint API de Administración ──────────────────────────────────────────
	describe('1. API de Administración (src/pages/api/admin/banners/custom-backgrounds.ts)', () => {
		const apiPath = path.join(rootDir, 'src', 'pages', 'api', 'admin', 'banners', 'custom-backgrounds.ts');

		it('el endpoint API debe existir físicamente', () => {
			expect(fs.existsSync(apiPath)).toBe(true);
		});

		it('debe tener export prerender = false y exportar GET y POST', () => {
			const content = fs.readFileSync(apiPath, 'utf-8');
			expect(content).toContain('export const prerender = false');
			expect(content).toContain('export const GET');
			expect(content).toContain('export const POST');
		});

		it('debe requerir autenticación administrativa y verificar ADMIN_SECRET', () => {
			const content = fs.readFileSync(apiPath, 'utf-8');
			expect(content).toContain('verifyAuth');
			expect(content).toContain('admin_session');
			expect(content).toContain('ADMIN_SECRET');
		});

		it('GET debe consultar y retornar searchBg, carouselBg y menuBg independientemente', () => {
			const content = fs.readFileSync(apiPath, 'utf-8');
			expect(content).toContain("'repuestos_fondo_busqueda'");
			expect(content).toContain("'repuestos_fondo_carrusel'");
			expect(content).toContain("'menu_principal'");
			expect(content).toContain('searchBg');
			expect(content).toContain('carouselBg');
			expect(content).toContain('menuBg');
			expect(content).toContain('isOriginalRepuestos');
			expect(content).toContain('isOriginalMenu');
		});

		it('POST debe soportar "set_menu_bg" para personalizar el menú principal', () => {
			const content = fs.readFileSync(apiPath, 'utf-8');
			expect(content).toContain("action === 'set_menu_bg'");
			expect(content).toContain("targetSection = 'menu_principal'");
		});

		it('POST debe soportar "reset_menu_original" que desactiva exclusivamente menu_principal sin alterar Repuestos', () => {
			const content = fs.readFileSync(apiPath, 'utf-8');
			expect(content).toContain("action === 'reset_menu_original'");
			expect(content).toContain(".eq('seccion', 'menu_principal')");
		});

		it('POST "reset_original" de Repuestos debe desactivar solo repuestos_fondo_busqueda y repuestos_fondo_carrusel sin alterar menu_principal', () => {
			const content = fs.readFileSync(apiPath, 'utf-8');
			expect(content).toContain("action === 'reset_original'");
			expect(content).toContain(".in('seccion', ['repuestos_fondo_busqueda', 'repuestos_fondo_carrusel'])");
		});
	});

	// ─── 2. Endpoint Público del Menú (src/pages/api/menu-background.ts) ────────────
	describe('2. Endpoint Público del Menú (src/pages/api/menu-background.ts)', () => {
		const publicApiPath = path.join(rootDir, 'src', 'pages', 'api', 'menu-background.ts');

		it('debe existir el endpoint público para lectura del fondo de menú', () => {
			expect(fs.existsSync(publicApiPath)).toBe(true);
		});

		it('debe consultar exclusivamente hero_banners con seccion = "menu_principal" y activo = true', () => {
			const content = fs.readFileSync(publicApiPath, 'utf-8');
			expect(content).toContain(".eq('seccion', 'menu_principal')");
			expect(content).toContain(".eq('activo', true)");
			expect(content).toContain('export const GET');
		});
	});

	// ─── 3. Panel Administrativo en /meson-servitecnology-st/banners ──────────────────
	describe('3. Panel Administrativo (src/pages/meson-servitecnology-st/banners.astro)', () => {
		const adminBannersPath = path.join(rootDir, 'src', 'pages', 'meson-servitecnology-st', 'banners.astro');

		it('debe contener el apartado claramente separado «Apariencia del menú principal»', () => {
			const content = fs.readFileSync(adminBannersPath, 'utf-8');
			expect(content).toContain('Apariencia del menú principal');
			expect(content).toContain('Navegación Global Compartida');
			expect(content).toContain('id="btnOpenMenuBgModal"');
		});

		it('debe contener el modal #menuBgModal con selector de archivo y preajuste Halloween', () => {
			const content = fs.readFileSync(adminBannersPath, 'utf-8');
			expect(content).toContain('id="menuBgModal"');
			expect(content).toContain('id="menuBgForm"');
			expect(content).toContain('id="menuBgFileInput"');
			expect(content).toContain('id="btnSelectMenuPresetHalloween"');
			expect(content).toContain('/seasonal/halloween/fondo-nav.webp');
		});

		it('debe incluir la acción independiente «Volver a colores originales» para el menú', () => {
			const content = fs.readFileSync(adminBannersPath, 'utf-8');
			expect(content).toContain('id="btnResetMenuOriginal"');
			expect(content).toContain("action: 'reset_menu_original'");
		});

		it('debe preservar intactos los controles y modales de la sección de Repuestos', () => {
			const content = fs.readFileSync(adminBannersPath, 'utf-8');
			expect(content).toContain('id="btnOpenSearchBgModal"');
			expect(content).toContain('id="btnOpenCarouselBgModal"');
			expect(content).toContain('id="btnResetOriginalColors"');
			expect(content).toContain('id="btnOpenNewBannerModal"');
			expect(content).toContain('id="searchBgModal"');
			expect(content).toContain('id="carouselBgModal"');
		});
	});

	// ─── 4. Componente Compartido Global (src/components/Header.astro) ────────────────
	describe('4. Encabezado Global Compartido (src/components/Header.astro)', () => {
		const headerPath = path.join(rootDir, 'src', 'components', 'Header.astro');

		it('debe consultar SSR dinámicamente el fondo de menu_principal', () => {
			const content = fs.readFileSync(headerPath, 'utf-8');
			expect(content).toContain(".eq('seccion', 'menu_principal')");
			expect(content).toContain(".eq('activo', true)");
			expect(content).toContain('menuBgUrl');
		});

		it('debe renderizar condicionalmente el fondo con capa de oscurecimiento para legibilidad y contraste', () => {
			const content = fs.readFileSync(headerPath, 'utf-8');
			expect(content).toContain('id="header-custom-bg"');
			expect(content).toContain('bg-black/70');
			expect(content).toContain('backdrop-blur-[2px]');
			expect(content).toContain('pointer-events-none');
		});

		it('debe preservar la navegación móvil (mobile-menu) y el logotipo intactos', () => {
			const content = fs.readFileSync(headerPath, 'utf-8');
			expect(content).toContain('id="mobile-menu"');
			expect(content).toContain('id="menu-toggle"');
			expect(content).toContain('/imagenes/logost.png');
			expect(content).toContain('class="h-12 w-auto object-contain');
		});

		it('debe incluir script de sincronización con /api/menu-background para reflejo inmediato', () => {
			const content = fs.readFileSync(headerPath, 'utf-8');
			expect(content).toContain('/api/menu-background');
			expect(content).toContain('syncHeaderBackground');
		});
	});

	// ─── 5. Cobertura Global Comprobada ──────────────────────────────────────────────
	describe('5. Cobertura Global: Páginas que comparten Header.astro', () => {
		const pagesToCheck = [
			'index.astro',
			'repuestos.astro',
			'nosotros.astro',
			'soporte.astro',
			'cctv.astro',
			'desarrollo.astro',
			'checkout.astro',
			'canal-de-youtube.astro',
			'404.astro'
		];

		pagesToCheck.forEach(pageFile => {
			it(`src/pages/${pageFile} debe importar y renderizar Header.astro garantizando cobertura global`, () => {
				const fullPath = path.join(rootDir, 'src', 'pages', pageFile);
				expect(fs.existsSync(fullPath)).toBe(true);
				const content = fs.readFileSync(fullPath, 'utf-8');
				expect(content).toContain('import Header from');
				expect(content).toContain('<Header');
			});
		});
	});

	// ─── 6. Consumo Dinámico en /repuestos ───────────────────────────────────────────
	describe('6. Consumo Dinámico en src/pages/repuestos.astro', () => {
		const repuestosPath = path.join(rootDir, 'src', 'pages', 'repuestos.astro');

		it('debe consultar dinámicamente fondos de búsqueda y carrusel desde Supabase', () => {
			const content = fs.readFileSync(repuestosPath, 'utf-8');
			expect(content).toContain("'repuestos_fondo_busqueda'");
			expect(content).toContain("'repuestos_fondo_carrusel'");
			expect(content).toContain('customSearchBg');
			expect(content).toContain('customCarouselBg');
		});

		it('debe pasar customCarouselBg como prop customBg al carrusel', () => {
			const content = fs.readFileSync(repuestosPath, 'utf-8');
			expect(content).toContain('<RepuestosBannersCarousel customBg={customCarouselBg} />');
		});
	});

	// ─── 7. Carrusel de Banners (src/components/RepuestosBannersCarousel.astro) ────────
	describe('7. Carrusel de Banners (src/components/RepuestosBannersCarousel.astro)', () => {
		const carouselPath = path.join(rootDir, 'src', 'components', 'RepuestosBannersCarousel.astro');

		it('debe aceptar prop customBg opcional', () => {
			const content = fs.readFileSync(carouselPath, 'utf-8');
			expect(content).toContain('customBg?: string | null');
			expect(content).toContain('const { customBg = null } = Astro.props');
		});

		it('cuando customBg es null, debe mostrar slide.imagen_url original en Slide 0', () => {
			const content = fs.readFileSync(carouselPath, 'utf-8');
			expect(content).toContain('{customBg ? (');
			expect(content).toContain('src={slide.imagen_url}');
		});
	});

	// ─── 8. Preservación de Recursos y Aislamiento ────────────────────────────────────
	describe('8. Preservación de Recursos y Aislamiento', () => {
		const navImgPath = path.join(rootDir, 'public', 'seasonal', 'halloween', 'fondo-nav.webp');
		const catalogPath = path.join(rootDir, 'src', 'components', 'Catalog.astro');
		const heroPath = path.join(rootDir, 'src', 'components', 'Hero.astro');

		it('public/seasonal/halloween/fondo-nav.webp debe preservarse para uso opcional del usuario (>100 KB)', () => {
			expect(fs.existsSync(navImgPath)).toBe(true);
			const stat = fs.statSync(navImgPath);
			expect(stat.size).toBeGreaterThan(100000);
		});

		it('src/components/Catalog.astro debe conservar su diseño original limpio', () => {
			const catalogContent = fs.readFileSync(catalogPath, 'utf-8');
			expect(catalogContent).not.toContain('repuestos_fondo_busqueda');
			expect(catalogContent).not.toContain('menu_principal');
		});

		it('src/components/Hero.astro debe permanecer intacto sin lógica de fondos', () => {
			const heroContent = fs.readFileSync(heroPath, 'utf-8');
			expect(heroContent).not.toContain('repuestos_fondo_busqueda');
			expect(heroContent).not.toContain('menu_principal');
		});
	});
});
