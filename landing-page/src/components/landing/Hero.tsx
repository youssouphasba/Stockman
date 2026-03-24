import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  LANDING_BUSINESS_TYPES_PATH,
  LANDING_DEMO_PATH,
  MOBILE_APP_URL,
} from '../../data/marketing';

const Hero: React.FC = () => {
  const { t } = useTranslation();

  return (
    <header className="hero reveal">
      <div className="container hero-container">
        <div className="hero-content">
          <div className="profile-selector">
            <p className="profile-selector-label">{t('marketing_hero.choose_path')}</p>
            <div className="profile-selector-options">
              <div className="profile-option active">
                <span className="profile-chip">{t('marketing_hero.merchant_chip')}</span>
                <strong>{t('marketing_hero.merchant_title')}</strong>
                <span>{t('marketing_hero.merchant_desc')}</span>
              </div>
              <Link
                to="/enterprise"
                className="profile-option"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <span className="profile-chip">{t('marketing_hero.enterprise_chip')}</span>
                <strong>{t('marketing_hero.enterprise_title')}</strong>
                <span>{t('marketing_hero.enterprise_desc')}</span>
              </Link>
            </div>
          </div>

          <div>
            <h1>
              {t('marketing_hero.merchant_h1')}
              <br />
              <span className="text-gradient">{t('marketing_hero.merchant_h1_gradient')}</span>
            </h1>
            <p>{t('marketing_hero.merchant_subtitle')}</p>
            <div className="hero-btns">
              <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
                {t('marketing_hero.merchant_download')}
              </a>
              <Link to={LANDING_DEMO_PATH} className="btn-secondary">{t('marketing_hero.merchant_demo')}</Link>
            </div>
            <div className="enterprise-inline-links">
              <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer">{t('marketing_hero.merchant_mobile')}</a>
              <span>•</span>
              <Link to={LANDING_BUSINESS_TYPES_PATH}>{t('marketing_hero.merchant_sectors')}</Link>
            </div>
          </div>
        </div>

        <div className="hero-image-container">
          <div
            className="hero-image-placeholder glass-card"
            style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <img
              src="/stockman_landing_hero.png"
              alt="Stockman app mobile et web"
              className="hero-image"
              fetchPriority="high"
              loading="eager"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Hero;
