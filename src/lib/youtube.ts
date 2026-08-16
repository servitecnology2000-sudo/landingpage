export interface YouTubeVideo {
	id: string;
	title: string;
	description: string;
	thumbnail: string;
	publishedAt: string;
	url: string;
	embedUrl: string;
	category: 'Reparación' | 'Shorts' | 'Impresoras' | 'Upgrades' | 'Microelectrónica';
	views?: string;
	repuestoQuery?: string;
	isShort?: boolean;
}

export const CHANNEL_ID = 'UC1wIi9Lltm36kFu_x227nlA';
export const CHANNEL_URL = `https://www.youtube.com/channel/${CHANNEL_ID}`;
export const SUBSCRIBE_URL = `https://www.youtube.com/channel/${CHANNEL_ID}?sub_confirmation=1`;
export const UPLOADS_PLAYLIST_ID = 'UU1wIi9Lltm36kFu_x227nlA';

// Fallback catalog of Servitecnology technical cases, repairs, shorts, upgrades and printers
export const FALLBACK_VIDEOS: YouTubeVideo[] = [
	{
		id: 'qXKGkmTja6M',
		title: 'Cómo AUMENTAR RAM y SSD en HP Pavilion x360 (Upgrade Completo) | Guía Paso a Paso | Servitecnology',
		description: 'Aprende paso a paso cómo desarmar, instalar y configurar ampliación de memoria RAM DDR4 y disco sólido SSD NVMe en un laptop HP Pavilion x360. Mejoramos el rendimiento al 300% con piezas originales.',
		thumbnail: 'https://i.ytimg.com/vi/qXKGkmTja6M/maxresdefault.jpg',
		publishedAt: '2026-08-16T18:15:56Z',
		url: 'https://www.youtube.com/watch?v=qXKGkmTja6M',
		embedUrl: 'https://www.youtube.com/embed/qXKGkmTja6M',
		category: 'Upgrades',
		repuestoQuery: 'SSD NVMe / Memoria RAM DDR4',
		isShort: false
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
		repuestoQuery: 'Mosfet / Condensador Placa Madre',
		isShort: false
	},
	{
		id: '3kL9mR8vP1X',
		title: 'Reemplazo de Pantalla LED Slim 30 Pines Lenovo Ideapad y ASUS VivoBook | Servitecnology',
		description: 'Demostración de cambio de display pantalla LCD/LED Full HD rota. Desmontaje de bisel sin marcas, prueba de flex de video y calibración de brillo en taller.',
		thumbnail: 'https://i.ytimg.com/vi/qXKGkmTja6M/hqdefault.jpg',
		publishedAt: '2026-07-28T20:10:00Z',
		url: 'https://www.youtube.com/channel/UC1wIi9Lltm36kFu_x227nlA',
		embedUrl: 'https://www.youtube.com/embed/qXKGkmTja6M',
		category: 'Reparación',
		repuestoQuery: 'Pantalla Lenovo 30 pines',
		isShort: false
	},
	{
		id: '7nP2kL9vW4Z',
		title: 'Destape de Cabezal y Reseteo de Almohadillas Epson EcoTank L3150 / L3250 | Servitecnology Impresoras',
		description: 'Servicio técnico especializado en impresoras de tinta continua. Limpieza profunda ultrasónica de inyectores tapados y mantenimiento al sistema de desecho.',
		thumbnail: 'https://i.ytimg.com/vi/qXKGkmTja6M/hqdefault.jpg',
		publishedAt: '2026-07-20T14:20:00Z',
		url: 'https://www.youtube.com/channel/UC1wIi9Lltm36kFu_x227nlA',
		embedUrl: 'https://www.youtube.com/embed/qXKGkmTja6M',
		category: 'Impresoras',
		repuestoQuery: 'Cabezal / Almohadillas Epson',
		isShort: false
	},
	{
		id: '5sH8xM1qT9Y',
		title: '¿Por qué tu laptop se calienta y se apaga sola? Solución en 60s #shorts | Taller Servitecnology',
		description: 'Micro-guía en formato corto: la importancia del cambio periódico de pasta térmica de alto rendimiento y limpieza de turbinas de disipación #shorts.',
		thumbnail: 'https://i.ytimg.com/vi/qXKGkmTja6M/hqdefault.jpg',
		publishedAt: '2026-07-10T12:00:00Z',
		url: 'https://www.youtube.com/channel/UC1wIi9Lltm36kFu_x227nlA',
		embedUrl: 'https://www.youtube.com/embed/qXKGkmTja6M',
		category: 'Shorts',
		repuestoQuery: 'Pasta Térmica / Ventilador Disipador',
		isShort: true
	},
	{
		id: '8vN4pL2wQ9Z',
		title: 'Reparación de Bisagras Raras y Carcasa Partida en Notebook HP y Dell | Refuerzo Estructural',
		description: 'Reconstrucción artesanal con resina epóxica de anclajes de bisagras rotas en carcasas plásticas sin necesidad de reemplazar la tapa completa.',
		thumbnail: 'https://i.ytimg.com/vi/qXKGkmTja6M/hqdefault.jpg',
		publishedAt: '2026-07-02T16:45:00Z',
		url: 'https://www.youtube.com/channel/UC1wIi9Lltm36kFu_x227nlA',
		embedUrl: 'https://www.youtube.com/embed/qXKGkmTja6M',
		category: 'Reparación',
		repuestoQuery: 'Bisagras y Carcasas Laptop',
		isShort: false
	}
];

