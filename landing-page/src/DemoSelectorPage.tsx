import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from './components/SEO';
import MarketingNav from './components/marketing/MarketingNav';
import MarketingFooter from './components/marketing/MarketingFooter';
import { useScrollReveal } from './hooks/useScrollReveal';
import { API_URL } from './config';
import { getStringArray } from './utils/translation';
import {
  APP_WEB_URL,
  DEMO_CHOICE_IDS,
  DEMO_CHOICE_SCREENSHOTS,
  LANDING_KEYWORDS,
  MOBILE_APP_URL,
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

function buildMobileLaunchUrl(baseUrl: string, payload: DemoSessionResponse) {
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (preset === 'enterprise') setSelectedId('enterprise');
    else if (preset === 'restaurant') setSelectedId('restaurant');
    else if (preset === 'commerce') setSelectedId('commerce');
  }, [preset]);



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
      if (targetChoice === 'enterprise') {
        window.location.assign(`${APP_WEB_URL}?demo=enterprise`);
        return;
      }

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
      const launchUrl = buildMobileLaunchUrl(MOBILE_DEMO_SCHEME, payload);

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
          <p className="text-muted">{t('demo_page.subtitle_short')}</p>
        </div>
        {error ? <p className="signup-error">{error}</p> : null}
        {success ? (
          <div className="glass-card demo-success-panel" style={{ marginTop: 'var(--spacing-md)' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
              <span className="badge-premium" style={{ display: 'inline-block', marginBottom: '10px' }}>
                {t('demo_page.success_title')}
              </span>
              <h3>
                {t('demo_page.success_desc', {
                  title: t(`demo_page.choices.${success.choiceId}.title`),
                })}
              </h3>
            </div>

            {success.demoSession.surface === 'web' ? (
              <div className="hero-btns" style={{ justifyContent: 'center' }}>
                <a href={success.launchUrl} className="btn-primary">
                  {t('demo_page.open_web')}
                </a>
              </div>
            ) : !isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px' }}>
                <p style={{ fontWeight: 600 }}>Scannez ce QR Code avec votre téléphone</p>
                <div style={{ background: 'white', padding: '15px', borderRadius: '12px' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(success.launchUrl)}`}
                    alt="QR Code Stockman"
                    width={200}
                    height={200}
                  />
                </div>
                <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '10px' }}>
                  Vous n'avez pas l'application ? <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Téléchargez-la ici</a>.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px' }}>
                  <div style={{ background: 'var(--primary)', color: 'white', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>1</div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', marginBottom: '5px' }}>Téléchargez l'application</strong>
                    <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0 0 10px 0' }}>Si vous ne l'avez pas encore installée sur votre appareil</p>
                    <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ width: '100%', display: 'inline-block', textAlign: 'center' }}>
                      Ouvrir Play Store
                    </a>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', border: '1px solid var(--primary)' }}>
                  <div style={{ background: 'var(--primary)', color: 'white', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>2</div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', marginBottom: '5px' }}>Lancez la démo immersive</strong>
                    <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0 0 10px 0' }}>Votre session est générée et prête !</p>
                    <a href={success.launchUrl} className="btn-primary" style={{ width: '100%', display: 'inline-block', textAlign: 'center' }}>
                      Lancer la démo
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center' }}>
                {t('demo_page.success_meta', {
                  label: success.demoSession.label,
                  surface: t(`demo_page.surface_${success.demoSession.surface}`),
                  expiresAt: formatExpiration(success.demoSession.expires_at),
                })}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="container demo-options-grid reveal">
        {DEMO_CHOICE_IDS.map((id) => {
          const isSelected = selectedId === id;
          const businessTypes = getStringArray(t, `demo_page.choices.${id}.business_types`);

          return (
            <article
              key={id}
              className={`glass-card demo-option-card interactive-card${isSelected ? ' selected' : ''}`}
            >
              <div className="demo-option-media">
                <img src={DEMO_CHOICE_SCREENSHOTS[id]} alt={t(`demo_page.choices.${id}.title`)} className="demo-option-image" />
              </div>
              <div className="demo-option-body">
                <div className="demo-option-meta" style={{ marginBottom: '15px' }}>
                  <span className="demo-option-pill" style={{ background: 'var(--primary)', color: 'white', fontWeight: 'bold' }}>
                    {t(`demo_page.choices.${id}.surface`)}
                  </span>
                  <span className="demo-option-pill demo-option-pill-soft">{t(`demo_page.choices.${id}.duration`)}</span>
                </div>
                <h2>{t(`demo_page.choices.${id}.title`)}</h2>
                <p className="text-muted">{t(`demo_page.choices.${id}.summary`)}</p>

                <div className="demo-option-block">
                  <div className="tag-list">
                    {businessTypes.map((item) => (
                      <span key={item} className="tag-pill">{item}</span>
                    ))}
                  </div>
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
