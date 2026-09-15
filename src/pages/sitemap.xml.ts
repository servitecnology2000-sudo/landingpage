import type { APIRoute } from 'astro';
import { supabase } from '../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async () => {
	// Query supabase for real-time indexing of products with images and metadata
	const { data: products } = await supabase
		.from('repuestos_productos')
		.select('slug, titulo, sku, imagenes, created_at, updated_at')
		.order('created_at', { ascending: false });

	const baseUrl = 'https://servitecnology.com';
	const today = new Date().toISOString().split('T')[0];

	// Static Pages: Only 100% canonical, non-redirecting final URLs
	const staticPages = [
		{ path: '/', priority: '1.0', changefreq: 'daily' },
		{ path: '/repuestos', priority: '1.0', changefreq: 'daily' },
		{ path: '/soporte', priority: '0.9', changefreq: 'daily' },
		{ path: '/gaming', priority: '0.9', changefreq: 'daily' },
		{ path: '/cctv', priority: '0.9', changefreq: 'daily' },
		{ path: '/impresoras', priority: '0.9', changefreq: 'daily' },
		{ path: '/redes', priority: '0.9', changefreq: 'daily' },
		{ path: '/desarrollo', priority: '0.9', changefreq: 'daily' },
		{ path: '/canal-de-youtube', priority: '0.9', changefreq: 'daily' },
		{ path: '/nosotros', priority: '0.8', changefreq: 'weekly' },
		{ path: '/whagil', priority: '0.8', changefreq: 'weekly' },
		{ path: '/whalinkbot', priority: '0.8', changefreq: 'weekly' },
		{ path: '/inframanagerpro', priority: '0.8', changefreq: 'weekly' },
		{ path: '/garantias', priority: '0.4', changefreq: 'monthly' },
		{ path: '/privacidad', priority: '0.4', changefreq: 'monthly' },
		{ path: '/terminos', priority: '0.4', changefreq: 'monthly' },
	];

	const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
	<!-- Static Canonical Pages -->
	${staticPages.map(page => {
		const loc = page.path === '/' ? `${baseUrl}/` : `${baseUrl}${page.path}`;
		return `
	<url>
		<loc>${loc}</loc>
		<lastmod>${today}</lastmod>
		<changefreq>${page.changefreq}</changefreq>
		<priority>${page.priority}</priority>
	</url>`;
	}).join('')}

	<!-- Dynamic Product Pages with Google Image metadata for SKU indexing -->
	${(products || []).map(p => {
		const cleanSlug = encodeURIComponent((p.slug || '').toLowerCase().trim().replace(/\/+$/, ''));
		const rawDate = p.updated_at || p.created_at;
		const date = rawDate ? new Date(rawDate).toISOString().split('T')[0] : today;
		const img = (p.imagenes && p.imagenes.length > 0) ? p.imagenes[0] : null;
		return `
	<url>
		<loc>${baseUrl}/repuesto/${cleanSlug}</loc>
		<lastmod>${date}</lastmod>
		<changefreq>weekly</changefreq>
		<priority>0.8</priority>${img ? `
		<image:image>
			<image:loc>${img}</image:loc>
			<image:title><![CDATA[${p.titulo || ''} - SKU: ${p.sku || ''}]]></image:title>
		</image:image>` : ''}
	</url>`;
	}).join('')}
</urlset>`;

	return new Response(sitemapXml.trim(), {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600, s-maxage=86400'
		}
	});
};
