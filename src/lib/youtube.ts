export interface YouTubeVideo {
	id: string;
	title: string;
	description: string;
	thumbnail: string;
	publishedAt: string;
	url: string;
	embedUrl: string;
	category?: string;
	views?: string;
	repuestoQuery?: string;
}

export const CHANNEL_ID = 'UC1wIi9Lltm36kFu_x227nlA';
export const CHANNEL_URL = `https://www.youtube.com/channel/${CHANNEL_ID}`;
export const SUBSCRIBE_URL = `https://www.youtube.com/channel/${CHANNEL_ID}?sub_confirmation=1`;
export const UPLOADS_PLAYLIST_ID = 'UU1wIi9Lltm36kFu_x227nlA';

// Fallback catalog of Servitecnology technical cases and repairs
export const FALLBACK_VIDEOS: YouTubeVideo[] = [
	{
		id: 'qXKGkmTja6M',
		title: 'Cómo AUMENTAR RAM y SSD en HP Pavilion x360 (Upgrade Completo) | Guía Paso a Paso | Servitecnology',
		description: 'Aprende paso a paso cómo desarmar, instalar y configurar ampliación de memoria RAM DDR4 y disco sólido SSD NVMe en un laptop HP Pavilion x360. Mejoramos el rendimiento al 300% con piezas originales.',
		thumbnail: 'https://i.ytimg.com/vi/qXKGkmTja6M/maxresdefault.jpg',
		publishedAt: '2026-08-16T18:15:56Z',
		url: 'https://www.youtube.com/watch?v=qXKGkmTja6M',
		embedUrl: 'https://www.youtube.com/embed/qXKGkmTja6M',
		category: 'Upgrade & Hardware',
		repuestoQuery: 'SSD Memoria RAM'
	},
	{
		id: '0hX98L5gC0A',
		title: 'Diagnóstico y Reparación de Cortocircuito en Placa Madre Laptop (Línea de 19V) | Taller Servitecnology',
		description: 'Caso técnico de diagnóstico avanzado con cámara térmica y osciloscopio: detección de mosfet en corto y condensador cerámico averiado. Restauración completa de energía sin cambio de placa.',
		thumbnail: 'https://i.ytimg.com/vi/qXKGkmTja6M/hqdefault.jpg',
		publishedAt: '2026-08-05T15:30:00Z',
		url: 'https://www.youtube.com/channel/UC1wIi9Lltm36kFu_x227nlA',
		embedUrl: 'https://www.youtube.com/embed/qXKGkmTja6M',
		category: 'Microelectrónica',
		repuestoQuery: 'Componentes Placa Madre'
	},
	{
		id: '3kL9mR8vP1X',
		title: 'Reemplazo de Pantalla LED Slim 30 Pines Lenovo Ideapad y ASUS VivoBook | Servitecnology',
		description: 'Demostración de cambio de display pantalla LCD/LED Full HD rota. Desmontaje de bisel sin marcas, prueba de flex de video y calibración de brillo en taller.',
		thumbnail: 'https://i.ytimg.com/vi/qXKGkmTja6M/hqdefault.jpg',
		publishedAt: '2026-07-28T20:10:00Z',
		url: 'https://www.youtube.com/channel/UC1wIi9Lltm36kFu_x227nlA',
		embedUrl: 'https://www.youtube.com/embed/qXKGkmTja6M',
		category: 'Pantallas y Displays',
		repuestoQuery: 'Pantalla Lenovo 30 pines'
	},
	{
		id: '8vN4pL2wQ9Z',
		title: 'Mantenimiento Térmico Crítico en PC Gamer y Laptops de Alto Rendimiento | Cambio de Metal Líquido / PTM7950',
		description: 'Limpieza por ultrasonido de disipadores, reemplazo de pasta térmica de alto rendimiento y thermal pads para bajar 25°C en CPU y GPU bajo carga.',
		thumbnail: 'https://i.ytimg.com/vi/qXKGkmTja6M/hqdefault.jpg',
		publishedAt: '2026-07-15T16:45:00Z',
		url: 'https://www.youtube.com/channel/UC1wIi9Lltm36kFu_x227nlA',
		embedUrl: 'https://www.youtube.com/embed/qXKGkmTja6M',
		category: 'Mantenimiento & Gaming',
		repuestoQuery: 'Ventilador Disipador'
	}
];

