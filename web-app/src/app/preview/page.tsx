import type { Metadata } from 'next';
import PreviewClient from './PreviewClient';

// Aperçu privé d'une boutique : jamais indexé, sans métadonnées de partage du brouillon.
export const metadata: Metadata = {
  title: 'Aperçu privé de la boutique',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: 'no-referrer',
};

export default function PreviewPage() {
  return <PreviewClient />;
}
