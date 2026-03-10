import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import FeaturePage from './FeaturePage';
import TermsOfService from './TermsOfService';
import PrivacyPolicy from './PrivacyPolicy';
import HelpCenter from './HelpCenter';
import Blog from './Blog';
import BlogPost from './BlogPost';
import About from './About';
import DeleteAccount from './DeleteAccount';
import EnterprisePage from './EnterprisePage';
import BusinessTypesPage from './BusinessTypesPage';

import ComparisonTable from './components/ComparisonTable';
import CookieBanner from './components/CookieBanner';
import WhatsAppButton from './components/WhatsAppButton';
import Newsletter from './components/Newsletter';
import SEO from './components/SEO';
import ContactSection from './components/ContactSection';
import Analytics from './components/Analytics';
import AdminLeads from './components/AdminLeads';
import Hero, { type Profile } from './components/landing/Hero';
import Features from './components/landing/Features';
import MarketingNav from './components/marketing/MarketingNav';
import MarketingFooter from './components/marketing/MarketingFooter';
import WebAppShowcase from './components/landing/WebAppShowcase';
import { useScrollReveal } from './hooks/useScrollReveal';
import './App.css';

import { detectRegion, getPricingByRegion, formatPrice, type Region } from './utils/pricing';
import {
  BUSINESS_TYPE_GROUPS,
  ENTERPRISE_FEATURES_URL,
  ENTERPRISE_SIGNUP_URL,
  LANDING_KEYWORDS,
  MOBILE_APP_URL,
} from './data/marketing';

