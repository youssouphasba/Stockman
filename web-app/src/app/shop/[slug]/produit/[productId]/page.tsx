import type { Metadata } from 'next';
import ProductPageView from '../../../../../storefront/ProductPageView';
import { fetchProductBySlug, fetchShopBySlug, productMetadata, requestOrigin, shopMetadata } from '../../../../../storefront/server';

type PageProps = { params: Promise<{ slug: string; productId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug, productId } = await params;
    const origin = await requestOrigin();
    const payload = await fetchProductBySlug(slug, productId);
    if (payload) return productMetadata(payload, origin);
    // Produit retiré ou épuisé : la vitrine s'affiche, mais cette adresse n'est pas référencée.
    return { ...shopMetadata(await fetchShopBySlug(slug), origin), robots: { index: false, follow: true } };
}

export default async function ShopProductPage({ params }: PageProps) {
    const { slug, productId } = await params;
    const [payload, origin] = await Promise.all([fetchProductBySlug(slug, productId), requestOrigin()]);
    const modelId = payload?.site.model_id ?? (await fetchShopBySlug(slug))?.site?.model_id;
    return <ProductPageView slug={slug} modelId={modelId} payload={payload} origin={origin} />;
}
