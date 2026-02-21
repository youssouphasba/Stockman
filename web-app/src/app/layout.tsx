import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import OfflineBanner from "../components/OfflineBanner";
import ServiceWorkerRegistration from "../components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Stockman Dashboard",
  description: "Gestion de stock intelligente pour commerçants",
  manifest: "/manifest.json",
  themeColor: "#0F172A",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/icon.png" />
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
