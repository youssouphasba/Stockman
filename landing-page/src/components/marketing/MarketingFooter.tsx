import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  APP_LOGIN_URL,
  ENTERPRISE_FEATURES_URL,
  LANDING_BUSINESS_TYPES_PATH,
  MOBILE_APP_URL,
} from '../../data/marketing';

export default function MarketingFooter() {
  const { t } = useTranslation();

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
            <h4>{t('marketing_footer.product')}</h4>
            <ul>
              <li><Link to="/enterprise">{t('marketing_footer.enterprise_link')}</Link></li>
              <li><Link to={LANDING_BUSINESS_TYPES_PATH}>{t('marketing_footer.business_types_link')}</Link></li>
              <li><a href={ENTERPRISE_FEATURES_URL} target="_blank" rel="noopener noreferrer">{t('marketing_footer.web_app_link')}</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>{t('marketing_footer.access')}</h4>
            <ul>
              <li><a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer">{t('marketing_footer.mobile_app')}</a></li>
              <li><a href={APP_LOGIN_URL} target="_blank" rel="noopener noreferrer">{t('marketing_footer.login')}</a></li>
              <li><Link to="/blog">{t('marketing_footer.blog')}</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>{t('marketing_footer.legal')}</h4>
            <ul>
              <li><Link to="/privacy">{t('marketing_footer.privacy')}</Link></li>
              <li><Link to="/terms">{t('marketing_footer.terms')}</Link></li>
              <li><Link to="/delete-account">{t('marketing_footer.delete_account')}</Link></li>
              <li><Link to="/help">{t('marketing_footer.help')}</Link></li>
            </ul>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '60px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {t('marketing_footer.copyright')}
        </div>
      </div>
    </footer>
  );
}
