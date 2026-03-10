import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle, Zap, Smartphone, Monitor, ArrowRight } from "lucide-react";
import { BUSINESS_TYPE_GROUPS, ENTERPRISE_SIGNUP_URL, MOBILE_APP_URL, PLAN_COMPARISON_ROWS, PLAN_MARKETING } from "@/data/marketing";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Tarifs Stockman",
  url: "https://app.stockman.pro/pricing",
  description: "Plans Starter et Pro sur mobile, Enterprise avec back-office web pour la gestion de votre activite.",
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://app.stockman.pro" },
      { "@type": "ListItem", position: 2, name: "Tarifs", item: "https://app.stockman.pro/pricing" },
    ],
  },
};

export const metadata: Metadata = {
  title: "Tarifs - Plans Starter, Pro & Enterprise",
  description:
    "Choisissez le plan Stockman adapte a votre activite. Starter et Pro sur mobile. Enterprise ajoute le back-office web. Essai gratuit 3 mois.",
  alternates: { canonical: "https://app.stockman.pro/pricing" },
  openGraph: {
    type: "website",
    url: "https://app.stockman.pro/pricing",
    title: "Tarifs Stockman - Plans Starter, Pro & Enterprise",
    description: "Starter et Pro sur mobile. Enterprise avec back-office web, analyses et multi-boutiques. Essai gratuit 3 mois.",
    images: [{ url: "https://app.stockman.pro/og-image.png", width: 1200, height: 630 }],
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tarifs Stockman",
    description: "Plans Starter, Pro et Enterprise. Starter/Pro sur mobile. Enterprise sur le web.",
    images: ["https://app.stockman.pro/og-image.png"],
  },
  keywords: [
    "tarif logiciel gestion stock", "prix Stockman", "abonnement gestion boutique",
    "logiciel commercant Afrique prix", "Stockman Enterprise tarif",
  ],
};

function Cell({ val }: { val: boolean | string }) {
  if (val === true) return <CheckCircle2 size={16} className="text-emerald-400 mx-auto" />;
  if (val === false) return <XCircle size={16} className="text-slate-700 mx-auto" />;
  return <span className="text-xs font-bold text-slate-300">{val}</span>;
}

function PlanCta({ href, kind, label }: { href: string; kind: "mobile" | "enterprise"; label: string }) {
  const className = `w-full py-3 rounded-xl text-sm font-bold text-center transition-all flex items-center justify-center gap-2 ${
    kind === "enterprise"
      ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25"
      : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
  }`;

  if (kind === "enterprise") {
    return (
      <Link href={href} className={className}>
        {label} <ArrowRight size={14} />
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {label} <ArrowRight size={14} />
    </a>
  );
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#0F172A] overflow-y-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <section className="border-b border-white/5 bg-gradient-to-b from-primary/10 to-transparent">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Tarifs transparents</p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Un plan pour chaque<br />
            <span className="text-primary">taille de commerce</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-base">
            Starter et Pro se gerent depuis l&apos;application mobile. Enterprise ajoute le back-office web complet. Essai gratuit 3 mois.
          </p>
          <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-bold text-primary">
            <Smartphone size={14} />
            <span>Starter / Pro = mobile</span>
            <span className="text-primary/40">|</span>
            <Monitor size={14} />
            <span>Enterprise = web + mobile</span>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-14 space-y-16">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BUSINESS_TYPE_GROUPS.map((group) => (
            <article key={group.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-2">{group.title}</p>
              <p className="text-sm text-slate-300 leading-6">{group.description}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {group.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-label="Plans tarifaires">
          {PLAN_MARKETING.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-2xl border p-6 flex flex-col gap-5 relative ${
                plan.highlight
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/40"
                  : plan.id === "pro"
                    ? "border-blue-500/30 bg-blue-500/5"
                    : "border-white/10 bg-white/5"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-primary text-white text-[11px] font-black px-3 py-1 rounded-full">
                    <Zap size={11} /> Recommande
                  </span>
                </div>
              )}
              <div>
                <h2 className={`text-lg font-black ${
                  plan.id === "enterprise" ? "text-primary" : plan.id === "pro" ? "text-blue-400" : "text-slate-300"
                }`}>{plan.name}</h2>
                <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
              </div>
              <div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-white">{plan.priceXOF}</span>
                  <span className="text-slate-500 text-sm">/ mois</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{plan.priceEUR} / mois</p>
              </div>
              <ul className="flex flex-col gap-2 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature.label} className="flex items-start gap-2">
                    {feature.ok
                      ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      : <XCircle size={14} className="text-slate-700 shrink-0 mt-0.5" />
                    }
                    <span className={`text-xs leading-relaxed ${feature.ok ? "text-slate-300" : "text-slate-600"}`}>{feature.label}</span>
                  </li>
                ))}
              </ul>
              <PlanCta href={plan.href} kind={plan.ctaKind} label={plan.ctaLabel} />
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 flex items-start gap-4">
            <Smartphone size={22} className="text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Application mobile</h3>
              <p className="text-xs text-slate-400">Starter et Pro demarrent ici. Disponible iOS & Android. Incluse dans tous les plans.</p>
            </div>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex items-start gap-4">
            <Monitor size={22} className="text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Back-office web (Enterprise)</h3>
              <p className="text-xs text-slate-400">Dashboard, POS, CRM, comptabilite, multi-boutiques et analyses avancees. Exclusif Enterprise.</p>
            </div>
          </div>
        </section>

        <section>
          <div className="text-center mb-8">
            <h2 className="text-xl font-black text-white">Comparaison detaillee</h2>
          </div>
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="grid grid-cols-4 bg-white/5 border-b border-white/10">
              <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Fonctionnalite</div>
              <div className="p-4 text-center"><p className="text-sm font-black text-slate-400">Starter</p></div>
              <div className="p-4 text-center"><p className="text-sm font-black text-blue-400">Pro</p></div>
              <div className="p-4 text-center">
                <span className="inline-block bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full mb-1">Recommande</span>
                <p className="text-sm font-black text-primary">Enterprise</p>
              </div>
            </div>
            {PLAN_COMPARISON_ROWS.map((row, index) => (
              <div key={row.feature} className={`grid grid-cols-4 border-b border-white/5 ${index % 2 !== 0 ? "bg-white/[0.02]" : ""}`}>
                <div className="p-3.5 text-xs text-slate-300 flex items-center">{row.feature}</div>
                <div className="p-3.5 flex items-center justify-center"><Cell val={row.starter} /></div>
                <div className="p-3.5 flex items-center justify-center"><Cell val={row.pro} /></div>
                <div className="p-3.5 flex items-center justify-center bg-primary/5"><Cell val={row.enterprise} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
          <h2 className="text-2xl font-black text-white mb-2">Commencez gratuitement des aujourd&apos;hui</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            Demarrez sur mobile avec Starter ou Pro, ou creez directement votre espace Enterprise sur le web.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={MOBILE_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold rounded-xl transition-all text-sm"
            >
              <Smartphone size={16} /> Ouvrir l&apos;app mobile
            </a>
            <Link
              href={ENTERPRISE_SIGNUP_URL}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-black rounded-xl transition-all shadow-xl shadow-primary/25 text-sm"
            >
              <Zap size={16} /> Creer mon compte Enterprise
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold rounded-xl transition-all text-sm"
            >
              Voir les fonctionnalites <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
