// Plans du site des boutiques : un plan par boutique (vitrine et pages produit), et sur
// app.stockman.pro un index qui renvoie vers le plan de chaque boutique en ligne.
import { API_BASE_URL } from './server';

type SitemapPayload = { site: { slug: string; base_url: string }; products: { product_id: string; updated_at?: string | null }[] };

const XML_HEADERS = { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' };

function escapeXml(value: string) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function getJson<T>(path: string): Promise<T | null> {
    try {
        const response = await fetch(`${API_BASE_URL}${path}`, { next: { revalidate: 3600 } });
        return response.ok ? ((await response.json()) as T) : null;
    } catch {
        return null;
    }
}

function urlset(base: string, payload: SitemapPayload) {
    const root = base.replace(/\/$/, '');
    const entries = [`<url><loc>${escapeXml(root || '/')}</loc></url>`];
    for (const product of payload.products) {
        const lastmod = product.updated_at ? `<lastmod>${escapeXml(product.updated_at)}</lastmod>` : '';
        entries.push(`<url><loc>${escapeXml(`${root}/produit/${encodeURIComponent(product.product_id)}`)}</loc>${lastmod}</url>`);
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</urlset>`;
}

export function notFoundXml() {
    return new Response('Not found', { status: 404 });
}

// base : adresse de la vitrine telle que servie par cette requête (domaine connecté ou /shop/<boutique>).
export async function shopSitemapResponse(query: string, base: string) {
    const payload = await getJson<SitemapPayload>(`/api/public/ecommerce/_sitemap?${query}`);
    if (!payload) return notFoundXml();
    return new Response(urlset(base, payload), { headers: XML_HEADERS });
}

export async function sitemapIndexResponse(origin: string) {
    const payload = await getJson<{ sites: string[] }>('/api/public/ecommerce/_sitemap');
    const entries = (payload?.sites || []).map((slug) => `<sitemap><loc>${escapeXml(`${origin}/shop/${encodeURIComponent(slug)}/sitemap.xml`)}</loc></sitemap>`);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</sitemapindex>`, { headers: XML_HEADERS });
}
