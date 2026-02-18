import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from './components/SEO';
import Newsletter from './components/Newsletter';
import './App.css';

function About() {
    const { t } = useTranslation();

    return (
        <div className="landing-page">
            <SEO
                title={t('about.seo_title')}
                description={t('about.seo_desc')}
            />

            <nav className="navbar">
                <div className="container">
                    <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
                        <span className="text-gradient">Stockman</span>
                    </Link>
                    <div className="nav-links">
                        <Link to="/" className="nav-link">{t('about.home')}</Link>
                        <Link to="/blog" className="nav-link">{t('nav.blog')}</Link>
                    </div>
                </div>
            </nav>

            <header className="hero about-hero">
                <div className="container" style={{ textAlign: 'center', paddingTop: '40px' }}>
                    <h1>{t('about.mission_start')} <span className="text-gradient">{t('about.mission_highlight')}</span></h1>
                    <p style={{ maxWidth: '700px', margin: '20px auto', fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: 'var(--text-muted)' }}>
                        {t('about.mission_desc')}
                    </p>
                </div>
            </header>

            <section className="container team-section">
                <div className="section-title">
                    <h2>{t('about.team_title')}</h2>
                    <p className="text-muted">{t('about.team_subtitle')}</p>
                </div>

                <div className="team-grid">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="glass-card team-card">
                            <div className="team-avatar">{t(`about.member${i}_image`)}</div>
                            <h3>{t(`about.member${i}_name`)}</h3>
                            <span className="team-role">{t(`about.member${i}_role`)}</span>
                            <p>{t(`about.member${i}_bio`)}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="container values-section" style={{ margin: 'var(--spacing-xl) auto' }}>
                <div className="glass-card" style={{ background: 'rgba(0, 122, 255, 0.05)' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>{t('about.values_title')}</h2>
                    <div className="values-grid">
                        <div className="value-item">
                            <h3>{t('about.value1_title')}</h3>
                            <p>{t('about.value1_desc')}</p>
                        </div>
                        <div className="value-item">
                            <h3>{t('about.value2_title')}</h3>
                            <p>{t('about.value2_desc')}</p>
                        </div>
                        <div className="value-item">
                            <h3>{t('about.value3_title')}</h3>
                            <p>{t('about.value3_desc')}</p>
                        </div>
                    </div>
                </div>
            </section>

            <Newsletter />

            <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '40px 0', textAlign: 'center', marginTop: '60px' }}>
                <p className="text-muted">{t('footer.copyright')}</p>
            </footer>
        </div>
    );
}

export default About;
