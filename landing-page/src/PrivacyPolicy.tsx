
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './App.css';

function PrivacyPolicy() {
    const { t } = useTranslation();

    return (
        <div className="landing-page">
            <nav className="navbar">
                <div className="container">
                    <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
                        <span className="text-gradient">Stockman</span>
                    </Link>
                    <div className="nav-links">
                        <Link to="/" className="nav-link">{t('feature_pages.back_home')}</Link>
                    </div>
                </div>
            </nav>

            <section className="container" style={{ padding: 'var(--spacing-xl) 0' }}>
                <div className="glass-card">
                    <h1>{t('privacy.title')}</h1>
                    <p className="text-muted" style={{ marginBottom: '30px' }}>{t('privacy.version')}</p>
                    <div style={{ lineHeight: '1.8', color: 'var(--text-light)' }} dangerouslySetInnerHTML={{ __html: t('privacy.content') }} />
                </div>
            </section>

            <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '40px 0', textAlign: 'center' }}>
                <p className="text-muted">{t('footer.copyright')}</p>
            </footer>
        </div>
    );
}

export default PrivacyPolicy;
