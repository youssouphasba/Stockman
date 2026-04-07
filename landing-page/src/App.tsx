import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import FeaturePage from './FeaturePage';
import TermsOfService from './TermsOfService';
import PrivacyPolicy from './PrivacyPolicy';
import HelpCenter from './HelpCenter';
import Blog from './Blog';
import BlogPost from './BlogPost';
import About from './About';
import DeleteAccount from './DeleteAccount';
import AppDownload from './AppDownload';
import EnterprisePage from './EnterprisePage';
import BusinessTypesPage from './BusinessTypesPage';
import DemoSelectorPage from './DemoSelectorPage';
import SupplierInvite from './SupplierInvite';

import CookieBanner from './components/CookieBanner';
import WhatsAppButton from './components/WhatsAppButton';
import SEO from './components/SEO';
import ContactSection from './components/ContactSection';
import Analytics from './components/Analytics';
import AdminLeads from './components/AdminLeads';
import Hero from './components/landing/Hero';
import Features from './components/landing/Features';
import MarketingNav from './components/marketing/MarketingNav';
import MarketingFooter from './components/marketing/MarketingFooter';
import { useScrollReveal } from './hooks/useScrollReveal';
import './App.css';

import { detectBrowserCountryCode, fetchPublicPricing, type PublicPricingResponse } from './utils/pricing';
import { COUNTRIES } from '../../shared/countries';
import {
  BUSINESS_TYPE_GROUPS,
  ENTERPRISE_FEATURES_URL,
  LANDING_KEYWORDS,
  MOBILE_APP_URL,
} from './data/marketing';

function Landing() {
  const { t } = useTranslation();
  const location = useLocation();
  useScrollReveal();

  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const id = location.hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    }
  }, [location]);

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
  }, []);

  const [selectedCountryCode, setSelectedCountryCode] = useState(() => detectBrowserCountryCode());
  const [pricingData, setPricingData] = useState<PublicPricingResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const data = await fetchPublicPricing(selectedCountryCode);
      if (!cancelled) {
        setPricingData(data);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedCountryCode]);

  // const testimonials = [
  //   { key: 't1', author: t('testimonials.t1_author'), job: t('testimonials.t1_job'), avatar: 'A' },
  //   { key: 't2', author: t('testimonials.t2_author'), job: t('testimonials.t2_job'), avatar: 'S' },
  //   { key: 't3', author: t('testimonials.t3_author'), job: t('testimonials.t3_job'), avatar: 'P' },
  // ];

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

      <Hero />

      <section className="container business-preview reveal">
        <div className="section-title">
          <h2>{t('business_preview.title')}</h2>
          <p className="text-muted">{t('business_preview.subtitle')}</p>
        </div>
        <div className="enterprise-grid">
          {BUSINESS_TYPE_GROUPS.map((group) => (
            <Link key={group.slug} to="/business-types" style={{ textDecoration: 'none' }}>
              <article className="glass-card enterprise-card business-preview-card">
                <p className="business-card-eyebrow">{group.title}</p>
                <h3>{t(`business_preview.${group.slug}_h3`)}</h3>
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

      {/* Stats section — hidden until real data is available
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
      */}



      <Features />

      {/* Testimonials section — hidden until real testimonials are collected
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
      */}

      <section className="demo-banner-section reveal" style={{ padding: 'var(--spacing-xl) 0' }}>
        <div className="container">
          <div className="glass-card demo-highlight-card" style={{ 
            padding: 'var(--spacing-xl) var(--spacing-lg)', 
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.1) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(var(--primary-rgb), 0.2)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
              {t('demo_banner.title', 'Essayez Stockman immédiatement')}
            </h2>
            <p className="text-muted" style={{ fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto 2rem' }}>
              {t('demo_banner.subtitle', "Testez l'application en conditions réelles avec nos bases de données de démonstration. Pas d'inscription requise, 100% gratuit.")}
            </p>
            <Link to="/demo" className="btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.2rem' }}>
              {t('demo_banner.cta', 'Lancer la Démo Interactive')}
            </Link>
          </div>
        </div>
      </section>

      <section id="pricing" className="pricing container reveal">
        <div className="section-title">
          <h2>{t('pricing.title')}</h2>
          <p className="text-muted">
            {t('pricing.subtitle')}
          </p>
          <div className="pricing-currency-switcher">
            <span className="pricing-currency-label">{t('pricing.currency_label')}</span>
            <div className="pricing-currency-tabs" style={{ minWidth: 280 }}>
              <select
                value={selectedCountryCode}
                onChange={(e) => setSelectedCountryCode(e.target.value)}
                className="currency-tab"
                style={{ width: '100%', textAlign: 'left' }}
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code} style={{ color: '#1e293b', backgroundColor: '#fff' }}>
                    {country.flag} {country.name} ({country.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

          <div className="pricing-grid pricing-grid--mobile">
            <div className="pricing-card glass-card">
              <h3>{t('pricing.starter.name')}</h3>
              <div className="price">{pricingData?.plans.starter.display_price || '…'} <span>{t('pricing.month')}</span></div>
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
                {t('pricing.starter_cta')}
              </a>
            </div>

            <div className="pricing-card glass-card popular">
              <div className="popular-tag">{t('pricing.popular')}</div>
              <h3>{t('pricing.business.name')}</h3>
              <div className="price">{pricingData?.plans.pro.display_price || '…'} <span>{t('pricing.month')}</span></div>
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
                {t('pricing.pro_cta')}
              </a>
            </div>
          </div>
      </section>

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
          <h2>{t('download.title')}</h2>
          <p>{t('download.subtitle')}</p>
          <div className="download-buttons">
            <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer" className="store-btn">
              {t('download.mobile_app')}
            </a>
            <a href={ENTERPRISE_FEATURES_URL} target="_blank" rel="noopener noreferrer" className="store-btn">
              {t('download.web_enterprise')}
            </a>
          </div>
          <div className="trust-badges">
            <div className="badge">{t('download.badge_mobile')}</div>
            <div className="badge">{t('download.badge_web')}</div>
            <div className="badge">{t('download.badge_business')}</div>
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
          <VercelAnalytics />
          <SpeedInsights />
          <CookieBanner />
          <WhatsAppButton />

          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/demo" element={<DemoSelectorPage />} />
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
            <Route path="/invite/supplier" element={<SupplierInvite />} />
            <Route path="/app" element={<AppDownload />} />
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
