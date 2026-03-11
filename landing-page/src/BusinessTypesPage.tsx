import { Link } from 'react-router-dom';
import SEO from './components/SEO';
import MarketingNav from './components/marketing/MarketingNav';
import MarketingFooter from './components/marketing/MarketingFooter';
import { useScrollReveal } from './hooks/useScrollReveal';
import {
  BUSINESS_TYPE_GROUPS,
  ENTERPRISE_FEATURES_URL,
  ENTERPRISE_SIGNUP_URL,
  LANDING_DEMO_PATH,
  LANDING_KEYWORDS,
  MOBILE_APP_URL,
} from './data/marketing';

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Business types Stockman',
    url: 'https://stockman.pro/business-types',
    description: 'Les activites et business types pris en charge par Stockman : commerce, restauration et production legere.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://stockman.pro/' },
      { '@type': 'ListItem', position: 2, name: 'Business types', item: 'https://stockman.pro/business-types' },
    ],
  },
];

export default function BusinessTypesPage() {
  useScrollReveal();

  return (
    <div className="landing-page">
      <SEO
        title="Business types - commerce, restauration et production"
        description="Stockman s'adapte au commerce, a la restauration et a la production legere avec mobile terrain, app web Enterprise et parcours metier."
        url="https://stockman.pro/business-types"
        keywords={[...LANDING_KEYWORDS, 'business types', 'logiciel commerce', 'logiciel restaurant', 'logiciel production']}
        structuredData={structuredData}
      />

      <MarketingNav active="business-types" />

      <section className="container page-hero reveal">
        <div className="section-title">
          <span className="badge-premium">Choisissez votre activite</span>
          <h1>Des parcours adaptes a chaque type de business</h1>
          <p className="text-muted">
            Retrouvez en un coup d&apos;oeil les activites couvertes, les cas d&apos;usage et le parcours recommande selon votre metier.
          </p>
        </div>
      </section>

      <section className="container business-types-grid reveal">
        {BUSINESS_TYPE_GROUPS.map((group) => (
          <article key={group.slug} className="glass-card business-type-card interactive-card">
            <div className="business-type-header">
              <p className="business-card-eyebrow">{group.title}</p>
              <h2>{group.seoTitle}</h2>
              <p className="business-type-plan">{group.recommendedPlan}</p>
            </div>

            <p className="text-muted">{group.seoDescription}</p>

            <div className="business-type-block">
              <h3>Cas d&apos;usage</h3>
              <ul className="business-type-list">
                {group.useCases.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="business-type-block">
              <h3>Secteurs couverts</h3>
              <div className="tag-list">
                {group.tags.map((tag) => (
                  <span key={tag} className="tag-pill">{tag}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="container reveal">
        <div className="glass-card enterprise-flow-card">
          <div className="section-title">
            <h2>Choisissez le parcours qui vous correspond</h2>
          </div>
          <div className="enterprise-grid">
            <article className="enterprise-card interactive-card">
              <h3>Starter / Pro</h3>
              <p>
                Vous gerez votre boutique depuis votre telephone avec un demarrage simple, rapide et centre sur l&apos;operationnel.
              </p>
              <div className="section-cta-row section-cta-row--left">
                <Link to={`${LANDING_DEMO_PATH}?type=commerce`} className="btn-secondary">
                  Tester la demo mobile
                </Link>
                <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  Ouvrir l&apos;app mobile
                </a>
              </div>
            </article>

            <article className="enterprise-card interactive-card">
              <h3>Enterprise</h3>
              <p>
                Vous avez besoin de pilotage avance, de plusieurs boutiques ou d&apos;une equipe: Enterprise ajoute le web a votre organisation.
              </p>
              <div className="section-cta-row section-cta-row--left">
                <Link to={`${LANDING_DEMO_PATH}?type=enterprise`} className="btn-secondary">
                  Tester la demo Enterprise
                </Link>
                <a href={ENTERPRISE_FEATURES_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  Voir l&apos;app web
                </a>
                <a href={ENTERPRISE_SIGNUP_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  Creer mon compte Enterprise
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
