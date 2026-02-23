import React from 'react';
import { useTranslation } from 'react-i18next';

const WebAppShowcase: React.FC = () => {
    const { t } = useTranslation();

    const advantages = [
        { key: 'f1', icon: '💻' },
        { key: 'f2', icon: '📲' },
        { key: 'f3', icon: '✨' },
        { key: 'f4', icon: '📊' }
    ];

    return (
        <section className="web-app-showcase container reveal reveal-bottom">
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
                        <div className="mockup-address-bar">https://app.stockman.pro</div>
                    </div>
                    <div className="mockup-screen">
                        <img
                            src="/assets/screenshots/dashboard-kpi.jpg"
                            alt="Stockman Web Dashboard"
                            className="mockup-image"
                        />
                        <div className="mockup-overlay">
                            <a href="https://app.stockman.pro" target="_blank" rel="noopener noreferrer" className="btn-primary btn-large glow">
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
