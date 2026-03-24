import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from './components/SEO';
import MarketingNav from './components/marketing/MarketingNav';
import MarketingFooter from './components/marketing/MarketingFooter';
import { useScrollReveal } from './hooks/useScrollReveal';
import { getStringArray } from './utils/translation';
import {
  BUSINESS_TYPE_SLUGS,
  ENTERPRISE_FEATURES_URL,
  ENTERPRISE_SIGNUP_URL,
  LANDING_DEMO_PATH,
  LANDING_KEYWORDS,
  MOBILE_APP_URL,
} from './data/marketing';

export default function BusinessTypesPage() {
  useScrollReveal();
  const { t } = useTranslation();

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Business types Stockman',
      url: 'https://stockman.pro/business-types',
      description: t('business_types_page.subtitle'),
    },
  ];

  return (
    <div className="landing-page">
      <SEO
        title={t('business_types_page.h1')}
        description={t('business_types_page.subtitle')}
        url="https://stockman.pro/business-types"
        keywords={[...LANDING_KEYWORDS, 'business types', 'logiciel commerce', 'logiciel restaurant', 'logiciel production']}
        structuredData={structuredData}
      />

      <MarketingNav active="business-types" />

      <section className="container page-hero reveal">
        <div className="section-title">
          <span className="badge-premium">{t('business_types_page.badge')}</span>
          <h1>{t('business_types_page.h1')}</h1>
          <p className="text-muted">{t('business_types_page.subtitle')}</p>
        </div>
      </section>

      <section className="container business-types-grid reveal">
        {BUSINESS_TYPE_SLUGS.map((slug) => (
          <article key={slug} className="glass-card business-type-card interactive-card">
            <div className="business-type-header">
              <p className="business-card-eyebrow">{t(`business_types.${slug}.title`)}</p>
              <p className="business-type-plan">{t(`business_types.${slug}.recommended_plan`)}</p>
            </div>

            <p className="text-muted">{t(`business_types.${slug}.overview`)}</p>

            <div className="business-type-block">
              <h3>{t('business_types_page.use_cases_title')}</h3>
              <ul className="business-type-list">
                {getStringArray(t, `business_types.${slug}.use_cases`).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="business-type-block">
              <h3>{t('business_types_page.sectors_title')}</h3>
              <div className="tag-list">
                {getStringArray(t, `business_types.${slug}.tags`).map((tag) => (
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
            <h2>{t('business_types_page.choose_path')}</h2>
          </div>
          <div className="enterprise-grid">
            <article className="enterprise-card interactive-card">
              <h3>{t('business_types_page.starter_h3')}</h3>
              <p>{t('business_types_page.starter_desc')}</p>
              <div className="section-cta-row section-cta-row--left">
                <Link to={`${LANDING_DEMO_PATH}?type=commerce`} className="btn-secondary">
                  {t('business_types_page.cta_demo_mobile')}
                </Link>
                <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  {t('business_types_page.cta_app_mobile')}
                </a>
              </div>
            </article>

            <article className="enterprise-card interactive-card">
              <h3>{t('business_types_page.enterprise_h3')}</h3>
              <p>{t('business_types_page.enterprise_desc')}</p>
              <div className="section-cta-row section-cta-row--left">
                <Link to={`${LANDING_DEMO_PATH}?type=enterprise`} className="btn-secondary">
                  {t('business_types_page.cta_demo_enterprise')}
                </Link>
                <a href={ENTERPRISE_FEATURES_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  {t('business_types_page.cta_app_web')}
                </a>
                <a href={ENTERPRISE_SIGNUP_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  {t('business_types_page.cta_create')}
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
