
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './App.css';

interface FeaturePageProps {
    featureKey: string;
    icon: string;
    screenshot?: string;
    galleryKeys?: string[];
}

const FeaturePage: React.FC<FeaturePageProps> = ({ featureKey, icon, screenshot, galleryKeys }) => {
    const { t } = useTranslation();

    const title = t(`feature_pages.${featureKey}.title`);
    const subtitle = t(`feature_pages.${featureKey}.subtitle`);
    const description = t(`feature_pages.${featureKey}.description`);

    const featureItems = [1, 2, 3].map(i => ({
        title: t(`feature_pages.${featureKey}.f${i}_title`),
        desc: t(`feature_pages.${featureKey}.f${i}_desc`),
    }));

    const gallery = galleryKeys?.map((key, index) => ({
        image: t(`feature_pages.${featureKey}.gallery.${key}.image`),
        title: t(`feature_pages.${featureKey}.gallery.${key}.title`),
        description: t(`feature_pages.${featureKey}.gallery.${key}.description`),
        index,
    }));

    return (
        <div className="landing-page feature-page">
            <nav className="navbar">
                <div className="container">
                    <div className="logo">
                        <Link to="/" className="text-gradient" style={{ textDecoration: 'none' }}>Stockman</Link>
                    </div>
                    <div className="nav-links">
                        <Link to="/" className="nav-link">{t('feature_pages.back_home')}</Link>
                        <a href="#contact" className="btn-primary">{t('nav.free_trial')}</a>
                    </div>
                </div>
            </nav>

            <div className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
                <div className="feature-header" style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <div style={{ fontSize: '60px', marginBottom: '20px' }}>{icon}</div>
                    <h1 style={{ fontSize: '3.5rem', marginBottom: '16px' }}>{title}</h1>
                    <p className="text-muted" style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>{subtitle}</p>
                </div>

                <div className="feature-content" style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
                    {screenshot && (
                        <div className="feature-screenshot-container glass-card" style={{ padding: '20px', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{
                                width: '100%',
                                aspectRatio: '16/9',
                                background: '#1A1C23',
                                borderRadius: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px dashed rgba(255,255,255,0.1)'
                            }}>
                                <img
                                    src={screenshot}
                                    alt={`${title} Screenshot`}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px', display: 'block' }}
                                    loading="lazy"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                                <div className="placeholder-text hidden" style={{ textAlign: 'center', padding: '20px' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>📸</div>
                                    <p style={{ color: 'var(--text-muted)' }}>Screenshot: {screenshot}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="feature-details">
                        <h2 style={{ fontSize: '2rem', marginBottom: '20px' }}>{t('feature_pages.why_use', { title })}</h2>
                        <p style={{ marginBottom: '40px', fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--text-muted)' }}>{description}</p>

                        <div className="features-grid">
                            {featureItems.map((f, i) => (
                                <div key={i} className="feature-card glass-card">
                                    <h3 style={{ color: 'var(--primary)' }}>{f.title}</h3>
                                    <p>{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {gallery && gallery.length > 0 && (
                        <div className="feature-gallery">
                            <h2 style={{ fontSize: '2rem', marginBottom: '40px', textAlign: 'center' }}>{t('feature_pages.discover_interface')}</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
                                {gallery.map((item) => (
                                    <div key={item.index} className="gallery-item glass-card" style={{ padding: '40px', borderRadius: '24px', display: 'flex', flexDirection: item.index % 2 === 0 ? 'row' : 'row-reverse', gap: '40px', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                borderRadius: '16px',
                                                overflow: 'hidden',
                                                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(255,255,255,0.1)'
                                            }}>
                                                <img
                                                    src={item.image}
                                                    alt={item.title}
                                                    style={{ width: '100%', display: 'block' }}
                                                    loading="lazy"
                                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '16px' }}>{item.title}</h3>
                                            <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>{item.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="cta-section" style={{ textAlign: 'center', marginTop: '100px' }}>
                    <h2 style={{ marginBottom: '20px' }}>{t('feature_pages.cta_title')}</h2>
                    <button className="btn-primary">{t('feature_pages.cta_button')}</button>
                </div>
            </div>

            <footer id="contact">
                <div className="container">
                    <div style={{ textAlign: 'center', padding: '40px 0', borderTop: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                        {t('footer.copyright')}
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default FeaturePage;