function Landing() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile>('merchant');
  useScrollReveal();

  useEffect(() => {
    const timer = setTimeout(() => {
      document.querySelectorAll('.reveal:not(.revealed)').forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 200) {
          el.classList.add('revealed');
        }
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [profile]);

  const [region, setRegion] = useState<Region>(() => detectRegion());
  const pricingData = getPricingByRegion(region);

  const testimonials = [
    { key: 't1', author: t('testimonials.t1_author'), job: t('testimonials.t1_job'), avatar: 'A' },
    { key: 't2', author: t('testimonials.t2_author'), job: t('testimonials.t2_job'), avatar: 'S' },
    { key: 't3', author: t('testimonials.t3_author'), job: t('testimonials.t3_job'), avatar: 'P' },
  ];

  const homepageStructuredData = [
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
      name: 'Stockman',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'iOS, Android, Web',
      url: 'https://stockman.pro',
      offers: [
        { '@type': 'Offer', category: 'Starter', priceCurrency: 'XOF', price: '2500' },
        { '@type': 'Offer', category: 'Pro', priceCurrency: 'XOF', price: '4900' },
        { '@type': 'Offer', category: 'Enterprise', priceCurrency: 'XOF', price: '9900' },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Comment fonctionne Stockman selon le plan ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Starter et Pro demarrent sur mobile. Enterprise ajoute un back-office web sur app.stockman.pro pour la gestion avancee.',
          },
        },
        {
          '@type': 'Question',
          name: 'Pour quels business types Stockman est adapte ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Stockman couvre le commerce, la restauration et la production legere avec des parcours adaptes a chaque activite.',
          },
        },
      ],
    },
  ];

  return (
    <div className="landing-page">
      <SEO
        title="Stockman - Logiciel de gestion stock, caisse POS et app web Enterprise"
        description="Stockman relie application mobile terrain et back-office web Enterprise pour commerce, supermarche, restaurant, boulangerie et production legere."
        url="https://stockman.pro"
        keywords={LANDING_KEYWORDS}
        structuredData={homepageStructuredData}
      />

      <MarketingNav active="home" />

      <Hero profile={profile} onProfileChange={setProfile} />

      <section className="container business-preview reveal">
        <div className="section-title">
          <h2>Choisissez l&apos;experience qui correspond a votre activite</h2>
          <p className="text-muted">
            Commerce, restauration ou production legere: decouvrez le bon parcours et les bons outils selon votre facon de travailler.
          </p>
        </div>
        <div className="enterprise-grid">
          {BUSINESS_TYPE_GROUPS.map((group) => (
            <Link key={group.slug} to="/business-types" style={{ textDecoration: 'none' }}>
              <article className="glass-card enterprise-card business-preview-card">
                <p className="business-card-eyebrow">{group.title}</p>
                <h3>
                  {group.title === 'Commerce' && 'Pour vos boutiques et points de vente'}
                  {group.title === 'Restauration' && 'Pour votre service et votre cuisine'}
                  {group.title === 'Production' && 'Pour votre atelier et votre fabrication'}
                </h3>
                <p>{group.overview}</p>
                <div className="tag-list">
                  {group.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="tag-pill">{tag}</span>
                  ))}
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        <ComparisonTable />
      </div>

      <section className="stats-section reveal reveal-left">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <h3>+500</h3>
              <p>{t('stats.shops')}</p>
            </div>
            <div className="stat-item">
              <h3>+100k</h3>
              <p>{t('stats.transactions')}</p>
            </div>
            <div className="stat-item">
              <h3>98%</h3>
              <p>{t('stats.satisfaction')}</p>
            </div>
            <div className="stat-item">
              <h3>24/7</h3>
              <p>{t('stats.support')}</p>
            </div>
          </div>
        </div>
      </section>

      {profile === 'enterprise' && <WebAppShowcase />}

      <Features />

      <section className="how-it-works container reveal reveal-right">
        <div className="section-title">
          <h2>Commencez simplement</h2>
          <p className="text-muted">Créez votre compte, ajoutez vos produits et commencez à vendre rapidement.</p>
        </div>
        <div className="steps-grid">
          <div className="step-card glass-card">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Créez votre compte</h3>
              <p>Installez l&apos;application et configurez votre boutique en quelques minutes.</p>
            </div>
          </div>
          <div className="step-card glass-card">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Ajoutez vos produits</h3>
              <p>Importez votre stock ou scannez vos articles pour être prêt à vendre rapidement.</p>
            </div>
          </div>
          <div className="step-card glass-card">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Vendez et suivez</h3>
              <p>Encaissez vos premières ventes et gardez une vue claire sur votre activité.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="testimonials container reveal">
        <div className="section-title">
          <h2>{t('testimonials.title')}</h2>
          <p className="text-muted">{t('testimonials.subtitle')}</p>
        </div>
        <div className="testimonials-grid">
          {testimonials.map((test, i) => (
            <div key={i} className="testimonial-card glass-card">
              <p>"{t(`testimonials.${test.key}`)}"</p>
              <div className="testimonial-author">
                <div className="author-avatar">{test.avatar}</div>
                <div>
                  <strong>{test.author}</strong>
                  <p style={{ fontSize: '0.8rem', margin: 0 }}>{test.job}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="pricing container reveal">
        <div className="section-title">
          <h2>{profile === 'enterprise' ? 'Enterprise pour piloter, mobile pour executer' : t('pricing.title')}</h2>
          <p className="text-muted">
            {profile === 'enterprise'
              ? 'Enterprise ajoute un back-office web complet, tout en gardant l application mobile pour les equipes sur le terrain.'
              : t('pricing.subtitle')}
          </p>
          <div className="pricing-currency-switcher">
            <span className="pricing-currency-label">Afficher les prix en :</span>
            <div className="pricing-currency-tabs">
              <button
                className={`currency-tab${region === 'africa_xof' || region === 'africa_xaf' ? ' active' : ''}`}
                onClick={() => setRegion('africa_xof')}
              >
                FCFA
              </button>
              <button
                className={`currency-tab${region === 'europe' ? ' active' : ''}`}
                onClick={() => setRegion('europe')}
              >
                EUR
              </button>
              <button
                className={`currency-tab${region === 'global' ? ' active' : ''}`}
                onClick={() => setRegion('global')}
              >
                USD
              </button>
            </div>
          </div>
        </div>

        {profile === 'merchant' ? (
          <div className="pricing-grid pricing-grid--mobile">
            <div className="pricing-card glass-card">
              <h3>{t('pricing.starter.name')}</h3>
              <div className="price">{formatPrice(pricingData.starter, pricingData.currency)} <span>{t('pricing.month')}</span></div>
              <ul className="pricing-features">
                <li><span className="check-icon">OK</span> {t('pricing.starter.f1')}</li>
                <li><span className="check-icon">OK</span> {t('pricing.starter.f2')}</li>
                <li><span className="check-icon">OK</span> {t('pricing.starter.f3')}</li>
                <li><span className="check-icon">OK</span> {t('pricing.starter.f4')}</li>
              </ul>
              <a
                href={MOBILE_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ background: 'rgba(255,255,255,0.1)', display: 'block', textAlign: 'center', width: '100%' }}
              >
                Demarrer sur mobile
              </a>
            </div>

            <div className="pricing-card glass-card popular">
              <div className="popular-tag">{t('pricing.popular')}</div>
              <h3>{t('pricing.business.name')}</h3>
              <div className="price">{formatPrice(pricingData.pro, pricingData.currency)} <span>{t('pricing.month')}</span></div>
              <ul className="pricing-features">
                <li><span className="check-icon">OK</span> {t('pricing.business.f1')}</li>
                <li><span className="check-icon">OK</span> {t('pricing.business.f2')}</li>
                <li><span className="check-icon">OK</span> {t('pricing.business.f3')}</li>
                <li><span className="check-icon">OK</span> {t('pricing.business.f4')}</li>
                <li><span className="check-icon">OK</span> {t('pricing.business.f5')}</li>
              </ul>
              <a
                href={MOBILE_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ display: 'block', textAlign: 'center', width: '100%' }}
              >
                Continuer sur mobile
              </a>
            </div>
          </div>
        ) : (
          <div className="pricing-enterprise-redirect">
            <div className="pricing-card glass-card popular" style={{ maxWidth: 520, margin: '0 auto' }}>
              <div className="popular-tag">Enterprise</div>
              <h3>Enterprise</h3>
              <div className="price">{formatPrice(pricingData.enterprise, pricingData.currency)} <span>{t('pricing.month')}</span></div>
              <ul className="pricing-features">
                <li><span className="check-icon">OK</span> App web back-office</li>
                <li><span className="check-icon">OK</span> Mobile terrain inclus pour les equipes</li>
                <li><span className="check-icon">OK</span> Multi-boutiques et staff illimites</li>
                <li><span className="check-icon">OK</span> Dashboard, POS, CRM et comptabilite web</li>
                <li><span className="check-icon">OK</span> Analyses avancees par activite</li>
              </ul>
              <div className="section-cta-row">
                <a
                  href={ENTERPRISE_FEATURES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ display: 'block', textAlign: 'center' }}
                >
                  Voir l&apos;app web Enterprise
                </a>
                <a
                  href={ENTERPRISE_SIGNUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ display: 'block', textAlign: 'center' }}
                >
                  Creer mon compte
                </a>
              </div>
            </div>
          </div>
        )}
      </section>

      <Newsletter />

      <ContactSection />

      <section className="container reveal">
        <div className="faq-section">
          <div className="section-title">
            <h2>{t('faq.title')}</h2>
          </div>
          {[1, 2, 3, 4, 5].map((i) => {
            const q = t(`faq.q${i}`);
            const a = t(`faq.a${i}`);
            if (!q || q === `faq.q${i}`) return null;
            return (
              <div key={i} className="glass-card faq-item">
                <h3>{q}</h3>
                <p>{a}</p>
              </div>
            );
          })}
        </div>

        <div className="download-banner reveal">
          <h2>Demarrez par le bon point d&apos;entree</h2>
          <p>
            Commencez sur mobile pour gerer votre boutique au quotidien, ou passez par Enterprise si vous avez besoin
            d&apos;un poste de pilotage web pour votre organisation.
          </p>
          <div className="download-buttons">
            <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer" className="store-btn">
              App mobile
            </a>
            <a href={ENTERPRISE_FEATURES_URL} target="_blank" rel="noopener noreferrer" className="store-btn">
              App web Enterprise
            </a>
          </div>
          <div className="trust-badges">
            <div className="badge">Mobile terrain</div>
            <div className="badge">Web Enterprise</div>
            <div className="badge">Business types couverts</div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function App() {
  const { i18n } = useTranslation();
  return (
    <HelmetProvider>
      <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
        <Router>
          <Analytics />
          <CookieBanner />
          <WhatsAppButton />

          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/enterprise" element={<EnterprisePage />} />
            <Route path="/business-types" element={<BusinessTypesPage />} />
            <Route path="/admin-leads" element={<AdminLeads />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/delete-account" element={<DeleteAccount />} />
            <Route
              path="/dashboard"
              element={<FeaturePage featureKey="dashboard" icon="Dashboard" galleryKeys={["kpi", "stats", "charts", "analysis", "history"]} />}
            />
            <Route
              path="/products"
              element={<FeaturePage featureKey="products" icon="Produits" screenshot="/assets/screenshots/products-list.jpg" galleryKeys={["list", "create", "variants", "thresholds"]} />}
            />
            <Route
              path="/pos"
              element={<FeaturePage featureKey="pos" icon="POS" screenshot="/assets/screenshots/pos-overview.jpg" galleryKeys={["sale", "receipt"]} />}
            />
            <Route
              path="/suppliers"
              element={<FeaturePage featureKey="suppliers" icon="Fournisseurs" screenshot="/assets/screenshots/suppliers-marketplace.jpg" galleryKeys={["marketplace", "catalog", "order"]} />}
            />
            <Route
              path="/orders"
              element={<FeaturePage featureKey="orders" icon="Commandes" screenshot="/assets/screenshots/orders-tracking.jpg" galleryKeys={["tracking"]} />}
            />
            <Route
              path="/accounting"
              element={<FeaturePage featureKey="accounting" icon="Comptabilite" screenshot="/assets/screenshots/accounting-overview.jpg" galleryKeys={["overview", "expenses", "reports"]} />}
            />
            <Route
              path="/clients"
              element={<FeaturePage featureKey="clients" icon="Clients" screenshot="/assets/screenshots/clients-details.jpg" galleryKeys={["details", "campaigns"]} />}
            />
            <Route
              path="/settings"
              element={<FeaturePage featureKey="settings" icon="Reglages" screenshot="/assets/screenshots/settings-support-security.jpg" galleryKeys={["team", "notifications", "security", "guide"]} />}
            />
          </Routes>
        </Router>
      </div>
    </HelmetProvider>
  );
}

export default App;
