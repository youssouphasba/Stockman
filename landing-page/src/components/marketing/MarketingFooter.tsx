import { Link } from 'react-router-dom';
import {
  APP_LOGIN_URL,
  ENTERPRISE_FEATURES_URL,
  LANDING_BUSINESS_TYPES_PATH,
  MOBILE_APP_URL,
} from '../../data/marketing';

export default function MarketingFooter() {
  return (
    <footer id="contact">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="logo" style={{ marginBottom: '20px' }}>
              <span className="text-gradient">Stockman</span>
            </div>
            <p className="text-muted">
              Logiciel de gestion de stock, caisse POS et back-office web pour commerces, restaurants et entreprises.
            </p>
          </div>

          <div className="footer-col">
            <h4>Produit</h4>
            <ul>
              <li><Link to="/enterprise">Enterprise</Link></li>
              <li><Link to={LANDING_BUSINESS_TYPES_PATH}>Business types</Link></li>
              <li><a href={ENTERPRISE_FEATURES_URL} target="_blank" rel="noopener noreferrer">App web</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Acces</h4>
            <ul>
              <li><a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer">Application mobile</a></li>
              <li><a href={APP_LOGIN_URL} target="_blank" rel="noopener noreferrer">Connexion</a></li>
              <li><Link to="/blog">Blog</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><Link to="/privacy">Confidentialite</Link></li>
              <li><Link to="/terms">CGU</Link></li>
              <li><Link to="/delete-account">Supprimer mon compte</Link></li>
              <li><Link to="/help">Centre d'aide</Link></li>
            </ul>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '60px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          © 2026 Stockman. Tous droits reserves.
        </div>
      </div>
    </footer>
  );
}
