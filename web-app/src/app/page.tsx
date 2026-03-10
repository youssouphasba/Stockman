import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Stockman - Back-Office Enterprise | Connexion",
  description:
    "Starter et Pro sur mobile, Enterprise sur le web : stock, ventes, comptabilite, CRM et equipe. Essai gratuit 3 mois.",
  alternates: { canonical: "https://app.stockman.pro" },
  openGraph: {
    type: "website",
    url: "https://app.stockman.pro",
    siteName: "Stockman",
    title: "Stockman - Back-Office Enterprise",
    description:
      "Starter et Pro sur mobile. Enterprise ajoute le back-office web pour le commerce, la restauration et les activites de production.",
    images: [{ url: "https://app.stockman.pro/og-image.png", width: 1200, height: 630, alt: "Stockman Back-Office" }],
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stockman - Back-Office Enterprise",
    description: "Starter et Pro sur mobile. Enterprise ajoute le web, le CRM, la comptabilite et le multi-boutiques.",
    images: ["https://app.stockman.pro/og-image.png"],
  },
  robots: { index: true, follow: true },
  keywords: [
    "gestion de stock", "logiciel caisse", "back-office commercant",
    "comptabilite commerce", "CRM boutique", "Stockman Enterprise",
    "logiciel inventaire Afrique", "gestion boutique en ligne",
  ],
};

export default function Page() {
  return <HomeClient />;
}
