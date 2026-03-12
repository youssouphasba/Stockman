import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from './components/SEO';
import MarketingNav from './components/marketing/MarketingNav';
import MarketingFooter from './components/marketing/MarketingFooter';
import { useScrollReveal } from './hooks/useScrollReveal';
import { API_URL } from './config';
import {
  DEMO_CHOICE_IDS,
  DEMO_CHOICE_NEXT_LINKS,
  DEMO_CHOICE_SCREENSHOTS,
  DemoChoiceId,
  LANDING_KEYWORDS,
} from './data/marketing';

export default function DemoSelectorPage() {
  useScrollReveal();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const preset = searchParams.get('type');
  const [email, setEmail] = useState('');
  const [selectedId, setSelectedId] = useState<DemoChoiceId | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (preset === 'enterprise') setSelectedId('enterprise');
    else if (preset === 'restaurant') setSelectedId('restaurant');
    else if (preset === 'commerce') setSelectedId('commerce');
  }, [preset]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError(t('demo_page.error_email'));
      return;
    }
    if (!selectedId) {
      setError(t('demo_page.error_choice'));
      return;
    }

    setLoading(true);
    try {
      const choiceTitle = t(`demo_page.choices.${selectedId}.title`);
      const response = await fetch(`${API_URL}/api/public/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Lead démo ${choiceTitle}`,
          email: email.trim().toLowerCase(),
          message: `Demande de démo Stockman.\nType : ${choiceTitle}\nSurface : ${t(`demo_page.choices.${selectedId}.surface`)}\nDurée : ${t(`demo_page.choices.${selectedId}.duration`)}\nAudience : ${t(`demo_page.choices.${selectedId}.audience`)}`,
        }),
      });

      if (!response.ok) throw new Error(t('demo_page.error_submit'));
      setSuccess(true);
    } catch {
      setError(t('demo_page.error_submit'));
    } finally {
      setLoading(false);
    }
  };

  const structuredData = [{
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('demo_page.badge'),
    url: 'https://stockman.pro/demo',
    description: t('demo_page.subtitle'),
  }];

  return (
    <div className="landing-page">
      <SEO
        title={t('demo_page.badge') + ' - Stockman'}
        description={t('demo_page.subtitle')}
        url="https://stockman.pro/demo"
        keywords={[...LANDING_KEYWORDS, 'démo Stockman', 'demo enterprise', 'demo commerce', 'demo restaurant']}
        structuredData={structuredData}
      />

      <MarketingNav active="demo" />

      <section className="container page-hero reveal">
        <div className="section-title">
          <span className="badge-premium">{t('demo_page.badge')}</span>
          <h1>{t('demo_page.h1')}</h1>
          <p className="text-muted">{t('demo_page.subtitle')}</p>
        </div>
      </section>

      <section className="container reveal">
        <div className="glass-card demo-intro-card">
          <div className="demo-steps">
            <div className="demo-step">
              <span className="demo-step-number">1</span>
              <div>
                <strong>{t('demo_page.step1_title')}</strong>
                <p>{t('demo_page.step1_desc')}</p>
              </div>
            </div>
            <div className="demo-step">
              <span className="demo-step-number">2</span>
              <div>
                <strong>{t('demo_page.step2_title')}</strong>
                <p>{t('demo_page.step2_desc')}</p>
              </div>
            </div>
          </div>
          <div className="demo-enterprise-callout">
            <strong>{t('demo_page.callout_title')}</strong>
            <p>{t('demo_page.callout_desc')}</p>
          </div>
        </div>
      </section>

      <section className="container reveal">
        <form onSubmit={handleSubmit} className="demo-email-form glass-card">
          <div className="demo-email-copy">
            <h2>{t('demo_page.email_title')}</h2>
            <p className="text-muted">{t('demo_page.email_subtitle')}</p>
          </div>
          <div className="demo-email-controls">
            <input
              type="email"
              className="demo-email-input"
              placeholder={t('demo_page.email_placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? t('demo_page.email_loading') : t('demo_page.email_submit')}
            </button>
          </div>
          {error ? <p className="signup-error">{error}</p> : null}
          {success && selectedId ? (
            <div className="demo-success-panel">
              <h3>{t('demo_page.success_title')}</h3>
              <p>{t('demo_page.success_desc', { title: t(`demo_page.choices.${selectedId}.title`) })}</p>
              <div className="hero-btns">
                {DEMO_CHOICE_NEXT_LINKS[selectedId].map((link, i) =>
                  link.external ? (
                    <a key={i} href={link.href} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                      {t(`demo_page.choices.${selectedId}.link_${i + 1}`)}
                    </a>
                  ) : (
                    <Link key={i} to={link.href} className="btn-secondary">
                      {t(`demo_page.choices.${selectedId}.link_${i + 1}`)}
                    </Link>
                  )
                )}
              </div>
            </div>
          ) : null}
        </form>
      </section>

      <section className="container demo-options-grid reveal">
        {DEMO_CHOICE_IDS.map((id) => {
          const isSelected = selectedId === id;
          const recommendationBadge = t(`demo_page.choices.${id}.recommendation_badge`, { defaultValue: '' });
          const businessTypes = t(`demo_page.choices.${id}.business_types`, { returnObjects: true }) as string[];
          const whatTheyWillSee = t(`demo_page.choices.${id}.what_they_will_see`, { returnObjects: true }) as string[];
          const whyChooseIt = t(`demo_page.choices.${id}.why_choose_it`, { returnObjects: true }) as string[];

          return (
            <article
              key={id}
              className={`glass-card demo-option-card interactive-card${isSelected ? ' selected' : ''}`}
            >
              <div className="demo-option-media">
                <img src={DEMO_CHOICE_SCREENSHOTS[id]} alt={t(`demo_page.choices.${id}.title`)} className="demo-option-image" />
              </div>
              <div className="demo-option-body">
                <div className="demo-option-meta">
                  <span className="demo-option-pill">{t(`demo_page.choices.${id}.surface`)}</span>
                  <span className="demo-option-pill demo-option-pill-soft">{t(`demo_page.choices.${id}.duration`)}</span>
                </div>
                {recommendationBadge ? (
                  <div className="demo-option-highlight">{recommendationBadge}</div>
                ) : null}
                <p className="business-card-eyebrow">{t(`demo_page.choices.${id}.audience`)}</p>
                <h2>{t(`demo_page.choices.${id}.title`)}</h2>
                <p className="text-muted">{t(`demo_page.choices.${id}.summary`)}</p>

                <div className="demo-option-block">
                  <h3>{t('demo_page.ideal_for')}</h3>
                  <div className="tag-list">
                    {businessTypes.map((item) => (
                      <span key={item} className="tag-pill">{item}</span>
                    ))}
                  </div>
                </div>

                <div className="demo-option-block">
                  <h3>{t('demo_page.you_will_see')}</h3>
                  <ul className="business-type-list">
                    {whatTheyWillSee.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>

                <div className="demo-option-block">
                  <h3>{t('demo_page.why_choose')}</h3>
                  <ul className="business-type-list">
                    {whyChooseIt.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>

                <button
                  type="button"
                  className={isSelected ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => { setSelectedId(id); setSuccess(false); setError(''); }}
                >
                  {isSelected ? t('demo_page.btn_selected') : t('demo_page.btn_choose')}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="container reveal">
        <div className="glass-card demo-footer-card">
          <div className="section-title">
            <h2>{t('demo_page.footer_title')}</h2>
            <p className="text-muted">{t('demo_page.footer_desc')}</p>
          </div>
          <div className="section-cta-row">
            <Link to="/business-types" className="btn-secondary">{t('demo_page.cta_business_types')}</Link>
            <Link to="/enterprise" className="btn-primary">{t('demo_page.cta_enterprise')}</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
