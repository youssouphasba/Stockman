import StorefrontClient from './StorefrontClient';

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function fetchPublicShop(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://stockman-production-149d.up.railway.app';
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/public/ecommerce/${slug}`, {
    next: { revalidate: 300 },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const payload = await fetchPublicShop(slug).catch(() => null);
  const site = payload?.site;
  const title = site?.hero_title || site?.name || 'Boutique Stockman';
  const description = site?.welcome_message || site?.delivery_info || 'Catalogue en ligne et commandes web.';
  const image = payload?.products?.find((product: any) => typeof product.image === 'string' && product.image.startsWith('http'))?.image;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ShopPage({ params }: PageProps) {
  const { slug } = await params;
  return <StorefrontClient slug={slug} />;
}
