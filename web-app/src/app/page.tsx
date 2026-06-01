import type { Metadata } from "next";
import { headers } from "next/headers";
import HomeClient from "./HomeClient";
import StorefrontClient from "./shop/[slug]/StorefrontClient";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "https://stockman-production-149d.up.railway.app").replace(/\/$/, "");
const PRIMARY_WEB_HOSTS = new Set(["app.stockman.pro", "stockman.pro", "www.stockman.pro", "localhost", "127.0.0.1"]);

function normalizeHost(value: string | null | undefined) {
  return (value || "").split(",")[0].trim().split(":")[0].trim().toLowerCase().replace(/\.$/, "");
}

function isCustomStorefrontHost(host: string) {
  return !!host && !PRIMARY_WEB_HOSTS.has(host) && !host.endsWith(".vercel.app");
}

async function fetchPublicShopByDomain(host: string) {
  const response = await fetch(`${API_BASE_URL}/api/public/ecommerce/by-domain?domain=${encodeURIComponent(host)}`, {
    next: { revalidate: 300 },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const host = normalizeHost(headerStore.get("x-forwarded-host") || headerStore.get("host"));
  if (isCustomStorefrontHost(host)) {
    const payload = await fetchPublicShopByDomain(host).catch(() => null);
    const site = payload?.site;
    if (site?.slug) {
      const title = site.hero_title || site.name || "Boutique Stockman";
      const description = site.welcome_message || site.delivery_info || "Catalogue en ligne et commandes web.";
      const image = payload?.products?.find((product: any) => typeof product.image === "string" && product.image.startsWith("http"))?.image;
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          type: "website",
          images: image ? [{ url: image }] : undefined,
        },
        twitter: {
          card: image ? "summary_large_image" : "summary",
          title,
          description,
          images: image ? [image] : undefined,
        },
      };
    }
  }
  return metadata;
}

const metadata: Metadata = {
  title: "Stockman Enterprise - application web de gestion | Connexion",
  description:
    "Application web Stockman pour piloter stock, ventes, CRM, comptabilite, equipe et multi-boutiques. Starter et Pro consultent le web, Enterprise ajoute les actions completes.",
  alternates: { canonical: "https://app.stockman.pro" },
  openGraph: {
    type: "website",
    url: "https://app.stockman.pro",
    siteName: "Stockman",
    title: "Stockman - Back-Office Enterprise",
    description:
      "Starter et Pro consultent le web et pilotent surtout sur mobile. Enterprise ajoute le back-office web complet pour business, restauration et activites de production.",
    images: [{ url: "https://app.stockman.pro/og-image.png", width: 1200, height: 630, alt: "Stockman Back-Office" }],
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stockman - Back-Office Enterprise",
    description: "Starter et Pro consultent le web. Enterprise ajoute les actions web completes, le CRM, la comptabilite et le multi-boutiques.",
    images: ["https://app.stockman.pro/og-image.png"],
  },
  robots: { index: true, follow: true },
  keywords: [
    "gestion de stock", "logiciel caisse", "back-office business",
    "comptabilite business", "CRM boutique", "Stockman Enterprise",
    "logiciel inventaire Afrique", "gestion boutique en ligne", "application web gestion business",
    "logiciel supermarche", "logiciel restaurant",
  ],
};

export default async function Page() {
  const headerStore = await headers();
  const host = normalizeHost(headerStore.get("x-forwarded-host") || headerStore.get("host"));
  if (isCustomStorefrontHost(host)) {
    const payload = await fetchPublicShopByDomain(host).catch(() => null);
    const slug = payload?.site?.slug;
    if (slug) {
      return <StorefrontClient slug={slug} />;
    }
  }
  return <HomeClient />;
}
