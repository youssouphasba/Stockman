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

import ComparisonTable from './components/ComparisonTable';
import CookieBanner from './components/CookieBanner';
import WhatsAppButton from './components/WhatsAppButton';
import Newsletter from './components/Newsletter';
import LanguageSwitcher from './components/LanguageSwitcher';
import SEO from './components/SEO';
import ContactSection from './components/ContactSection';
import Analytics from './components/Analytics';
import AdminLeads from './components/AdminLeads';
import Hero, { type Profile } from './components/landing/Hero';
import Features from './components/landing/Features';

import WebAppShowcase from './components/landing/WebAppShowcase';
import { useScrollReveal } from './hooks/useScrollReveal';
import './App.css'

import { detectRegion, getPricingByRegion, formatPrice } from './utils/pricing';

function Landing() {
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile>('merchant');
  useScrollReveal();

  // Re-déclenche le reveal pour les éléments apparus dynamiquement lors du switch de profil
  useEffect(() => {
    const timer = setTimeout(() => {
      document.querySelectorAll('.reveal:not(.revealed)').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 200) {
          el.classList.add('revealed');
        }
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [profile]);

  // Détection de région par timezone navigateur (une seule fois au montage)
  const [pricingData] = useState(() => getPricingByRegion(detectRegion()));

  const testimonials = [
    { key: 't1', author: t('testimonials.t1_author'), job: t('testimonials.t1_job'), avatar: 'A' },
    { key: 't2', author: t('testimonials.t2_author'), job: t('testimonials.t2_job'), avatar: 'S' },
    { key: 't3', author: t('testimonials.t3_author'), job: t('testimonials.t3_job'), avatar: 'P' },
  ];

  return (
    <div className="landing-page">
      <SEO
        title={t('hero.title_start') + ' ' + t('hero.title_end')}
        description={t('hero.subtitle')}
      />
      <nav className="navbar">
        <div className="container nav-container">
          <div className="logo">
            <span className="text-gradient">Stockman</span>
          </div>
          <button className={`hamburger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span /><span /><span />
          </button>
          <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
            <button className="mobile-menu-close" onClick={() => setMenuOpen(false)} aria-label="Fermer">✕</button>
            <div className="mobile-menu-header">
              <span className="text-gradient" style={{ fontSize: '1.3rem', fontWeight: 800 }}>Stockman</span>
            </div>
            {/* Desktop-only links */}
            <a href="#features" className="nav-link desktop-only" onClick={() => setMenuOpen(false)}>{t('nav.features')}</a>
            <a href="https://app.stockman.pro/features" target="_blank" rel="noopener noreferrer" className="nav-link desktop-only" onClick={() => setMenuOpen(false)}>Fonctionnalités Enterprise</a>
            <Link to="/blog" className="nav-link desktop-only" onClick={() => setMenuOpen(false)}>{t('nav.blog')}</Link>
            {/* Mobile-only sections */}
            <div className="mobile-menu-section">
              <span className="mobile-menu-label">{t('nav.features')}</span>
              <Link to="/dashboard" className="nav-link" onClick={() => setMenuOpen(false)}>🏠 {t('feature_pages.dashboard.title')}</Link>
              <Link to="/products" className="nav-link" onClick={() => setMenuOpen(false)}>📦 {t('feature_pages.products.title')}</Link>
              <Link to="/pos" className="nav-link" onClick={() => setMenuOpen(false)}>🧮 {t('feature_pages.pos.title')}</Link>
              <Link to="/accounting" className="nav-link" onClick={() => setMenuOpen(false)}>📊 {t('feature_pages.accounting.title')}</Link>
              <Link to="/suppliers" className="nav-link" onClick={() => setMenuOpen(false)}>🚚 {t('feature_pages.suppliers.title')}</Link>
              <Link to="/orders" className="nav-link" onClick={() => setMenuOpen(false)}>📝 {t('feature_pages.orders.title')}</Link>
              <Link to="/clients" className="nav-link" onClick={() => setMenuOpen(false)}>👥 {t('feature_pages.clients.title')}</Link>
              <Link to="/settings" className="nav-link" onClick={() => setMenuOpen(false)}>⚙️ {t('feature_pages.settings.title')}</Link>
            </div>
            <div className="mobile-menu-section">
              <span className="mobile-menu-label">{t('nav.resources')}</span>
              <a href="#pricing" className="nav-link" onClick={() => setMenuOpen(false)}>💰 {t('pricing.title')}</a>
              <Link to="/blog" className="nav-link" onClick={() => setMenuOpen(false)}>📰 {t('nav.blog')}</Link>
              <Link to="/about" className="nav-link" onClick={() => setMenuOpen(false)}>💡 {t('about.seo_title')}</Link>
              <Link to="/help" className="nav-link" onClick={() => setMenuOpen(false)}>❓ {t('footer.help_center')}</Link>
            </div>
            <div className="mobile-menu-section">
              <span className="mobile-menu-label">{t('footer.legal')}</span>
              <Link to="/terms" className="nav-link" onClick={() => setMenuOpen(false)}>📜 {t('footer.terms')}</Link>
              <Link to="/privacy" className="nav-link" onClick={() => setMenuOpen(false)}>🔒 {t('footer.privacy')}</Link>
            </div>
            <div className="mobile-menu-section">
              <LanguageSwitcher />
            </div>
            <a href="#contact" className="btn-secondary nav-login" onClick={() => setMenuOpen(false)}>{t('nav.login')}</a>
            <a href="#contact" className="btn-primary" onClick={() => setMenuOpen(false)}>{t('nav.free_trial')}</a>
          </div>
          {menuOpen && <div className="nav-overlay" onClick={() => setMenuOpen(false)} />}
        </div>
      </nav>

      <Hero profile={profile} onProfileChange={setProfile} />

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
          <h2>{t('how_it_works.title')}</h2>
          <p className="text-muted">{t('how_it_works.subtitle')}</p>
        </div>
        <div className="steps-grid">
          <div className="step-card glass-card">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>{t('how_it_works.step1.title')}</h3>
              <p>{t('how_it_works.step1.desc')}</p>
            </div>
          </div>
          <div className="step-card glass-card">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>{t('how_it_works.step2.title')}</h3>
              <p>{t('how_it_works.step2.desc')}</p>
            </div>
          </div>
          <div className="step-card glass-card">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>{t('how_it_works.step3.title')}</h3>
              <p>{t('how_it_works.step3.desc')}</p>
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
          <h2>{profile === 'enterprise' ? 'Une solution taillée pour votre ambition' : t('pricing.title')}</h2>
          <p className="text-muted">{profile === 'enterprise' ? 'Back-office web + application mobile inclus dans chaque licence Enterprise.' : t('pricing.subtitle')}</p>
          {/* Badge devise détectée */}
          <div className="pricing-currency-badge">
            <span>{pricingData.useMobileMoney ? '📱' : '💳'}</span>
            <span>
              Prix en <strong>{pricingData.currency}</strong>
              {' · '}
              {pricingData.useMobileMoney ? 'Orange Money · Wave · MTN' : 'Visa · Mastercard · Stripe'}
            </span>
          </div>
        </div>

        {profile === 'merchant' ? (
          <div className="pricing-grid pricing-grid--mobile">
            <div className="pricing-card glass-card">
              <h3>{t('pricing.starter.name')}</h3>
              <div className="price">{formatPrice(pricingData.starter, pricingData.currency)} <span>{t('pricing.month')}</span></div>
              <ul className="pricing-features">
                <li><span className="check-icon">✓</span> {t('pricing.starter.f1')}</li>
                <li><span className="check-icon">✓</span> {t('pricing.starter.f2')}</li>
                <li><span className="check-icon">✓</span> {t('pricing.starter.f3')}</li>
                <li><span className="check-icon">✓</span> {t('pricing.starter.f4')}</li>
              </ul>
              <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)' }}>{t('pricing.starter.cta')}</button>
            </div>

            <div className="pricing-card glass-card popular">
              <div className="popular-tag">{t('pricing.popular')}</div>
              <h3>{t('pricing.business.name')}</h3>
              <div className="price">{formatPrice(pricingData.pro, pricingData.currency)} <span>{t('pricing.month')}</span></div>
              <ul className="pricing-features">
                <li><span className="check-icon">✓</span> {t('pricing.business.f1')}</li>
                <li><span className="check-icon">✓</span> {t('pricing.business.f2')}</li>
                <li><span className="check-icon">✓</span> {t('pricing.business.f3')}</li>
                <li><span className="check-icon">✓</span> {t('pricing.business.f4')}</li>
                <li><span className="check-icon">✓</span> {t('pricing.business.f5')}</li>
              </ul>
              <button className="btn-primary">{t('pricing.business.cta')}</button>
            </div>

            <div className="pricing-card-enterprise-teaser glass-card">
              <div className="enterprise-teaser-badge">🏢 Entreprise multi-sites ?</div>
              <p>Gérez plusieurs boutiques avec un back-office web complet, des rapports avancés et une gestion d'équipe dédiée.</p>
              <a
                href="https://app.stockman.pro/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ display: 'inline-block', marginTop: '0.5rem' }}
              >
                Voir le plan Enterprise →
              </a>
            </div>
          </div>
        ) : (
          <div className="pricing-enterprise-redirect">
            <div className="pricing-card glass-card popular" style={{ maxWidth: 480, margin: '0 auto' }}>
              <div className="popular-tag">🏢 Enterprise</div>
              <h3>{t('pricing.enterprise.name')}</h3>
              <div className="price">{formatPrice(pricingData.enterprise, pricingData.currency)} <span>{t('pricing.month')}</span></div>
              <ul className="pricing-features">
                <li><span className="check-icon">✓</span> {t('pricing.enterprise.f1')}</li>
                <li><span className="check-icon">✓</span> {t('pricing.enterprise.f2')}</li>
                <li><span className="check-icon">✓</span> {t('pricing.enterprise.f3')}</li>
                <li><span className="check-icon">✓</span> {t('pricing.enterprise.f4')}</li>
                <li><span className="check-icon">✓</span> {t('pricing.enterprise.f5')}</li>
                <li><span className="check-icon">✓</span> Application mobile incluse pour vos équipes terrain</li>
              </ul>
              <a
                href="https://app.stockman.pro/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ display: 'block', textAlign: 'center', marginTop: '1rem' }}
              >
                {pricingData.useMobileMoney ? 'Payer via Mobile Money →' : 'Démarrer l\'essai Enterprise →'}
              </a>
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
          {[1, 2, 3, 4, 5].map(i => {
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
            <a href="#contact" className="store-btn">
              <span></span> {t('download.app_store')}
            </a>
            <a href="#contact" className="store-btn">
              <span>▶</span> {t('download.google_play')}
            </a>
          </div>
          <div className="trust-badges">
            <div className="badge">🔒 {t('download.secure')}</div>
            <div className="badge">💼 {t('download.support')}</div>
            <div className="badge">🚀 {t('download.updates')}</div>
          </div>
        </div>
      </section>

      <footer id="contact">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <div className="logo" style={{ marginBottom: '20px' }}>
                <span className="text-gradient">Stockman</span>
              </div>
              <p className="text-muted">{t('footer.desc')}</p>
            </div>
            <div className="footer-col">
              <h4>{t('footer.product')}</h4>
              <ul>
                <li><a href="#features">{t('nav.features')}</a></li>
                <li><a href="#pricing">{t('pricing.title')}</a></li>
                <li><a href="#">{t('download.updates')}</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>{t('footer.support')}</h4>
              <ul>
                <li><Link to="/help">{t('footer.help_center')}</Link></li>
                <li><Link to="/help">{t('footer.contact')}</Link></li>
                <li><a href="#">{t('footer.community')}</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>{t('footer.legal')}</h4>
              <ul>
                <li><Link to="/privacy">{t('footer.privacy')}</Link></li>
                <li><Link to="/terms">{t('footer.terms')}</Link></li>
                <li><Link to="/delete-account">{t('footer.delete_account')}</Link></li>
                <li><a href="#">{t('footer.legal_notice')}</a></li>
              </ul>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '60px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {t('footer.copyright')}
          </div>
        </div>
      </footer>
    </div>
  )
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
            <Route path="/admin-leads" element={<AdminLeads />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/delete-account" element={<DeleteAccount />} />

            {/* Feature Routes */}
            <Route path="/dashboard" element={
              <FeaturePage featureKey="dashboard" icon="🏠" galleryKeys={["kpi", "stats", "charts", "analysis", "history"]} />
            } />
            <Route path="/products" element={
              <FeaturePage featureKey="products" icon="📦" screenshot="/assets/screenshots/products-list.jpg" galleryKeys={["list", "create", "variants", "thresholds"]} />
            } />
            <Route path="/pos" element={
              <FeaturePage featureKey="pos" icon="🧮" screenshot="/assets/screenshots/pos-overview.jpg" galleryKeys={["sale", "receipt"]} />
            } />
            <Route path="/suppliers" element={
              <FeaturePage featureKey="suppliers" icon="🚚" screenshot="/assets/screenshots/suppliers-marketplace.jpg" galleryKeys={["marketplace", "catalog", "order"]} />
            } />
            <Route path="/orders" element={
              <FeaturePage featureKey="orders" icon="📝" screenshot="/assets/screenshots/orders-tracking.jpg" galleryKeys={["tracking"]} />
            } />
            <Route path="/accounting" element={
              <FeaturePage featureKey="accounting" icon="📊" screenshot="/assets/screenshots/accounting-overview.jpg" galleryKeys={["overview", "expenses", "reports"]} />
            } />
            <Route path="/clients" element={
              <FeaturePage featureKey="clients" icon="👥" screenshot="/assets/screenshots/clients-details.jpg" galleryKeys={["details", "campaigns"]} />
            } />
            <Route path="/settings" element={
              <FeaturePage featureKey="settings" icon="⚙️" screenshot="/assets/screenshots/settings-support-security.jpg" galleryKeys={["team", "notifications", "security", "guide"]} />
            } />

          </Routes>
        </Router>
      </div>
    </HelmetProvider>
  )
}

export default App
