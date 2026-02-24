import React from 'react';
import { useTranslation } from 'react-i18next';

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

                    {/* Profile Selector */}
                    <div className="profile-selector">
                        <p className="profile-selector-label">Je suis…</p>
                        <div className="profile-selector-options">
                            <button
                                className={`profile-option${profile === 'merchant' ? ' active' : ''}`}
                                onClick={() => onProfileChange('merchant')}
                            >
                                <span className="profile-icon">🏪</span>
                                <strong>Commerçant</strong>
                                <span>Je gère ma boutique depuis mon téléphone</span>
                            </button>
                            <button
                                className={`profile-option${profile === 'enterprise' ? ' active' : ''}`}
                                onClick={() => onProfileChange('enterprise')}
                            >
                                <span className="profile-icon">🏢</span>
                                <strong>Entreprise</strong>
                                <span>Je suis une entreprise multi équipes et j'ai besoin d'une solution complète</span>
                            </button>
                        </div>
                    </div>

                    <div key={profile}>
                        {profile === 'merchant' ? (
                            <>
                                <h1>{t('hero.title_start')} <span className="text-gradient">{t('hero.title_end')}</span></h1>
                                <p>{t('hero.subtitle')}</p>
                                <div className="hero-btns">
                                    <button className="btn-primary">{t('hero.cta')}</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h1>Pilotez la performance de <span className="text-gradient">votre business</span></h1>
                                <p>Un back-office web complet pour piloter votre entreprise, gérer vos équipes et vos finances et suivre vos clients.</p>
                                <div className="hero-btns">
                                    <a
                                        href="https://app.stockman.pro/features"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-primary"
                                    >
                                        Découvrir l'app web Enterprise →
                                    </a>
                                    <a
                                        href="https://app.stockman.pro/pricing"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-secondary"
                                    >
                                        Voir les tarifs
                                    </a>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="hero-image-container">
                    <div className="hero-image-placeholder glass-card" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                            src="/stockman_landing_hero.png"
                            alt="Stockman App"
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
