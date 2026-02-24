import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import OfflineBanner from "../components/OfflineBanner";
import ServiceWorkerRegistration from "../components/ServiceWorkerRegistration";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0F172A",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://app.stockmanapp.com"),
  title: {
    default: "Stockman — Back-Office Enterprise",
    template: "%s | Stockman",
  },
  description: "Le back-office web pour commerçants : stock, caisse, comptabilité, CRM. Plan Enterprise — essai gratuit 3 mois.",
  manifest: "/manifest.json",
  icons: {
    apple: "/icon.png",
    icon: "/icon.png",
  },
  openGraph: {
    siteName: "Stockman",
    locale: "fr_FR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Stockman",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  url: "https://app.stockmanapp.com",
  description:
    "Logiciel de gestion de stock et back-office professionnel pour commerçants. Dashboard, Caisse POS, Comptabilité P&L, CRM, Multi-boutiques.",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "XOF",
    lowPrice: "0",
    offerCount: "3",
  },
  inLanguage: ["fr", "en", "ar"],
  author: { "@type": "Organization", name: "Stockman", url: "https://stockmanapp.com" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="antialiased">
        <Providers>
          <ServiceWorkerRegistration />
          <OfflineBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
