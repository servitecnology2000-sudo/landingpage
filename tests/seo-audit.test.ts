import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Auditoría y Certificación de SEO Técnico SERVITECNOLOGY', () => {
	const rootDir = process.cwd();

	it('robots.txt debe bloquear rutas administrativas/checkout y referenciar sitemap.xml', () => {
		const robotsPath = path.join(rootDir, 'public', 'robots.txt');
		expect(fs.existsSync(robotsPath)).toBe(true);
		const content = fs.readFileSync(robotsPath, 'utf-8');

		expect(content).toContain('Allow: /');
		expect(content).toContain('Disallow: /meson-servitecnology-st/');
		expect(content).toContain('Disallow: /checkout');
		expect(content).toContain('Disallow: /pedido/');
		expect(content).toContain('Disallow: /api/');
		expect(content).toContain('Sitemap: https://servitecnology.com/sitemap.xml');
	});

	it('llms.txt no debe contener la nota obsoleta de que no procesa pagos automáticos', () => {
		const llmsPath = path.join(rootDir, 'public', 'llms.txt');
		expect(fs.existsSync(llmsPath)).toBe(true);
		const content = fs.readFileSync(llmsPath, 'utf-8');

		expect(content).not.toContain('No procesa pagos automáticos');
		expect(content).toContain('SERVITECNOLOGY');
		expect(content).toContain('Mercado Pago');
		expect(content).toContain('/repuestos');
	});

	it('Layout.astro debe normalizar la raíz a https://servitecnology.com/ y no tener trailing slash en subpáginas', () => {
		const layoutPath = path.join(rootDir, 'src', 'layouts', 'Layout.astro');
		expect(fs.existsSync(layoutPath)).toBe(true);
		const content = fs.readFileSync(layoutPath, 'utf-8');

		expect(content).toContain("rawPath === '' ? 'https://servitecnology.com/' : `https://servitecnology.com${rawPath}`");
	});

	it('astro.config.mjs debe tener trailingSlash: "never" y redirecciones 301 oficiales', () => {
		const astroConfigPath = path.join(rootDir, 'astro.config.mjs');
		expect(fs.existsSync(astroConfigPath)).toBe(true);
		const content = fs.readFileSync(astroConfigPath, 'utf-8');

		expect(content).toContain("trailingSlash: 'never'");
		expect(content).toContain("destination: '/repuestos'");
		expect(content).toContain("destination: '/soporte'");
		expect(content).toContain("destination: '/desarrollo'");
		expect(content).toContain("destination: '/gaming'");
	});

	it('repuestos.astro debe consultar columnas reales de Supabase y estructurar ItemList', () => {
		const repuestosPath = path.join(rootDir, 'src', 'pages', 'repuestos.astro');
		expect(fs.existsSync(repuestosPath)).toBe(true);
		const content = fs.readFileSync(repuestosPath, 'utf-8');

		// Columnas válidas en base de datos
		expect(content).toContain('titulo');
		expect(content).toContain('precio_venta');
		expect(content).toContain('imagenes');
		expect(content).toContain('stock_cantidad');
		expect(content).toContain('sku');

		// No debe tener columnas erróneas antiguas
		expect(content).not.toContain(".select('id, slug, nombre, descripcion, precio, categoria, imagen_url, stock')");
		expect(content).toContain('"@type": "ItemList"');
	});

	it('repuesto/[slug].astro no debe hacer Soft 404 (Astro.redirect("/")) y debe enriquecer schema Product', () => {
		const slugPath = path.join(rootDir, 'src', 'pages', 'repuesto', '[slug].astro');
		expect(fs.existsSync(slugPath)).toBe(true);
		const content = fs.readFileSync(slugPath, 'utf-8');

		// Cero Soft 404
		expect(content).not.toContain("return Astro.redirect('/');");
		expect(content).toContain('Astro.response.status = 404;');
		expect(content).toContain('Repuesto No Encontrado');

		// Schema enriquecido
		expect(content).toContain('"@type": "Product"');
		expect(content).toContain('"brand":');
		expect(content).toContain('"mpn": product.sku');
	});

	it('404.astro debe existir y devolver status HTTP 404', () => {
		const notFoundPath = path.join(rootDir, 'src', 'pages', '404.astro');
		expect(fs.existsSync(notFoundPath)).toBe(true);
		const content = fs.readFileSync(notFoundPath, 'utf-8');

		expect(content).toContain('Astro.response.status = 404;');
	});

	it('index.astro y Hero.astro deben incluir explícitamente la marca SERVITECNOLOGY y FeaturedParts', () => {
		const indexPath = path.join(rootDir, 'src', 'pages', 'index.astro');
		const heroPath = path.join(rootDir, 'src', 'components', 'Hero.astro');
		const featuredPath = path.join(rootDir, 'src', 'components', 'FeaturedParts.astro');

		expect(fs.existsSync(indexPath)).toBe(true);
		expect(fs.existsSync(heroPath)).toBe(true);
		expect(fs.existsSync(featuredPath)).toBe(true);

		const indexContent = fs.readFileSync(indexPath, 'utf-8');
		const heroContent = fs.readFileSync(heroPath, 'utf-8');

		expect(indexContent).toContain('FeaturedParts');
		expect(indexContent).toContain('SERVITECNOLOGY');
		expect(heroContent).toContain('SERVITECNOLOGY');
		expect(heroContent).toContain('Servicio Técnico Especializado');
		expect(heroContent).toContain('Repuestos y Soluciones TI');
	});

	it('sitemap.xml.ts debe incluir espacio de nombres de Google Images y lastmod', () => {
		const sitemapPath = path.join(rootDir, 'src', 'pages', 'sitemap.xml.ts');
		expect(fs.existsSync(sitemapPath)).toBe(true);
		const content = fs.readFileSync(sitemapPath, 'utf-8');

		expect(content).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
		expect(content).toContain('<image:image>');
		expect(content).toContain('<lastmod>');
	});
});
