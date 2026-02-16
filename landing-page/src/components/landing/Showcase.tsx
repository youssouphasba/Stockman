import React from 'react';
import { useTranslation } from 'react-i18next';

const Showcase: React.FC = () => {
    const { t } = useTranslation();

    return (
        <section id="showcase" className="showcase reveal">
            <div className="container">
                <div className="section-title">
                    <h2>{t('showcase.title')}</h2>
                    <p className="text-muted">{t('showcase.subtitle')}</p>
                </div>
                <div className="phone-mockup">
                    <div className="phone-notch"></div>
                    <div style={{ width: '100%', height: '600px', background: '#1A1C23', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
                        <img
                            src="/stockman_mockup.png"
                            alt="Stockman Interface"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                        <div className="placeholder-content" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '40px' }}>📱</div>
                            <div style={{ color: '#fff', opacity: 0.5 }}>{t('showcase.app_interface')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Showcase;
