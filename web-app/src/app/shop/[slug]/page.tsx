import type { Metadata } from 'next';
import StorefrontClient from './StorefrontClient';
import { fetchShopBySlug, requestOrigin, shopMetadata } from '../../../storefront/server';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return shopMetadata(await fetchShopBySlug(slug), await requestOrigin());
}

export default async function ShopPage({ params }: PageProps) {
  const { slug } = await params;
  const payload = await fetchShopBySlug(slug);
  return <StorefrontClient slug={slug} modelId={payload?.site?.model_id} />;
}