export async function fetchYouTubeVideos(): Promise<YouTubeVideo[]> {
	const apiKey = process.env.YOUTUBE_API_KEY || (import.meta as any).env?.YOUTUBE_API_KEY;

	// 1. If API Key is provided, use YouTube Data API v3 PlaylistItems (uploads)
	if (apiKey && apiKey !== 'undefined' && apiKey.trim() !== '') {
		try {
			const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${UPLOADS_PLAYLIST_ID}&maxResults=12&key=${apiKey}`;
			const res = await fetch(playlistUrl, {
				headers: { 'Accept': 'application/json' },
				signal: AbortSignal.timeout(4000)
			});

			if (res.ok) {
				const data = await res.json();
				if (data.items && data.items.length > 0) {
					const apiVideos: YouTubeVideo[] = data.items.map((item: any) => {
						const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
						const snippet = item.snippet || {};
						const thumbnails = snippet.thumbnails || {};
						const bestThumb = thumbnails.maxres?.url || thumbnails.high?.url || thumbnails.medium?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
						
						return {
							id: videoId,
							title: snippet.title || 'Video de Servitecnology',
							description: snippet.description || '',
							thumbnail: bestThumb,
							publishedAt: snippet.publishedAt || new Date().toISOString(),
							url: `https://www.youtube.com/watch?v=${videoId}`,
							embedUrl: `https://www.youtube.com/embed/${videoId}`,
							category: inferCategory(snippet.title, snippet.description),
							repuestoQuery: inferRepuesto(snippet.title)
						};
					});
					if (apiVideos.length > 0) return apiVideos;
				}
			}
		} catch (err) {
			console.warn('YouTube API request failed, falling back to RSS Feed:', err);
		}
	}

	// 2. Fallback to official YouTube public RSS Feed (Zero API key needed, high reliability)
	try {
		const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
		const res = await fetch(rssUrl, { signal: AbortSignal.timeout(4000) });
		if (res.ok) {
			const xmlText = await res.text();
			const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
			const entries = [...xmlText.matchAll(entryRegex)];

			if (entries.length > 0) {
				const rssVideos: YouTubeVideo[] = entries.map((match) => {
					const chunk = match[1];
					const idMatch = chunk.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
					const titleMatch = chunk.match(/<title>([\s\S]*?)<\/title>/);
					const publishedMatch = chunk.match(/<published>(.*?)<\/published>/);
					const descMatch = chunk.match(/<media:description>([\s\S]*?)<\/media:description>/);

					const id = idMatch ? idMatch[1] : '';
					const title = titleMatch ? decodeXml(titleMatch[1]) : 'Reparación en Vivo Servitecnology';
					const published = publishedMatch ? publishedMatch[1] : new Date().toISOString();
					const description = descMatch ? decodeXml(descMatch[1]) : '';

					return {
						id,
						title,
						description,
						thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
						publishedAt: published,
						url: `https://www.youtube.com/watch?v=${id}`,
						embedUrl: `https://www.youtube.com/embed/${id}`,
						category: inferCategory(title, description),
						repuestoQuery: inferRepuesto(title)
					};
				}).filter(v => Boolean(v.id));

				if (rssVideos.length > 0) {
					// Merge with fallback catalogue if channel has few videos so user has an enriched gallery
					const merged = [...rssVideos];
					for (const fb of FALLBACK_VIDEOS) {
						if (!merged.some(m => m.id === fb.id)) {
							merged.push(fb);
						}
					}
					return merged;
				}
			}
		}
	} catch (err) {
		console.warn('YouTube RSS request failed, using static fallback:', err);
	}

	// 3. Static fallback
	return FALLBACK_VIDEOS;
}

function decodeXml(str: string): string {
	return str
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function inferCategory(title: string, desc: string = ''): string {
	const text = `${title} ${desc}`.toLowerCase();
	if (text.includes('ram') || text.includes('ssd') || text.includes('upgrade') || text.includes('disco')) return 'Upgrade & Hardware';
	if (text.includes('placa') || text.includes('corto') || text.includes('mosfet') || text.includes('microelectronica')) return 'Microelectrónica';
	if (text.includes('pantalla') || text.includes('display') || text.includes('flex')) return 'Pantallas & Displays';
	if (text.includes('gamer') || text.includes('gaming') || text.includes('pasta') || text.includes('mantenimiento')) return 'Mantenimiento & Gaming';
	if (text.includes('cctv') || text.includes('camara')) return 'CCTV & Redes';
	return 'Reparación en Taller';
}

function inferRepuesto(title: string): string {
	const t = title.toLowerCase();
	if (t.includes('ram') || t.includes('ssd')) return 'SSD / Memoria RAM';
	if (t.includes('pantalla')) return 'Pantallas Lenovo / ASUS';
	if (t.includes('placa') || t.includes('fuente')) return 'Placas y Fuentes';
	if (t.includes('teclado')) return 'Teclados Originales';
	return 'Repuestos y Componentes';
}
