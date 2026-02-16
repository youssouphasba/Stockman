import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Features: React.FC = () => {
    const { t } = useTranslation();

    return (
        <section id="features" className="features container reveal">
            <div className="section-title">
                <h2>{t('features.title')}</h2>
                <p className="text-muted">{t('features.subtitle')}</p>
            </div>

            <div className="features-grid">
                <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                    <div className="feature-card glass-card">
                        <div className="feature-icon">🏠</div>
                        <h3>{t('features.dashboard.title')}</h3>
                        <p>{t('features.dashboard.desc')}</p>
                    </div>
                </Link>

                <Link to="/products" style={{ textDecoration: 'none' }}>
                    <div className="feature-card glass-card">
                        <div className="feature-icon">📦</div>
                        <h3>{t('features.products.title')}</h3>
                        <p>{t('features.products.desc')}</p>
                    </div>
                </Link>

                <Link to="/pos" style={{ textDecoration: 'none' }}>
                    <div className="feature-card glass-card">
                        <div className="feature-icon">🧮</div>
                        <h3>{t('features.pos.title')}</h3>
                        <p>{t('features.pos.desc')}</p>
                    </div>
                </Link>

                <Link to="/suppliers" style={{ textDecoration: 'none' }}>
                    <div className="feature-card glass-card">
                        <div className="feature-icon">🚚</div>
                        <h3>{t('features.suppliers.title')}</h3>
                        <p>{t('features.suppliers.desc')}</p>
                    </div>
                </Link>

                <Link to="/orders" style={{ textDecoration: 'none' }}>
                    <div className="feature-card glass-card">
                        <div className="feature-icon">📝</div>
                        <h3>{t('features.orders.title')}</h3>
                        <p>{t('features.orders.desc')}</p>
                    </div>
                </Link>

                <Link to="/accounting" style={{ textDecoration: 'none' }}>
                    <div className="feature-card glass-card">
                        <div className="feature-icon">📊</div>
                        <h3>{t('features.accounting.title')}</h3>
                        <p>{t('features.accounting.desc')}</p>
                    </div>
                </Link>

                <Link to="/clients" style={{ textDecoration: 'none' }}>
                    <div className="feature-card glass-card">
                        <div className="feature-icon">👥</div>
                        <h3>{t('features.clients.title')}</h3>
                        <p>{t('features.clients.desc')}</p>
                    </div>
                </Link>

                <Link to="/settings" style={{ textDecoration: 'none' }}>
                    <div className="feature-card glass-card">
                        <div className="feature-icon">⚙️</div>
                        <h3>{t('features.settings.title')}</h3>
                        <p>{t('features.settings.desc')}</p>
                    </div>
                </Link>
            </div>
        </section>
    );
};

export default Features;
