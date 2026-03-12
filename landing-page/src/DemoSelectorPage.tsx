import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from './components/SEO';
import MarketingNav from './components/marketing/MarketingNav';
import MarketingFooter from './components/marketing/MarketingFooter';
import { useScrollReveal } from './hooks/useScrollReveal';
import { API_URL } from './config';
import {
  APP_WEB_URL,
  DEMO_CHOICE_IDS,
  DEMO_CHOICE_NEXT_LINKS,
  DEMO_CHOICE_SCREENSHOTS,
  LANDING_KEYWORDS,
} from './data/marketing';
import type { DemoChoiceId } from './data/marketing';

type DemoSessionInfo = {
  demo_session_id: string;
  demo_type: string;
  label: string;
  surface: string;
  expires_at: string;
  contact_email?: string | null;
  status: string;
  country_code: string;
  currency: string;
  pricing_region: string;
};

type DemoSessionResponse = {
  access_token: string;
  refresh_token?: string;
  demo_session: DemoSessionInfo;
};

type DemoSuccessState = {
  choiceId: DemoChoiceId;
  launchUrl: string;
  demoSession: DemoSessionInfo;
};

const DEMO_API_TYPES: Record<DemoChoiceId, string> = {
  commerce: 'retail',
  restaurant: 'restaurant',
  enterprise: 'enterprise',
};

const MOBILE_DEMO_SCHEME = 'stockman://';

function buildLaunchUrl(baseUrl: string, payload: DemoSessionResponse) {
  const params = new URLSearchParams({
    demo_access_token: payload.access_token,
    demo_type: payload.demo_session.demo_type,
    demo_expires_at: payload.demo_session.expires_at,
    demo_session_id: payload.demo_session.demo_session_id,
  });
  if (payload.refresh_token) {
    params.set('demo_refresh_token', payload.refresh_token);
  }
  return `${baseUrl}?${params.toString()}`;
}

export default function DemoSelectorPage() {
  useScrollReveal();
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const preset = searchParams.get('type');
  const [selectedId, setSelectedId] = useState<DemoChoiceId | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<DemoSuccessState | null>(null);

  useEffect(() => {
    if (preset === 'enterprise') setSelectedId('enterprise');
    else if (preset === 'restaurant') setSelectedId('restaurant');
    else if (preset === 'commerce') setSelectedId('commerce');
  }, [preset]);

  useEffect(() => {
    if (!success || typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      window.location.assign(success.launchUrl);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [success]);

  const formatExpiration = (value: string) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language || undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));

  const startDemo = async (choiceId?: DemoChoiceId | null) => {
    setError('');
    const targetChoice = choiceId || selectedId;
    if (!targetChoice) {
      setError(t('demo_page.error_choice'));
      return;
    }

    setSelectedId(targetChoice);
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/demo/session`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demo_type: DEMO_API_TYPES[targetChoice],
        }),
      });

      if (!response.ok) {
        let detail = '';
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const payload = await response.json() as { detail?: string };
            detail = typeof payload.detail === 'string' ? payload.detail.trim() : '';
          } else {
            detail = (await response.text()).trim();
          }
        } catch {
          detail = '';
        }

        throw new Error(detail || t('demo_page.error_submit'));
      }

      const payload = await response.json() as DemoSessionResponse;
      const launchUrl = payload.demo_session.surface === 'web'
        ? buildLaunchUrl(APP_WEB_URL, payload)
        : buildLaunchUrl(MOBILE_DEMO_SCHEME, payload);

      setSuccess({
        choiceId: targetChoice,
        launchUrl,
        demoSession: payload.demo_session,
      });
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(t('demo_page.error_submit'));
      }
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
        keywords={[...LANDING_KEYWORDS, 'demo Stockman', 'demo enterprise', 'demo commerce', 'demo restaurant']}
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
                <strong>{t('demo_page.instant_step1_title')}</strong>
                <p>{t('demo_page.instant_step1_desc')}</p>
              </div>
            </div>
            <div className="demo-step">
              <span className="demo-step-number">2</span>
              <div>
                <strong>{t('demo_page.instant_step2_title')}</strong>
                <p>{t('demo_page.instant_step2_desc')}</p>
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
        <div className="demo-email-form glass-card">
          <div className="demo-email-copy">
            <h2>{t('demo_page.instant_title')}</h2>
            <p className="text-muted">{t('demo_page.instant_subtitle')}</p>
          </div>
          <div className="demo-email-controls">
            <button
              type="button"
              className="btn-primary"
              disabled={loading || !selectedId}
              onClick={() => { void startDemo(selectedId); }}
            >
              {loading ? t('demo_page.instant_loading') : t('demo_page.instant_submit')}
            </button>
          </div>
          {error ? <p className="signup-error">{error}</p> : null}
          {success ? (
            <div className="demo-success-panel">
              <h3>{t('demo_page.success_title')}</h3>
              <p>{t('demo_page.success_desc', {
                title: t(`demo_page.choices.${success.choiceId}.title`),
              })}</p>
              <p className="text-muted">
                {t('demo_page.success_meta', {
                  label: success.demoSession.label,
                  surface: t(`demo_page.surface_${success.demoSession.surface}`),
                  expiresAt: formatExpiration(success.demoSession.expires_at),
                })}
              </p>
              <div className="hero-btns">
                <a href={success.launchUrl} className="btn-primary">
                  {success.demoSession.surface === 'web' ? t('demo_page.open_web') : t('demo_page.open_mobile')}
                </a>
                {DEMO_CHOICE_NEXT_LINKS[success.choiceId].map((link, i) =>
                  link.external ? (
                    <a key={i} href={link.href} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                      {t(`demo_page.choices.${success.choiceId}.link_${i + 1}`)}
                    </a>
                  ) : (
                    <Link key={i} to={link.href} className="btn-secondary">
                      {t(`demo_page.choices.${success.choiceId}.link_${i + 1}`)}
                    </Link>
                  )
                )}
              </div>
            </div>
          ) : null}
        </div>
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
                  disabled={loading}
                  onClick={() => {
                    setSelectedId(id);
                    setSuccess(null);
                    setError('');
                    void startDemo(id);
                  }}
                >
                  {loading && selectedId === id
                    ? t('demo_page.instant_loading')
                    : t('demo_page.instant_card_cta')}
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
