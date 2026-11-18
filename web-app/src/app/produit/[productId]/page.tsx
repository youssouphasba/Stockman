import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductPageView from '../../../storefront/ProductPageView';
import { fetchProductByDomain, fetchShopByDomain, isCustomStorefrontHost, productMetadata, requestHost, requestOrigin, shopMetadata } from '../../../storefront/server';

// Page produit d'une boutique ouverte sur son propre domaine (www.ma-boutique.com/produit/<id>).
type PageProps = { params: Promise<{ productId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const host = await requestHost();
    if (!isCustomStorefrontHost(host)) return {};
    const { productId } = await params;
    const origin = await requestOrigin();
    const payload = await fetchProductByDomain(host, productId);
    if (payload) return productMetadata(payload, origin);
    return { ...shopMetadata(await fetchShopByDomain(host), origin), robots: { index: false, follow: true } };
}

export default async function DomainProductPage({ params }: PageProps) {
    const host = await requestHost();
    if (!isCustomStorefrontHost(host)) notFound();
    const { productId } = await params;
    const [payload, origin] = await Promise.all([fetchProductByDomain(host, productId), requestOrigin()]);
    const slug = payload?.site.slug ?? (await fetchShopByDomain(host))?.site?.slug;
    if (!slug) notFound();
    const modelId = payload?.site.model_id ?? (await fetchShopByDomain(host))?.site?.model_id;
    return <ProductPageView slug={slug} modelId={modelId} payload={payload} origin={origin} />;
}
