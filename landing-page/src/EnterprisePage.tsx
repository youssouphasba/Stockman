import { Link } from 'react-router-dom';
import SEO from './components/SEO';
import MarketingNav from './components/marketing/MarketingNav';
import MarketingFooter from './components/marketing/MarketingFooter';
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
        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-badge-row">
              <span className="badge-premium">Enterprise visible, accessible et actionnable</span>
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
          </div>

          <div className="hero-image-container">
            <div className="hero-image-placeholder glass-card enterprise-mockup">
              <img
                src="/assets/screenshots/stockman-enterprise-preview.png"
                alt="Back-office web Stockman Enterprise"
                className="hero-image"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="container enterprise-highlights reveal">
        <div className="section-title">
          <h2>Pourquoi separer site public et app web ?</h2>
          <p className="text-muted">
            La landing explique, oriente et convertit. L&apos;app web prouve le produit et sert l&apos;usage Enterprise.
          </p>
        </div>
        <div className="enterprise-grid">
          {ENTERPRISE_HIGHLIGHTS.map((item) => (
            <article key={item.title} className="glass-card enterprise-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container business-preview reveal">
        <div className="section-title">
          <h2>Business types pris en charge</h2>
          <p className="text-muted">
            La visibilite SEO ne doit pas reposer sur le mot "Stockman" seul. Elle doit aussi capter les requetes
            metier par activite.
          </p>
        </div>
        <div className="enterprise-grid">
          {BUSINESS_TYPE_GROUPS.map((group) => (
            <article key={group.slug} className="glass-card enterprise-card">
              <p className="business-card-eyebrow">{group.title}</p>
              <h3>{group.seoTitle}</h3>
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
            <h2>Parcours recommande</h2>
            <p className="text-muted">Un parcours lisible pour l&apos;utilisateur et bon pour le SEO.</p>
          </div>
          <div className="enterprise-flow">
            <div>
              <strong>1. stockman.pro</strong>
              <p>Le visiteur comprend le produit, le business type et le bon plan.</p>
            </div>
            <div>
              <strong>2. /enterprise</strong>
              <p>Il valide que le web sert la direction et que le mobile reste l&apos;outil terrain.</p>
            </div>
            <div>
              <strong>3. app.stockman.pro/features</strong>
              <p>Il voit les modules concrets du back-office web.</p>
            </div>
            <div>
              <strong>4. app.stockman.pro</strong>
              <p>Il cree son compte Enterprise ou se connecte a l&apos;application.</p>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
