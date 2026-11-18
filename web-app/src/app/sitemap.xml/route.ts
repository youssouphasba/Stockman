import { isCustomStorefrontHost, requestHost, requestOrigin } from '../../storefront/server';
import { shopSitemapResponse, sitemapIndexResponse } from '../../storefront/sitemap';

// Domaine connecté : plan de sa boutique. app.stockman.pro : index des plans des boutiques.
export async function GET() {
    const [host, origin] = await Promise.all([requestHost(), requestOrigin()]);
    if (isCustomStorefrontHost(host)) return shopSitemapResponse(`domain=${encodeURIComponent(host)}`, origin);
    return sitemapIndexResponse(origin);
}
