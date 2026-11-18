import { requestOrigin } from '../../../../storefront/server';
import { notFoundXml, shopSitemapResponse } from '../../../../storefront/sitemap';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    if (!/^[a-z0-9-]{2,80}$/.test(slug)) return notFoundXml();
    return shopSitemapResponse(`slug=${slug}`, `${await requestOrigin()}/shop/${slug}`);
}
