import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher';
import {
  APP_LOGIN_URL,
  ENTERPRISE_FEATURES_URL,
  LANDING_BUSINESS_TYPES_PATH,
  LANDING_DEMO_PATH,
  MOBILE_APP_URL,
} from '../../data/marketing';

type MarketingNavProps = {
  active?: 'home' | 'enterprise' | 'business-types' | 'demo';
};

export default function MarketingNav({ active }: MarketingNavProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <Link to="/" className="logo" style={{ textDecoration: 'none' }} onClick={closeMenu}>
          <span className="text-gradient">Stockman</span>
        </Link>

        <button
          className={`hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <button className="mobile-menu-close" onClick={closeMenu} aria-label={t('nav.close')}>x</button>
          <div className="mobile-menu-header">
            <span className="text-gradient" style={{ fontSize: '1.3rem', fontWeight: 800 }}>Stockman</span>
          </div>

          <Link
            to="/"
            className={`nav-link desktop-only${active === 'home' ? ' nav-link-active' : ''}`}
            onClick={closeMenu}
          >
            {t('nav.home')}
          </Link>
          <Link
            to={LANDING_BUSINESS_TYPES_PATH}
            className={`nav-link desktop-only${active === 'business-types' ? ' nav-link-active' : ''}`}
            onClick={closeMenu}
          >
            {t('nav.business_types')}
          </Link>
          <Link
            to="/enterprise"
            className={`nav-link desktop-only${active === 'enterprise' ? ' nav-link-active' : ''}`}
            onClick={closeMenu}
          >
            {t('nav.enterprise')}
          </Link>
          <Link
            to={LANDING_DEMO_PATH}
            className={`nav-link desktop-only${active === 'demo' ? ' nav-link-active' : ''}`}
            onClick={closeMenu}
          >
            {t('nav.demo')}
          </Link>
          <a
            href={ENTERPRISE_FEATURES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link desktop-only"
            onClick={closeMenu}
          >
            {t('nav.web_app')}
          </a>
          <Link to="/blog" className="nav-link desktop-only" onClick={closeMenu}>{t('nav.blog')}</Link>

          <div className="mobile-menu-section">
            <span className="mobile-menu-label">{t('nav.paths')}</span>
            <Link to="/" className="nav-link" onClick={closeMenu}>{t('nav.home')}</Link>
            <Link to="/enterprise" className="nav-link" onClick={closeMenu}>{t('nav.enterprise')}</Link>
            <Link to={LANDING_BUSINESS_TYPES_PATH} className="nav-link" onClick={closeMenu}>{t('nav.business_types')}</Link>
            <Link to={LANDING_DEMO_PATH} className="nav-link" onClick={closeMenu}>{t('nav.demo')}</Link>
          </div>

          <div className="mobile-menu-section">
            <span className="mobile-menu-label">{t('nav.access')}</span>
            <a href={ENTERPRISE_FEATURES_URL} target="_blank" rel="noopener noreferrer" className="nav-link" onClick={closeMenu}>
              {t('nav.view_web_app')}
            </a>
            <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer" className="nav-link" onClick={closeMenu}>
              {t('nav.open_mobile_app')}
            </a>
            <a href={APP_LOGIN_URL} target="_blank" rel="noopener noreferrer" className="nav-link" onClick={closeMenu}>
              {t('nav.login')}
            </a>
          </div>

          <div className="mobile-menu-section">
            <LanguageSwitcher />
          </div>

          <a href={APP_LOGIN_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary nav-login" onClick={closeMenu}>
            {t('nav.login')}
          </a>
          <Link to="/enterprise" className="btn-primary" onClick={closeMenu}>
            {t('nav.try_enterprise')}
          </Link>
        </div>

        {menuOpen && <div className="nav-overlay" onClick={closeMenu} />}
      </div>
    </nav>
  );
}
