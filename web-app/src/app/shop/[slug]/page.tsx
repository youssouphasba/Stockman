import StorefrontClient from './StorefrontClient';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ShopPage({ params }: PageProps) {
  const { slug } = await params;
  return <StorefrontClient slug={slug} />;
}
