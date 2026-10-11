import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Aislamiento Crítico SDD: Portada (/) vs Tienda de Repuestos (/repuestos)', () => {
	const rootDir = process.cwd();

	// ─── 1. Verificación de Integridad de la Portada (/) ───────────────────────
	describe('1. Portada (/) y Hero original intactos', () => {
		const indexPath = path.join(rootDir, 'src', 'pages', 'index.astro');
		const heroPath = path.join(rootDir, 'src', 'components', 'Hero.astro');

		it('src/pages/index.astro debe existir y NO importar RepuestosBannersCarousel', () => {
			expect(fs.existsSync(indexPath)).toBe(true);
			const indexContent = fs.readFileSync(indexPath, 'utf-8');
			expect(indexContent).not.toContain('RepuestosBannersCarousel');
			expect(indexContent).not.toContain('hero_banners');
			expect(indexContent).toContain('import Hero from');
		});

		it('src/components/Hero.astro NO debe consultar hero_banners ni modificar el Hero compartido', () => {
			expect(fs.existsSync(heroPath)).toBe(true);
			const heroContent = fs.readFileSync(heroPath, 'utf-8');
			expect(heroContent).not.toContain('hero_banners');
			expect(heroContent).not.toContain('supabaseAdmin');
			expect(heroContent).not.toContain('RepuestosBannersCarousel');
		});
	});

	// ─── 2. Verificación del Carrusel Exclusivo en /repuestos ──────────────────
	describe('2. Página /repuestos y RepuestosBannersCarousel.astro', () => {
		const repuestosPath = path.join(rootDir, 'src', 'pages', 'repuestos.astro');
		const carouselPath = path.join(rootDir, 'src', 'components', 'RepuestosBannersCarousel.astro');

		it('src/pages/repuestos.astro debe importar y renderizar RepuestosBannersCarousel', () => {
			expect(fs.existsSync(repuestosPath)).toBe(true);
			const repuestosContent = fs.readFileSync(repuestosPath, 'utf-8');
			expect(repuestosContent).toContain('import RepuestosBannersCarousel from');
			expect(repuestosContent).toContain('<RepuestosBannersCarousel />');
		});

		it('src/components/RepuestosBannersCarousel.astro debe existir y consultar estrictamente seccion = "repuestos"', () => {
			expect(fs.existsSync(carouselPath)).toBe(true);
			const carouselContent = fs.readFileSync(carouselPath, 'utf-8');
			// Filtro estricto por seccion 'repuestos' y activo
			expect(carouselContent).toContain(".from('hero_banners')");
			expect(carouselContent).toContain(".eq('seccion', 'repuestos')");
			expect(carouselContent).toContain(".eq('activo', true)");
		});

		it('src/components/RepuestosBannersCarousel.astro debe contener el copy comercial de soporte e instalación', () => {
			const carouselContent = fs.readFileSync(carouselPath, 'utf-8');
			expect(carouselContent).toContain('No tienes que hacerlo solo');
			expect(carouselContent).toContain('Cotiza tu servicio');
			expect(carouselContent).toContain('#catalogo');
		});
	});

	// ─── 3. Verificación de Endpoints Administrativos y Aislamiento ───────────
	describe('3. Endpoints de Banners (/api/admin/banners/*)', () => {
		const uploadPath = path.join(rootDir, 'src', 'pages', 'api', 'admin', 'banners', 'upload.ts');
		const updatePath = path.join(rootDir, 'src', 'pages', 'api', 'admin', 'banners', 'update.ts');
		const deletePath = path.join(rootDir, 'src', 'pages', 'api', 'admin', 'banners', 'delete.ts');

		it('upload.ts debe asignar por defecto y soportar seccion = "repuestos"', () => {
			expect(fs.existsSync(uploadPath)).toBe(true);
			const uploadContent = fs.readFileSync(uploadPath, 'utf-8');
			expect(uploadContent).toContain("seccion = formData.get('seccion')?.toString()?.trim() || 'repuestos'");
			expect(uploadContent).toContain('seccion');
		});

		it('update.ts debe permitir actualizar metadatos sin vincular la portada', () => {
			expect(fs.existsSync(updatePath)).toBe(true);
			const updateContent = fs.readFileSync(updatePath, 'utf-8');
			expect(updateContent).toContain("from('hero_banners')");
			expect(updateContent).toContain('.update(updateData)');
		});

		it('delete.ts debe permitir eliminar banners y sus imágenes de Storage', () => {
			expect(fs.existsSync(deletePath)).toBe(true);
			const deleteContent = fs.readFileSync(deletePath, 'utf-8');
			expect(deleteContent).toContain("from('hero_banners')");
			expect(deleteContent).toContain(".from('banners')");
			expect(deleteContent).toContain('.remove(');
		});
	});

	// ─── 4. Verificación de la Página Administrativa y Prevención de ResponseSentError
	describe('4. Administrador de Banners (/meson-servitecnology-st/banners.astro)', () => {
		const adminBannersPath = path.join(rootDir, 'src', 'pages', 'meson-servitecnology-st', 'banners.astro');

		it('debe existir la ruta /meson-servitecnology-st/banners.astro', () => {
			expect(fs.existsSync(adminBannersPath)).toBe(true);
		});

		it('debe contener la guardia de autenticación inmediata en la cabecera para prevenir ResponseSentError', () => {
			const content = fs.readFileSync(adminBannersPath, 'utf-8');
			// Verificamos que Astro.redirect aparezca en las primeras líneas antes de consultas a supabase
			const lines = content.split('\n');
			const redirectIndex = lines.findIndex(l => l.includes('Astro.redirect'));
			const queryIndex = lines.findIndex(l => l.includes('supabaseAdmin'));
			expect(redirectIndex).toBeGreaterThan(-1);
			expect(queryIndex).toBeGreaterThan(-1);
			expect(redirectIndex).toBeLessThan(queryIndex);
		});

		it('debe consultar exclusivamente seccion = "repuestos"', () => {
			const content = fs.readFileSync(adminBannersPath, 'utf-8');
			expect(content).toContain(".eq('seccion', 'repuestos')");
		});

		it('debe explicitar en la UI que la gestión es exclusiva para /repuestos y no afecta a /', () => {
			const content = fs.readFileSync(adminBannersPath, 'utf-8');
			expect(content).toContain('Estos banners no alteran la portada principal (/)');
			expect(content).toContain('Sección Exclusiva: /repuestos');
		});
	});

	// ─── 5. Verificación de Migración SQL ──────────────────────────────────────
	describe('5. Migración SQL (20261011_hero_banners.sql)', () => {
		const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20261011_hero_banners.sql');

		it('debe incluir la columna seccion con default "repuestos" e índice de búsqueda', () => {
			expect(fs.existsSync(migrationPath)).toBe(true);
			const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
			expect(sqlContent).toContain("seccion TEXT NOT NULL DEFAULT 'repuestos'");
			expect(sqlContent).toContain('idx_hero_banners_seccion');
		});
	});
});
