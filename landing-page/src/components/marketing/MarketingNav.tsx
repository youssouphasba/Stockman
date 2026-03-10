import { useState } from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from '../LanguageSwitcher';
import {
  APP_LOGIN_URL,
  ENTERPRISE_FEATURES_URL,
  LANDING_BUSINESS_TYPES_PATH,
  MOBILE_APP_URL,
} from '../../data/marketing';

type MarketingNavProps = {
  active?: 'home' | 'enterprise' | 'business-types';
};

export default function MarketingNav({ active }: MarketingNavProps) {
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
          <button className="mobile-menu-close" onClick={closeMenu} aria-label="Fermer">x</button>
          <div className="mobile-menu-header">
            <span className="text-gradient" style={{ fontSize: '1.3rem', fontWeight: 800 }}>Stockman</span>
          </div>

          <Link
            to="/"
            className={`nav-link desktop-only${active === 'home' ? ' nav-link-active' : ''}`}
            onClick={closeMenu}
          >
            Accueil
          </Link>
          <Link
            to={LANDING_BUSINESS_TYPES_PATH}
            className={`nav-link desktop-only${active === 'business-types' ? ' nav-link-active' : ''}`}
            onClick={closeMenu}
          >
            Business types
          </Link>
          <Link
            to="/enterprise"
            className={`nav-link desktop-only${active === 'enterprise' ? ' nav-link-active' : ''}`}
            onClick={closeMenu}
          >
            Enterprise
          </Link>
          <a
            href={ENTERPRISE_FEATURES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link desktop-only"
            onClick={closeMenu}
          >
            App web
          </a>
          <Link to="/blog" className="nav-link desktop-only" onClick={closeMenu}>Blog</Link>

          <div className="mobile-menu-section">
            <span className="mobile-menu-label">Parcours</span>
            <Link to="/" className="nav-link" onClick={closeMenu}>Accueil</Link>
            <Link to="/enterprise" className="nav-link" onClick={closeMenu}>Enterprise</Link>
            <Link to={LANDING_BUSINESS_TYPES_PATH} className="nav-link" onClick={closeMenu}>Business types</Link>
          </div>

          <div className="mobile-menu-section">
            <span className="mobile-menu-label">Acces</span>
            <a href={ENTERPRISE_FEATURES_URL} target="_blank" rel="noopener noreferrer" className="nav-link" onClick={closeMenu}>
              Voir l'app web
            </a>
            <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer" className="nav-link" onClick={closeMenu}>
              Ouvrir l'app mobile
            </a>
            <a href={APP_LOGIN_URL} target="_blank" rel="noopener noreferrer" className="nav-link" onClick={closeMenu}>
              Connexion
            </a>
          </div>

          <div className="mobile-menu-section">
            <LanguageSwitcher />
          </div>

          <a href={APP_LOGIN_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary nav-login" onClick={closeMenu}>
            Se connecter
          </a>
          <Link to="/enterprise" className="btn-primary" onClick={closeMenu}>
            Essayer Enterprise
          </Link>
        </div>

        {menuOpen && <div className="nav-overlay" onClick={closeMenu} />}
      </div>
    </nav>
  );
}
