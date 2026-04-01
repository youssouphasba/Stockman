import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité',
  description: 'Politique de Confidentialité de Stockman.',
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
