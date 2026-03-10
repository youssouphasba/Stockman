import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ENTERPRISE_FEATURES_URL,
  LANDING_BUSINESS_TYPES_PATH,
  MOBILE_APP_URL,
} from '../../data/marketing';

export type Profile = 'merchant' | 'enterprise';

interface HeroProps {
  profile: Profile;
  onProfileChange: (p: Profile) => void;
}

const Hero: React.FC<HeroProps> = ({ profile, onProfileChange }) => {
  const { t } = useTranslation();

  return (
    <header className="hero reveal">
      <div className="container hero-container">
        <div className="hero-content">
          <div className="profile-selector">
            <p className="profile-selector-label">Je suis...</p>
            <div className="profile-selector-options">
              <button
                className={`profile-option${profile === 'merchant' ? ' active' : ''}`}
                onClick={() => onProfileChange('merchant')}
              >
                <span className="profile-icon">Boutique</span>
                <strong>Commercant</strong>
                <span>Je gere ma boutique depuis le telephone.</span>
              </button>
              <button
                className={`profile-option${profile === 'enterprise' ? ' active' : ''}`}
                onClick={() => onProfileChange('enterprise')}
              >
                <span className="profile-icon">Enterprise</span>
                <strong>Entreprise</strong>
                <span>Je pilote plusieurs equipes, boutiques ou activites.</span>
              </button>
            </div>
          </div>

          <div key={profile}>
            {profile === 'merchant' ? (
              <>
                <h1>{t('hero.title_start')} <span className="text-gradient">{t('hero.title_end')}</span></h1>
                <p>{t('hero.subtitle')}</p>
                <div className="hero-btns">
                  <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
                    Demarrer sur mobile
                  </a>
                  <a href="#pricing" className="btn-secondary">{t('hero.see_pricing')}</a>
                </div>
                <div className="enterprise-inline-links">
                  <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer">Application mobile</a>
                  <span>•</span>
                  <a href={LANDING_BUSINESS_TYPES_PATH}>Voir les business types</a>
                </div>
              </>
            ) : (
              <>
                <h1>
                  Le back-office web <span className="text-gradient">Enterprise</span>
                  <br />
                  pour piloter votre activite
                </h1>
                <p>
                  Stockman combine application web Enterprise et mobile terrain pour la gestion
                  multi-boutiques, l&apos;equipe, la comptabilite, le CRM et les analyses avancees.
                </p>
                <div className="hero-btns">
                  <a href="/enterprise" className="btn-primary">Decouvrir Enterprise</a>
                  <a href={ENTERPRISE_FEATURES_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                    Voir l&apos;app web
                  </a>
                </div>
                <div className="enterprise-inline-links">
                  <a href={ENTERPRISE_FEATURES_URL} target="_blank" rel="noopener noreferrer">Modules Enterprise</a>
                  <span>•</span>
                  <a href={LANDING_BUSINESS_TYPES_PATH}>Business types</a>
                </div>
              </>
            )}
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
