import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from './components/SEO';
import MarketingNav from './components/marketing/MarketingNav';
import MarketingFooter from './components/marketing/MarketingFooter';
import { useScrollReveal } from './hooks/useScrollReveal';
import {
  BUSINESS_TYPE_SLUGS,
  ENTERPRISE_FEATURES_URL,
  ENTERPRISE_PRICING_URL,
  ENTERPRISE_SIGNUP_URL,
  LANDING_DEMO_PATH,
  LANDING_KEYWORDS,
  MOBILE_APP_URL,
} from './data/marketing';

export default function EnterprisePage() {
  useScrollReveal();
  const { t } = useTranslation();

  const highlights = t('enterprise_highlights', { returnObjects: true }) as Array<{ title: string; desc: string }>;
  const sideList = t('enterprise_page.side_li', { returnObjects: true }) as string[];
  const steps = t('enterprise_page.steps', { returnObjects: true }) as Array<{ title: string; desc: string }>;

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Stockman Enterprise',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, iOS, Android',
      url: 'https://stockman.pro/enterprise',
      offers: { '@type': 'Offer', url: ENTERPRISE_PRICING_URL, priceCurrency: 'XOF', price: '9900' },
    },
  ];

  return (
    <div className="landing-page">
      <SEO
        title={t('enterprise_page.h1_pre') + ' ' + t('enterprise_page.h1_gradient') + ' - Stockman'}
        description={t('enterprise_page.subtitle')}
        url="https://stockman.pro/enterprise"
        keywords={[...LANDING_KEYWORDS, 'Stockman Enterprise', 'application web gestion entreprise']}
        structuredData={structuredData}
      />

      <MarketingNav active="enterprise" />

      <section className="hero reveal">
        <div className="container enterprise-hero-layout">
          <div className="hero-content enterprise-hero-copy">
            <div className="hero-badge-row">
              <span className="badge-premium">{t('enterprise_page.badge')}</span>
            </div>
            <h1>
              {t('enterprise_page.h1_pre')} <span className="text-gradient">{t('enterprise_page.h1_gradient')}</span>
              <br />
              {t('enterprise_page.h1_post')}
            </h1>
            <p>{t('enterprise_page.subtitle')}</p>
            <div className="hero-btns">
              <a href={ENTERPRISE_FEATURES_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
                {t('enterprise_page.cta_web')}
              </a>
              <Link to={`${LANDING_DEMO_PATH}?type=enterprise`} className="btn-secondary">
                {t('enterprise_page.cta_demo')}
              </Link>
            </div>
            <div className="enterprise-inline-links">
              <a href={ENTERPRISE_PRICING_URL} target="_blank" rel="noopener noreferrer">{t('enterprise_page.link_pricing')}</a>
              <span>•</span>
              <a href={ENTERPRISE_SIGNUP_URL} target="_blank" rel="noopener noreferrer">{t('enterprise_page.link_create')}</a>
              <span>•</span>
              <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer">{t('enterprise_page.link_mobile')}</a>
            </div>

            <div className="metric-strip">
              <div className="mini-kpi">
                <strong>{t('enterprise_page.kpi1_title')}</strong>
                <span>{t('enterprise_page.kpi1_desc')}</span>
              </div>
              <div className="mini-kpi">
                <strong>{t('enterprise_page.kpi2_title')}</strong>
                <span>{t('enterprise_page.kpi2_desc')}</span>
              </div>
              <div className="mini-kpi">
                <strong>{t('enterprise_page.kpi3_title')}</strong>
                <span>{t('enterprise_page.kpi3_desc')}</span>
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
              <p className="business-card-eyebrow">{t('enterprise_page.side_eyebrow')}</p>
              <ul className="business-type-list">
                {sideList.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="container enterprise-highlights reveal">
        <div className="section-title">
          <h2>{t('enterprise_page.highlights_title')}</h2>
          <p className="text-muted">{t('enterprise_page.highlights_subtitle')}</p>
        </div>
        <div className="enterprise-grid">
          {highlights.map((item) => (
            <article key={item.title} className="glass-card enterprise-card interactive-card">
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container business-preview reveal">
        <div className="section-title">
          <h2>{t('enterprise_page.solution_title')}</h2>
          <p className="text-muted">{t('enterprise_page.solution_subtitle')}</p>
        </div>
        <div className="enterprise-grid">
          {BUSINESS_TYPE_SLUGS.map((slug) => (
            <article key={slug} className="glass-card enterprise-card interactive-card">
              <p className="business-card-eyebrow">{t(`business_types.${slug}.title`)}</p>
              <h3>{t(`enterprise_page.${slug}_h3`)}</h3>
              <p>{t(`business_types.${slug}.overview`)}</p>
              <div className="tag-list">
                {(t(`business_types.${slug}.tags`, { returnObjects: true }) as string[]).map((tag) => (
                  <span key={tag} className="tag-pill">{tag}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="section-cta-row">
          <Link to="/business-types" className="btn-secondary">{t('enterprise_page.cta_business_types')}</Link>
          <a href={ENTERPRISE_FEATURES_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
            {t('enterprise_page.cta_modules')}
          </a>
        </div>
      </section>

      <section className="container enterprise-funnel reveal">
        <div className="glass-card enterprise-flow-card">
          <div className="section-title">
            <h2>{t('enterprise_page.funnel_title')}</h2>
            <p className="text-muted">{t('enterprise_page.funnel_subtitle')}</p>
          </div>
          <div className="enterprise-flow">
            {steps.map((step) => (
              <div key={step.title}>
                <strong>{step.title}</strong>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
