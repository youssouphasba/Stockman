import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions Générales d\'Utilisation',
  description: 'Conditions Générales d\'Utilisation de Stockman.',
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
