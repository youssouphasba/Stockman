import React from 'react';
import { useTranslation } from 'react-i18next';

const Hero: React.FC = () => {
    const { t } = useTranslation();

    return (
        <header className="hero reveal">
            <div className="container hero-container">
                <div className="hero-content">
                    <h1>{t('hero.title_start')} <span className="text-gradient">{t('hero.title_end')}</span></h1>
                    <p>{t('hero.subtitle')}</p>
                    <div className="hero-btns">
                        <button className="btn-primary">{t('hero.cta')}</button>
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
