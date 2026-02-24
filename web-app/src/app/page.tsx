import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Stockman — Back-Office Enterprise | Connexion",
  description:
    "Connectez-vous à Stockman Enterprise : gérez stock, ventes, comptabilité et équipe depuis n'importe quel navigateur. Essai gratuit 3 mois.",
  alternates: { canonical: "https://app.stockmanapp.com" },
  openGraph: {
    type: "website",
    url: "https://app.stockmanapp.com",
    siteName: "Stockman",
    title: "Stockman — Back-Office Enterprise",
    description:
      "Le back-office professionnel pour commerçants : 12 modules puissants accessibles depuis le web. Dashboard, Caisse POS, CRM, Comptabilité P&L, Multi-boutiques.",
    images: [{ url: "https://app.stockmanapp.com/og-image.png", width: 1200, height: 630, alt: "Stockman Back-Office" }],
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stockman — Back-Office Enterprise",
    description: "Gérez votre commerce depuis le web : stock, caisse, comptabilité, CRM. Essai gratuit 3 mois.",
    images: ["https://app.stockmanapp.com/og-image.png"],
  },
  robots: { index: true, follow: true },
  keywords: [
    "gestion de stock", "logiciel caisse", "back-office commerçant",
    "comptabilité commerce", "CRM boutique", "Stockman Enterprise",
    "logiciel inventaire Afrique", "gestion boutique en ligne",
  ],
};

export default function Page() {
  return <HomeClient />;
}
