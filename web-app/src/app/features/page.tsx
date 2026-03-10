import type { Metadata } from "next";
import Link from "next/link";
import {
  LayoutDashboard, Package, ShoppingCart, LineChart, Users, Truck,
  Bell, Store, BarChart3, Settings2, ClipboardList, CheckCircle2,
  Zap, ArrowRight,
} from "lucide-react";
import { BUSINESS_TYPE_GROUPS, ENTERPRISE_SIGNUP_URL, PUBLIC_BUSINESS_TYPES_URL, PUBLIC_ENTERPRISE_URL } from "@/data/marketing";

export const metadata: Metadata = {
  title: "Fonctionnalites Enterprise - app web de gestion stock, POS, CRM et comptabilite",
  description:
    "Stockman Enterprise : 12 modules web pour supermarches, commerces, restaurants, boulangeries et activites de production.",
  alternates: { canonical: "https://app.stockman.pro/features" },
  openGraph: {
    type: "website",
    url: "https://app.stockman.pro/features",
    title: "Fonctionnalites Stockman Enterprise - Back-Office Web Professionnel",
    description:
      "12 modules pour piloter commerce, restauration et production depuis le web. Stock, CRM, compta et multi-boutiques.",
    images: [{ url: "https://app.stockman.pro/og-image.png", width: 1200, height: 630 }],
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fonctionnalites Stockman Enterprise",
    description: "12 modules pour gerer votre activite depuis le web. Essai gratuit 3 mois.",
    images: ["https://app.stockman.pro/og-image.png"],
  },
  keywords: [
    "back-office web commerce", "logiciel gestion boutique", "caisse enregistreuse web",
    "comptabilite commercant", "CRM fidelite", "multi-boutiques", "gestion stock Afrique",
    "Stockman fonctionnalites", "logiciel supermarche", "logiciel restaurant", "logiciel boulangerie",
  ],
};

