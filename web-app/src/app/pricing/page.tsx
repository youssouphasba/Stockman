import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle, Zap, Smartphone, Monitor, ArrowRight } from "lucide-react";

// TODO: Update prices when confirmed
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "TODO",           // e.g. "3 000"
    currency: "F CFA",
    period: "/ mois",
    color: "text-slate-300",
    border: "border-white/10",
    bg: "bg-white/5",
    cta: "Commencer gratuitement",
    highlight: false,
    description: "Pour les commerçants qui démarrent.",
    features: [
      { label: "Application mobile complète", ok: true },
      { label: "1 boutique", ok: true },
      { label: "1 utilisateur (fondateur)", ok: true },
      { label: "Gestion de stock & alertes", ok: true },
      { label: "IA — accès limité", ok: true },
      { label: "Application web back-office", ok: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "TODO",           // e.g. "7 500"
    currency: "F CFA",
    period: "/ mois",
    color: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    cta: "Commencer gratuitement",
    highlight: false,
    description: "Pour les commerces en croissance.",
    features: [
      { label: "Application mobile complète", ok: true },
      { label: "2 boutiques", ok: true },
      { label: "Jusqu'à 5 utilisateurs", ok: true },
      { label: "IA — accès illimité", ok: true },
      { label: "Notifications push stock bas", ok: true },
      { label: "Application web back-office", ok: false },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "TODO",           // e.g. "15 000"
    currency: "F CFA",
    period: "/ mois",
    color: "text-primary",
    border: "border-primary/40",
    bg: "bg-primary/5",
    cta: "Essai gratuit 3 mois",
    highlight: true,
    description: "Pour les commerçants qui veulent tout piloter depuis le web.",
    features: [
      { label: "Application mobile complète", ok: true },
      { label: "Boutiques illimitées", ok: true },
      { label: "Utilisateurs illimités", ok: true },
      { label: "IA — accès illimité", ok: true },
      { label: "Application web back-office", ok: true },
      { label: "Dashboard, POS, CRM, Comptabilité P&L", ok: true },
      { label: "Multi-boutiques & transferts de stock", ok: true },
      { label: "Gestion équipe & permissions", ok: true },
    ],
  },
];

const COMPARE = [
  { feature: "Application mobile complète", starter: true, pro: true, enterprise: true },
  { feature: "Boutiques", starter: "1", pro: "2", enterprise: "Illimité" },
  { feature: "Utilisateurs / staff", starter: "1", pro: "5", enterprise: "Illimité" },
  { feature: "IA (Assistant Stockman)", starter: "Limité", pro: "Illimité", enterprise: "Illimité" },
  { feature: "Application web back-office", starter: false, pro: false, enterprise: true },
  { feature: "Dashboard & reporting web", starter: false, pro: false, enterprise: true },
  { feature: "Caisse POS web multi-terminaux", starter: false, pro: false, enterprise: true },
  { feature: "Comptabilité P&L avancée", starter: false, pro: false, enterprise: true },
  { feature: "CRM avancé", starter: false, pro: false, enterprise: true },
  { feature: "Vue multi-boutiques consolidée", starter: false, pro: false, enterprise: true },
  { feature: "Gestion équipe & permissions", starter: false, pro: false, enterprise: true },
];

// TODO: Update prices in structured data when confirmed
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Tarifs Stockman",
  url: "https://app.stockmanapp.com/pricing",
  description: "Plans Starter, Pro et Enterprise pour la gestion de votre commerce.",
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://app.stockmanapp.com" },
      { "@type": "ListItem", position: 2, name: "Tarifs", item: "https://app.stockmanapp.com/pricing" },
    ],
  },
  // TODO: Add Offer structured data per plan when prices are confirmed
  // offers: [
  //   { "@type": "Offer", name: "Starter", price: "TODO", priceCurrency: "XOF", ... },
  //   ...
  // ]
};

export const metadata: Metadata = {
  title: "Tarifs — Plans Starter, Pro & Enterprise",
  description:
    "Choisissez le plan Stockman adapté à votre commerce. Essai gratuit 3 mois sur tous les plans. Application mobile + back-office web Enterprise.",
  alternates: { canonical: "https://app.stockmanapp.com/pricing" },
  openGraph: {
    type: "website",
    url: "https://app.stockmanapp.com/pricing",
    title: "Tarifs Stockman — Plans Starter, Pro & Enterprise",
    description: "Gestion de stock pour commerçants. Essai gratuit 3 mois. Plans adaptés à chaque taille de commerce.",
    images: [{ url: "https://app.stockmanapp.com/og-image.png", width: 1200, height: 630 }],
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tarifs Stockman",
    description: "Plans Starter, Pro et Enterprise. Essai gratuit 3 mois. Logiciel de gestion de stock pour commerçants.",
    images: ["https://app.stockmanapp.com/og-image.png"],
  },
  keywords: [
    "tarif logiciel gestion stock", "prix Stockman", "abonnement gestion boutique",
    "logiciel commerçant Afrique prix", "Stockman Enterprise tarif",
  ],
};

