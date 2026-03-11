import type { Metadata } from 'next';
import PricingPageClient from './PricingPageClient';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Tarifs Stockman',
  url: 'https://app.stockman.pro/pricing',
  description: 'Plans Starter et Pro sur mobile, Enterprise avec back-office web pour la gestion de votre activite.',
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://app.stockman.pro' },
      { '@type': 'ListItem', position: 2, name: 'Tarifs', item: 'https://app.stockman.pro/pricing' },
    ],
  },
};

export const metadata: Metadata = {
  title: 'Tarifs - Starter mobile, Pro mobile et Enterprise web + mobile',
  description:
    'Choisissez le bon parcours Stockman: Starter et Pro sur mobile, Enterprise avec back-office web et mobile terrain. Essai gratuit 3 mois.',
  alternates: { canonical: 'https://app.stockman.pro/pricing' },
  openGraph: {
    type: 'website',
    url: 'https://app.stockman.pro/pricing',
    title: 'Tarifs Stockman - Plans Starter, Pro & Enterprise',
    description: 'Starter et Pro sur mobile. Enterprise avec back-office web, analyses et multi-boutiques. Essai gratuit 3 mois.',
    images: [{ url: 'https://app.stockman.pro/og-image.png', width: 1200, height: 630 }],
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tarifs Stockman',
    description: 'Plans Starter, Pro et Enterprise. Starter/Pro sur mobile. Enterprise sur le web.',
    images: ['https://app.stockman.pro/og-image.png'],
  },
  keywords: [
    'tarif logiciel gestion stock', 'prix Stockman', 'abonnement gestion boutique',
    'logiciel commercant Afrique prix', 'Stockman Enterprise tarif', 'tarif supermarche', 'tarif restaurant',
  ],
};

export default function PricingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <PricingPageClient />
    </>
  );
}
