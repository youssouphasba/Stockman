import { useState } from 'react';
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
import ComparisonTable from './components/ComparisonTable';
import CookieBanner from './components/CookieBanner';
import WhatsAppButton from './components/WhatsAppButton';
import Newsletter from './components/Newsletter';
import LanguageSwitcher from './components/LanguageSwitcher';
import SEO from './components/SEO';
import ContactSection from './components/ContactSection';
import Analytics from './components/Analytics';
import AdminLeads from './components/AdminLeads';
import Hero from './components/landing/Hero';
import Features from './components/landing/Features';
import Showcase from './components/landing/Showcase';
import { useScrollReveal } from './hooks/useScrollReveal';
import './App.css'

function Landing() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  useScrollReveal();

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
            <Link to="/blog" className="nav-link desktop-only" onClick={() => setMenuOpen(false)}>{t('nav.resources')}</Link>
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
              <Link to="/blog" className="nav-link" onClick={() => setMenuOpen(false)}>📰 Blog</Link>
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

      <Hero />

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

      <Features />

      <Showcase />

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
          <div className="testimonial-card glass-card">
            <p>"{t('testimonials.t1')}"</p>
            <div className="testimonial-author">
              <div className="author-avatar">A</div>
              <div>
                <strong>Amadou Diallo</strong>
                <p style={{ fontSize: '0.8rem', margin: 0 }}>Boutique Électronique</p>
              </div>
            </div>
          </div>
          <div className="testimonial-card glass-card">
            <p>"{t('testimonials.t2')}"</p>
            <div className="testimonial-author">
              <div className="author-avatar">S</div>
              <div>
                <strong>Sarah Kouassi</strong>
                <p style={{ fontSize: '0.8rem', margin: 0 }}>Supermarché Express</p>
              </div>
            </div>
          </div>
          <div className="testimonial-card glass-card">
            <p>"{t('testimonials.t3')}"</p>
            <div className="testimonial-author">
              <div className="author-avatar">P</div>
              <div>
                <strong>Paul N'Goma</strong>
                <p style={{ fontSize: '0.8rem', margin: 0 }}>Pharmacie Centrale</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="pricing container reveal">
        <div className="section-title">
          <h2>{t('pricing.title')}</h2>
          <p className="text-muted">{t('pricing.subtitle')}</p>
        </div>

        <div className="pricing-grid">
          <div className="pricing-card glass-card">
            <h3>{t('pricing.starter.name')}</h3>
            <div className="price">{t('pricing.starter.price')} <span className="currency">FCFA</span><span>{t('pricing.month')}</span></div>
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
            <div className="price">{t('pricing.business.price')} <span className="currency">FCFA</span><span>{t('pricing.month')}</span></div>
            <ul className="pricing-features">
              <li><span className="check-icon">✓</span> {t('pricing.business.f1')}</li>
              <li><span className="check-icon">✓</span> {t('pricing.business.f2')}</li>
              <li><span className="check-icon">✓</span> {t('pricing.business.f3')}</li>
              <li><span className="check-icon">✓</span> {t('pricing.business.f4')}</li>
              <li><span className="check-icon">✓</span> {t('pricing.business.f5')}</li>
            </ul>
            <button className="btn-primary">{t('pricing.business.cta')}</button>
          </div>

          <div className="pricing-card glass-card">
            <h3>{t('pricing.enterprise.name')}</h3>
            <div className="price">{t('pricing.enterprise.price')}<span></span></div>
            <ul className="pricing-features">
              <li><span className="check-icon">✓</span> {t('pricing.enterprise.f1')}</li>
              <li><span className="check-icon">✓</span> {t('pricing.enterprise.f2')}</li>
              <li><span className="check-icon">✓</span> {t('pricing.enterprise.f3')}</li>
              <li><span className="check-icon">✓</span> {t('pricing.enterprise.f4')}</li>
              <li><span className="check-icon">✓</span> {t('pricing.enterprise.f5')}</li>
            </ul>
            <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)' }}>{t('pricing.enterprise.cta')}</button>
          </div>
        </div>
      </section>

      <Newsletter />

      <ContactSection />

      <section className="container reveal">
        <div className="faq-section">
          <div className="section-title">
            <h2>{t('faq.title')}</h2>
          </div>
          <div className="glass-card faq-item">
            <h3>{t('faq.q1')}</h3>
            <p>{t('faq.a1')}</p>
          </div>
          <div className="glass-card faq-item">
            <h3>{t('faq.q2')}</h3>
            <p>{t('faq.a2')}</p>
          </div>
        </div>

        <div className="download-banner reveal">
          <h2>{t('download.title')}</h2>
          <p>{t('download.subtitle')}</p>
          <div className="download-buttons">
            <a href="#contact" className="store-btn">
              <span></span> App Store
            </a>
            <a href="#contact" className="store-btn">
              <span>▶</span> Google Play
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