const MODULES = [
  {
    icon: LayoutDashboard, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20",
    name: "Dashboard", tagline: "Pilotage en temps reel",
    features: ["KPIs instantanes : CA, ventes, marge nette", "Graphiques de revenus 7j / 30j / 90j", "Alertes stock bas et peremptions", "Resume IA quotidien de votre activite", "Comparaison automatique periode sur periode"],
  },
  {
    icon: Package, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20",
    name: "Inventaire", tagline: "Gestion de stock complete",
    features: ["Import en masse via CSV ou Excel", "Scan code-barres integre", "Filtres par emplacement, categorie, fournisseur", "Gestion des lots, numeros de serie et peremptions", "Analyse ABC (classification A/B/C)"],
  },
  {
    icon: ShoppingCart, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20",
    name: "Caisse (POS)", tagline: "Point de vente professionnel",
    features: ["Interface caisse rapide avec recherche produit", "Remises en % ou montant fixe", "Paiements partages : especes + mobile + carte", "Multi-terminaux : caisse 1, caisse 2...", "Retours sur vente avec avoir"],
  },
  {
    icon: LineChart, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20",
    name: "Comptabilite", tagline: "Finances & reporting avance",
    features: ["Compte de resultat P&L", "Gestion des depenses par categorie", "Valeur du stock au cout et a la vente", "Classement produits les plus rentables", "Export CSV des donnees financieres"],
  },
  {
    icon: Users, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20",
    name: "CRM Clients", tagline: "Fidelisation & marketing",
    features: ["Segmentation Bronze / Silver / Gold", "Banniere anniversaires clients", "Historique complet des achats", "Campagnes de fidelite et points", "Export liste clients CSV"],
  },
  {
    icon: ClipboardList, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20",
    name: "Commandes", tagline: "Reapprovisionnement intelligent",
    features: ["Bons de commande fournisseurs", "Suggestions de reapprovisionnement auto", "Suivi statut : brouillon vers recu", "Reception partielle avec mise a jour stock", "Historique PDF telechargeable"],
  },
  {
    icon: Truck, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20",
    name: "Fournisseurs", tagline: "Portail fournisseur dedie",
    features: ["Fiche fournisseur complete", "Portail web securise par fournisseur", "Catalogue et prix fournisseur", "Historique des echanges", "Integration directe commandes"],
  },
  {
    icon: Bell, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20",
    name: "Alertes", tagline: "Surveillance proactive",
    features: ["Alertes stock bas configurables", "Alertes peremption : 7j, 14j, 30j", "Journal des alertes complet", "Seuils personnalisables par article", "Notifications push mobile"],
  },
  {
    icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20",
    name: "Equipe", tagline: "Gestion du personnel & roles",
    features: ["6 modules de permission granulaires", "Templates : caissier, comptable, manager", "Delegation de gestion d'equipe", "Anti-escalade de privileges", "Audit log complet"],
  },
  {
    icon: Store, color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20",
    name: "Multi-Boutiques", tagline: "Vue consolidee & transferts",
    features: ["Dashboard consolide toutes boutiques", "Tableau comparatif des performances", "Transfert de stock entre boutiques", "Parametres individuels par boutique", "Boutiques illimitees"],
  },
  {
    icon: BarChart3, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20",
    name: "Historique & Analyse", tagline: "Tracabilite totale",
    features: ["Historique complet des mouvements de stock", "Analyse ABC", "Rapport de pertes et ajustements", "Filtres avances multi-criteres", "Export pour audit comptable"],
  },
  {
    icon: Settings2, color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20",
    name: "Parametres", tagline: "Personnalisation totale",
    features: ["Emplacements de stock personnalises", "Multi-terminaux par boutique", "Personnalisation des recus (logo, en-tete)", "Devise par boutique (XOF, EUR, USD...)", "Regles de rappel automatiques"],
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Fonctionnalites Stockman Enterprise",
  url: "https://app.stockman.pro/features",
  description: "12 modules professionnels pour gerer votre activite depuis le web.",
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://app.stockman.pro" },
      { "@type": "ListItem", position: 2, name: "Fonctionnalites", item: "https://app.stockman.pro/features" },
    ],
  },
};

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-[#0F172A] overflow-y-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <section className="border-b border-white/5 bg-gradient-to-b from-primary/10 to-transparent">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-bold px-4 py-2 rounded-full border border-primary/20 mb-6">
            <Zap size={13} /> Plan Enterprise - Essai gratuit 3 mois
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            12 modules professionnels<br />
            <span className="text-primary">pour piloter votre activite</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-base mb-8">
            Stockman Enterprise debloque l&apos;application web complete pour les commerces, restaurants, boulangeries, grossistes et activites de production.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {BUSINESS_TYPE_GROUPS.map((group) => (
              <span key={group.title} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300">
                {group.title}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={ENTERPRISE_SIGNUP_URL}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-black rounded-xl transition-all shadow-xl shadow-primary/25 text-sm"
            >
              <Zap size={16} /> Commencer l&apos;essai gratuit
            </Link>
            <a
              href={PUBLIC_ENTERPRISE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold rounded-xl transition-all text-sm"
            >
              Retour a la page Enterprise <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Inclus dans Enterprise</p>
          <h2 className="text-2xl font-black text-white">Tout ce dont votre activite a besoin</h2>
          <p className="text-slate-500 text-sm mt-1">Chaque module concu pour aller plus loin que l'application mobile.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <article key={module.name} className={`rounded-2xl border ${module.border} ${module.bg} p-5 flex flex-col gap-3`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-black/30">
                    <Icon size={18} className={module.color} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-black ${module.color}`}>{module.name}</h3>
                    <p className="text-[11px] text-slate-500">{module.tagline}</p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {module.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-300 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-14">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
          <h2 className="text-2xl font-black text-white mb-2">Pret a passer au niveau superieur ?</h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto mb-6">
            Essai gratuit 3 mois inclus. Aucune carte bancaire requise.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={PUBLIC_BUSINESS_TYPES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold rounded-xl transition-all text-base"
            >
              Voir les business types <ArrowRight size={16} />
            </a>
            <Link
              href={ENTERPRISE_SIGNUP_URL}
              className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-xl transition-all shadow-xl shadow-primary/30 text-base"
            >
              <Zap size={18} /> Creer mon compte gratuitement
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
