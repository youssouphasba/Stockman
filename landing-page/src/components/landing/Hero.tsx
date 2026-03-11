import React from 'react';
import {
  ENTERPRISE_FEATURES_URL,
  LANDING_BUSINESS_TYPES_PATH,
  LANDING_DEMO_PATH,
  MOBILE_APP_URL,
} from '../../data/marketing';

export type Profile = 'merchant' | 'enterprise';

interface HeroProps {
  profile: Profile;
  onProfileChange: (p: Profile) => void;
}

const Hero: React.FC<HeroProps> = ({ profile, onProfileChange }) => {
  return (
    <header className="hero reveal">
      <div className="container hero-container">
        <div className="hero-content">
          <div className="profile-selector">
            <p className="profile-selector-label">Choisissez votre parcours</p>
            <div className="profile-selector-options">
              <button
                className={`profile-option${profile === 'merchant' ? ' active' : ''}`}
                onClick={() => onProfileChange('merchant')}
              >
                <span className="profile-chip">Mobile</span>
                <strong>Je gere une boutique</strong>
                <span>Pour les commerces qui veulent aller vite au quotidien.</span>
              </button>
              <button
                className={`profile-option${profile === 'enterprise' ? ' active' : ''}`}
                onClick={() => onProfileChange('enterprise')}
              >
                <span className="profile-chip">Web + mobile</span>
                <strong>Je pilote une entreprise</strong>
                <span>Pour les entreprises qui veulent piloter sur ordinateur avec un vrai back-office web.</span>
              </button>
            </div>
          </div>

          <div key={profile}>
            {profile === 'merchant' ? (
              <>
                <h1>
                  Gerez votre boutique
                  <br />
                  <span className="text-gradient">plus simplement</span>
                </h1>
                <p>
                  Stock, ventes, caisse et suivi quotidien dans une application mobile pensee
                  pour les commerces qui veulent gagner du temps.
                </p>
                <div className="hero-btns">
                  <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
                    Telecharger l&apos;app
                  </a>
                  <a href={LANDING_DEMO_PATH} className="btn-secondary">Tester en mode Demo</a>
                </div>
                <div className="enterprise-inline-links">
                  <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer">Application mobile</a>
                  <span>•</span>
                  <a href={LANDING_BUSINESS_TYPES_PATH}>Secteurs couverts</a>
                </div>
              </>
            ) : (
              <>
                <h1>
                  Donnez a votre entreprise
                  <br />
                  un <span className="text-gradient">vrai poste de pilotage</span>
                </h1>
                <p>
                  L&apos;app web Enterprise vous aide a suivre vos boutiques, vos equipes,
                  votre stock, votre CRM et votre comptabilite sur ordinateur, pendant que le terrain reste sur mobile.
                </p>
                <div className="hero-btns">
                  <a href="/enterprise" className="btn-primary">Decouvrir Enterprise</a>
                  <a href={`${LANDING_DEMO_PATH}?type=enterprise`} className="btn-secondary">
                    Tester en mode Demo
                  </a>
                </div>
                <div className="enterprise-inline-links">
                  <a href={ENTERPRISE_FEATURES_URL} target="_blank" rel="noopener noreferrer">Modules Enterprise</a>
                  <span>•</span>
                  <a href={LANDING_BUSINESS_TYPES_PATH}>Secteurs couverts</a>
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
