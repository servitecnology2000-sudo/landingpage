import type { APIRoute } from 'astro';
import { supabase } from '../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async () => {
	// Query supabase for real-time indexing of products
	const { data: products } = await supabase
		.from('repuestos_productos')
		.select('slug, created_at')
		.order('created_at', { ascending: false });

	const baseUrl = 'https://servitecnology.com';

	// Static Pages: Only 100% canonical, non-redirecting final URLs
	const staticPages = [
		{ path: '', priority: '1.0', changefreq: 'daily' },
		{ path: '/nosotros', priority: '0.8', changefreq: 'weekly' },
		{ path: '/canal-de-youtube', priority: '0.9', changefreq: 'daily' },
		{ path: '/soporte', priority: '0.9', changefreq: 'daily' },
		{ path: '/gaming', priority: '0.9', changefreq: 'daily' },
		{ path: '/cctv', priority: '0.9', changefreq: 'daily' },
		{ path: '/repuestos', priority: '0.9', changefreq: 'daily' },
		{ path: '/impresoras', priority: '0.9', changefreq: 'daily' },
		{ path: '/redes', priority: '0.9', changefreq: 'daily' },
		{ path: '/desarrollo', priority: '0.9', changefreq: 'daily' },
		{ path: '/whagil', priority: '0.8', changefreq: 'weekly' },
		{ path: '/whalinkbot', priority: '0.8', changefreq: 'weekly' },
		{ path: '/inframanagerpro', priority: '0.8', changefreq: 'weekly' },
		{ path: '/garantias', priority: '0.3', changefreq: 'monthly' },
		{ path: '/privacidad', priority: '0.3', changefreq: 'monthly' },
		{ path: '/terminos', priority: '0.3', changefreq: 'monthly' },
	];

	const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
	<!-- Static Canonical Pages -->
	${staticPages.map(page => {
		const cleanPath = page.path.toLowerCase().replace(/\/+$/, '');
		return `
	<url>
		<loc>${baseUrl}${cleanPath}</loc>
		<changefreq>${page.changefreq}</changefreq>
		<priority>${page.priority}</priority>
	</url>`;
	}).join('')}

	<!-- Dynamic Product Pages -->
	${(products || []).map(p => {
		const cleanSlug = encodeURIComponent((p.slug || '').toLowerCase().trim().replace(/\/+$/, ''));
		const date = p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
		return `
	<url>
		<loc>${baseUrl}/repuesto/${cleanSlug}</loc>
		<lastmod>${date}</lastmod>
		<changefreq>weekly</changefreq>
		<priority>0.8</priority>
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