function Cell({ val }: { val: boolean | string }) {
  if (val === true) return <CheckCircle2 size={16} className="text-emerald-400 mx-auto" />;
  if (val === false) return <XCircle size={16} className="text-slate-700 mx-auto" />;
  return <span className="text-xs font-bold text-slate-300">{val}</span>;
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#0F172A] overflow-y-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      {/* Hero */}
      <section className="border-b border-white/5 bg-gradient-to-b from-primary/10 to-transparent">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Tarifs transparents</p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Un plan pour chaque<br />
            <span className="text-primary">taille de commerce</span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-base">
            Essai gratuit 3 mois sur tous les plans. Aucune carte bancaire requise.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-14 space-y-16">

        {/* Plans */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-label="Plans tarifaires">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-2xl border ${plan.border} ${plan.bg} p-6 flex flex-col gap-5 relative ${plan.highlight ? "ring-1 ring-primary/40" : ""}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-primary text-white text-[11px] font-black px-3 py-1 rounded-full">
                    <Zap size={11} /> Recommandé
                  </span>
                </div>
              )}
              <div>
                <h2 className={`text-lg font-black ${plan.color}`}>{plan.name}</h2>
                <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-black text-white">{plan.price}</span>
                {plan.price !== "TODO" && <span className="text-slate-400 text-sm">{plan.currency}</span>}
                <span className="text-slate-500 text-sm">{plan.period}</span>
              </div>
              <ul className="flex flex-col gap-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2">
                    {f.ok
                      ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      : <XCircle size={14} className="text-slate-700 shrink-0 mt-0.5" />
                    }
                    <span className={`text-xs leading-relaxed ${f.ok ? "text-slate-300" : "text-slate-600"}`}>{f.label}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/"
                className={`w-full py-3 rounded-xl text-sm font-bold text-center transition-all flex items-center justify-center gap-2 ${
                  plan.highlight
                    ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25"
                    : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                }`}
              >
                {plan.cta} {plan.highlight && <ArrowRight size={14} />}
              </Link>
            </article>
          ))}
        </section>

        {/* Platforms note */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 flex items-start gap-4">
            <Smartphone size={22} className="text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Application mobile</h3>
              <p className="text-xs text-slate-400">Disponible iOS & Android. Incluse dans tous les plans. Fonctionne hors-ligne.</p>
            </div>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex items-start gap-4">
            <Monitor size={22} className="text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Back-office web (Enterprise)</h3>
              <p className="text-xs text-slate-400">12 modules accessibles depuis n'importe quel navigateur. Exclusif Enterprise.</p>
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-xl font-black text-white">Comparaison détaillée</h2>
          </div>
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="grid grid-cols-4 bg-white/5 border-b border-white/10">
              <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Fonctionnalité</div>
              <div className="p-4 text-center"><p className="text-sm font-black text-slate-400">Starter</p></div>
              <div className="p-4 text-center"><p className="text-sm font-black text-blue-400">Pro</p></div>
              <div className="p-4 text-center">
                <span className="inline-block bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full mb-1">Recommandé</span>
                <p className="text-sm font-black text-primary">Enterprise</p>
              </div>
            </div>
            {COMPARE.map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-4 border-b border-white/5 ${i % 2 !== 0 ? "bg-white/[0.02]" : ""}`}>
                <div className="p-3.5 text-xs text-slate-300 flex items-center">{row.feature}</div>
                <div className="p-3.5 flex items-center justify-center"><Cell val={row.starter} /></div>
                <div className="p-3.5 flex items-center justify-center"><Cell val={row.pro} /></div>
                <div className="p-3.5 flex items-center justify-center bg-primary/5"><Cell val={row.enterprise} /></div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
          <h2 className="text-2xl font-black text-white mb-2">Commencez gratuitement dès aujourd'hui</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            3 mois d'essai gratuit inclus. Accès à toutes les fonctionnalités. Aucun engagement.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-black rounded-xl transition-all shadow-xl shadow-primary/25 text-sm"
            >
              <Zap size={16} /> Créer mon compte
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold rounded-xl transition-all text-sm"
            >
              Voir les fonctionnalités <ArrowRight size={14} />
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}
