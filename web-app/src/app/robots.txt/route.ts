import { requestOrigin } from '../../storefront/server';

// Les aperçus privés et les redirections de paiement ne sont jamais référencés.
export async function GET() {
    const origin = await requestOrigin();
    const body = ['User-agent: *', 'Allow: /', 'Disallow: /preview', 'Disallow: /pay', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n');
    return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=86400' } });
}
