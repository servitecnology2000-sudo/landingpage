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

	const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
	<!-- Static Pages -->
	<url>
		<loc>${baseUrl}/</loc>
		<changefreq>daily</changefreq>
		<priority>1.0</priority>
	</url>
	<url>
		<loc>${baseUrl}/terminos</loc>
		<changefreq>monthly</changefreq>
		<priority>0.3</priority>
	</url>
	<url>
		<loc>${baseUrl}/privacidad</loc>
		<changefreq>monthly</changefreq>
		<priority>0.3</priority>
	</url>
	<url>
		<loc>${baseUrl}/garantias</loc>
		<changefreq>monthly</changefreq>
		<priority>0.3</priority>
	</url>

	<!-- Dynamic Product Pages -->
	${(products || []).map(p => {
		const date = p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
		return `
	<url>
		<loc>${baseUrl}/repuesto/${p.slug}</loc>
		<lastmod>${date}</lastmod>
		<changefreq>weekly</changefreq>
		<priority>0.8</priority>
	</url>`;
	}).join('')}
</urlset>`;

	return new Response(sitemapXml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600, s-maxage=86400'
		}
	});
};