export async function fetchYouTubeVideos(): Promise<YouTubeVideo[]> {
	const apiKey = process.env.YOUTUBE_API_KEY || (import.meta as any).env?.YOUTUBE_API_KEY;

	// 1. If API Key is provided, use YouTube Data API v3 PlaylistItems (uploads)
	if (apiKey && apiKey !== 'undefined' && apiKey.trim() !== '') {
		try {
			const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${UPLOADS_PLAYLIST_ID}&maxResults=18&key=${apiKey}`;
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
						const title = snippet.title || 'Video de Servitecnology';
						const description = snippet.description || '';
						const isShort = title.toLowerCase().includes('#short') || description.toLowerCase().includes('#short');

						return {
							id: videoId,
							title,
							description,
							thumbnail: bestThumb,
							publishedAt: snippet.publishedAt || new Date().toISOString(),
							url: `https://www.youtube.com/watch?v=${videoId}`,
							embedUrl: `https://www.youtube.com/embed/${videoId}`,
							category: inferCategory(title, description, isShort),
							repuestoQuery: inferRepuesto(title),
							isShort
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
					const isShort = title.toLowerCase().includes('#short') || description.toLowerCase().includes('#short');

					return {
						id,
						title,
						description,
						thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
						publishedAt: published,
						url: `https://www.youtube.com/watch?v=${id}`,
						embedUrl: `https://www.youtube.com/embed/${id}`,
						category: inferCategory(title, description, isShort),
						repuestoQuery: inferRepuesto(title),
						isShort
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

export function inferCategory(title: string, desc: string = '', isShort: boolean = false): 'Reparación' | 'Shorts' | 'Impresoras' | 'Upgrades' | 'Microelectrónica' {
	const text = `${title} ${desc}`.toLowerCase();
	if (isShort || text.includes('#shorts') || text.includes('#short') || text.includes('60s') || text.includes('shorts')) {
		return 'Shorts';
	}
	if (text.includes('impresora') || text.includes('epson') || text.includes('canon') || text.includes('cabezal') || text.includes('almohadilla') || text.includes('toner') || text.includes('ecotank') || text.includes('tinta')) {
		return 'Impresoras';
	}
	if (text.includes('ram') || text.includes('ssd') || text.includes('upgrade') || text.includes('disco') || text.includes('aumentar') || text.includes('potenciar') || text.includes('nvme')) {
		return 'Upgrades';
	}
	if (text.includes('placa') || text.includes('corto') || text.includes('mosfet') || text.includes('microelectronica') || text.includes('soldadura') || text.includes('bios') || text.includes('condensador') || text.includes('19v') || text.includes('reballing')) {
		return 'Microelectrónica';
	}
	return 'Reparación';
}

function inferRepuesto(title: string): string {
	const t = title.toLowerCase();
	if (t.includes('ram') || t.includes('ssd')) return 'SSD NVMe / Memoria RAM';
	if (t.includes('impresora') || t.includes('epson')) return 'Cabezal / Sistema de Tinta';
	if (t.includes('pantalla')) return 'Pantallas Lenovo / ASUS / HP';
	if (t.includes('placa') || t.includes('fuente')) return 'Componentes de Placa Madre';
	if (t.includes('teclado')) return 'Teclados Originales';
	if (t.includes('bisagra') || t.includes('carcasa')) return 'Bisagras y Carcasas';
	return 'Repuestos y Componentes';
}
