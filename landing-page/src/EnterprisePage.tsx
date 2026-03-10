import { Link } from 'react-router-dom';
import SEO from './components/SEO';
import MarketingNav from './components/marketing/MarketingNav';
import MarketingFooter from './components/marketing/MarketingFooter';
import { useScrollReveal } from './hooks/useScrollReveal';
import {
  BUSINESS_TYPE_GROUPS,
  ENTERPRISE_FEATURES_URL,
  ENTERPRISE_HIGHLIGHTS,
  ENTERPRISE_PRICING_URL,
  ENTERPRISE_SIGNUP_URL,
  LANDING_KEYWORDS,
  MOBILE_APP_URL,
} from './data/marketing';

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Stockman',
    url: 'https://stockman.pro',
    logo: 'https://stockman.pro/stockman_landing_hero.png',
    sameAs: ['https://app.stockman.pro'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Stockman Enterprise',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    url: 'https://stockman.pro/enterprise',
    offers: {
      '@type': 'Offer',
      url: ENTERPRISE_PRICING_URL,
      priceCurrency: 'XOF',
      price: '9900',
      category: 'Enterprise',
    },
    featureList: [
      'Back-office web complet',
      'Dashboard et analyses avancees',
      'Multi-boutiques et permissions par boutique',
      'Mobile terrain relie au web',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://stockman.pro/' },
      { '@type': 'ListItem', position: 2, name: 'Enterprise', item: 'https://stockman.pro/enterprise' },
    ],
  },
];

export default function EnterprisePage() {
  useScrollReveal();

  return (
    <div className="landing-page">
      <SEO
        title="Stockman Enterprise - App web de gestion multi-boutiques"
        description="Stockman Enterprise combine application web et mobile terrain pour piloter stock, ventes, CRM, comptabilite, equipe et multi-boutiques."
        url="https://stockman.pro/enterprise"
        keywords={[...LANDING_KEYWORDS, 'Stockman Enterprise', 'application web gestion entreprise', 'logiciel multi-boutiques']}
        structuredData={structuredData}
      />

      <MarketingNav active="enterprise" />

      <section className="hero reveal">
        <div className="container enterprise-hero-layout">
          <div className="hero-content enterprise-hero-copy">
            <div className="hero-badge-row">
              <span className="badge-premium">Pour les entreprises structurees</span>
            </div>
            <h1>
              L&apos;application web <span className="text-gradient">Enterprise</span>
              <br />
              pour piloter votre activite
            </h1>
            <p>
              Stockman Enterprise donne a la direction un vrai back-office web, pendant que les equipes continuent
              a travailler sur mobile. C&apos;est le bon modele pour les comptes multi-boutiques, multi-equipes
              et les activites qui ont besoin d&apos;analyses avancees.
            </p>
            <div className="hero-btns">
              <a href={ENTERPRISE_FEATURES_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Voir l&apos;app web Enterprise
              </a>
              <a href={ENTERPRISE_SIGNUP_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                Creer mon compte Enterprise
              </a>
            </div>
            <div className="enterprise-inline-links">
              <a href={ENTERPRISE_PRICING_URL} target="_blank" rel="noopener noreferrer">Tarifs Enterprise</a>
              <span>•</span>
              <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer">Application mobile terrain</a>
            </div>

            <div className="metric-strip">
              <div className="mini-kpi">
                <strong>Web + mobile</strong>
                <span>Direction sur le web, equipes sur mobile</span>
              </div>
              <div className="mini-kpi">
                <strong>Multi-boutiques</strong>
                <span>Permissions et pilotage par boutique</span>
              </div>
              <div className="mini-kpi">
                <strong>Business types</strong>
                <span>Commerce, restauration et production</span>
              </div>
            </div>
          </div>

          <div className="enterprise-hero-side">
            <div className="hero-image-placeholder glass-card enterprise-mockup">
              <img
                src="/assets/screenshots/stockman-enterprise-preview.png"
                alt="Back-office web Stockman Enterprise"
                className="hero-image"
              />
            </div>
            <div className="glass-card hero-side-card">
              <p className="business-card-eyebrow">Ce que voit un compte Enterprise</p>
              <ul className="business-type-list">
                <li>Vue multi-boutiques et comparaison des points de vente</li>
                <li>CRM, comptabilite, analytics et equipe sur le web</li>
                <li>Staff terrain relie au meme backend sur mobile</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="container enterprise-highlights reveal">
        <div className="section-title">
          <h2>Ce que Enterprise vous apporte au quotidien</h2>
          <p className="text-muted">
            Vos equipes travaillent vite sur mobile. Vous gardez une vision complete de l&apos;activite depuis le web.
          </p>
        </div>
        <div className="enterprise-grid">
          {ENTERPRISE_HIGHLIGHTS.map((item) => (
            <article key={item.title} className="glass-card enterprise-card interactive-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container business-preview reveal">
        <div className="section-title">
          <h2>Une solution adaptee a votre activite</h2>
          <p className="text-muted">
            Que vous geriez un commerce, un restaurant ou une activite de production, Stockman s&apos;adapte a votre facon de travailler.
          </p>
        </div>
        <div className="enterprise-grid">
          {BUSINESS_TYPE_GROUPS.map((group) => (
            <article key={group.slug} className="glass-card enterprise-card interactive-card">
              <p className="business-card-eyebrow">{group.title}</p>
              <h3>
                {group.title === 'Commerce' && 'Supervisez vos boutiques avec plus de precision'}
                {group.title === 'Restauration' && 'Coordonnez le terrain, la salle et le pilotage'}
                {group.title === 'Production' && 'Gardez la main sur vos stocks et votre fabrication'}
              </h3>
              <p>{group.overview}</p>
              <div className="tag-list">
                {group.tags.map((tag) => (
                  <span key={tag} className="tag-pill">{tag}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="section-cta-row">
          <Link to="/business-types" className="btn-secondary">Voir tous les business types</Link>
          <a href={ENTERPRISE_FEATURES_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Voir les modules Enterprise
          </a>
        </div>
      </section>

      <section className="container enterprise-funnel reveal">
        <div className="glass-card enterprise-flow-card">
          <div className="section-title">
            <h2>Comment demarrer avec Enterprise ?</h2>
            <p className="text-muted">En quelques etapes, vous voyez le produit, puis vous creez votre espace.</p>
          </div>
          <div className="enterprise-flow">
            <div>
              <strong>1. Decouvrez la solution</strong>
              <p>Consultez les cas d&apos;usage, les activites couvertes et le plan adapte a votre entreprise.</p>
            </div>
            <div>
              <strong>2. Comprenez le mode Enterprise</strong>
              <p>Voyez comment le web sert la direction pendant que les equipes utilisent le mobile sur le terrain.</p>
            </div>
            <div>
              <strong>3. Explorez l&apos;app web</strong>
              <p>Parcourez les modules concrets du back-office: stock, caisse, CRM, comptabilite et equipe.</p>
            </div>
            <div>
              <strong>4. Creez votre espace</strong>
              <p>Demarrez votre compte Enterprise ou connectez-vous directement a l&apos;application web.</p>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
