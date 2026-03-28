import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ENTERPRISE_FEATURES_URL } from '../../data/marketing';

const WebAppShowcase: React.FC = () => {
    const { t } = useTranslation();
    const sectionRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (sectionRef.current) {
            sectionRef.current.classList.add('revealed');
        }
    }, []);

    const advantages = [
        { key: 'f1', icon: '💻' },
        { key: 'f2', icon: '📲' },
        { key: 'f3', icon: '✨' },
        { key: 'f4', icon: '📊' }
    ];

    return (
        <section ref={sectionRef} className="web-app-showcase container reveal reveal-bottom">
            <div className="section-title">
                <span className="badge-premium">{t('web_app.secure')}</span>
                <h2 className="text-gradient" style={{ marginTop: '1rem' }}>{t('web_app.title')}</h2>
                <p className="text-muted">{t('web_app.subtitle')}</p>
            </div>

            <div className="showcase-content">
                <div className="advantages-grid">
                    {advantages.map((adv) => (
                        <div key={adv.key} className="advantage-card glass-card">
                            <div className="adv-icon">{adv.icon}</div>
                            <div className="adv-text">
                                <h3>{t(`web_app.${adv.key}_title`)}</h3>
                                <p>{t(`web_app.${adv.key}_desc`)}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="web-mockup-area glass-card">
                    <div className="mockup-header">
                        <div className="dots">
                            <span className="dot red"></span>
                            <span className="dot yellow"></span>
                            <span className="dot green"></span>
                        </div>
                        <div className="mockup-address-bar">{ENTERPRISE_FEATURES_URL}</div>
                    </div>
                    <div className="mockup-screen">
                        <img
                            src="/assets/screenshots/stockman-enterprise-preview.png"
                            alt="Stockman Enterprise Dashboard"
                            className="mockup-image"
                        />
                        <div className="mockup-overlay">
                            <a href={ENTERPRISE_FEATURES_URL} target="_blank" rel="noopener noreferrer" className="btn-primary btn-large glow">
                                {t('web_app.cta')}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WebAppShowcase;
