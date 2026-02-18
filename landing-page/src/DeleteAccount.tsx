
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './App.css';

function DeleteAccount() {
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
                    <h1>{t('delete_account.title')}</h1>
                    <p className="subtitle" style={{ color: 'var(--primary)', fontWeight: 600, marginBottom: '10px' }}>
                        {t('delete_account.subtitle')}
                    </p>
                    <p className="text-muted" style={{ marginBottom: '30px' }}>{t('delete_account.version')}</p>

                    <p style={{ fontSize: '1.1rem', marginBottom: '40px' }}>
                        {t('delete_account.intro')}
                    </p>

                    <div className="method-box" style={{ marginBottom: '40px', padding: '25px', background: 'rgba(255,255,255,0.03)', borderRadius: '15px', border: '1px solid var(--glass-border)' }}>
                        <h3 style={{ color: 'var(--text-light)', marginBottom: '15px' }}>{t('delete_account.method_app_title')}</h3>
                        <p style={{ marginBottom: '20px' }}>{t('delete_account.method_app_desc')}</p>
                        <ol style={{ paddingLeft: '20px', lineHeight: '2' }}>
                            {(t('delete_account.method_app_steps', { returnObjects: true }) as string[]).map((step, i) => (
                                <li key={i}>{step}</li>
                            ))}
                        </ol>
                    </div>

                    <div className="method-box" style={{ marginBottom: '40px', padding: '25px', background: 'rgba(255,255,255,0.03)', borderRadius: '15px', border: '1px solid var(--glass-border)' }}>
                        <h3 style={{ color: 'var(--text-light)', marginBottom: '15px' }}>{t('delete_account.method_web_title')}</h3>
                        <p style={{ marginBottom: '20px' }}>{t('delete_account.method_web_desc')}</p>
                        <p style={{ marginBottom: '25px', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            {t('delete_account.method_web_note')}
                        </p>
                        <a href="mailto:contact@stockman.pro?subject=Demande de suppression de compte" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
                            {t('footer.contact')}
                        </a>
                    </div>

                    <div style={{ marginTop: '50px' }}>
                        <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '20px' }}>
                            {t('delete_account.data_erased_title')}
                        </h3>
                        <p style={{ marginBottom: '20px' }}>{t('delete_account.data_erased_desc')}</p>
                        <ul style={{ paddingLeft: '20px', lineHeight: '2' }}>
                            {(t('delete_account.data_erased_list', { returnObjects: true }) as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    </div>

                    <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(244, 63, 94, 0.05)', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                        <h4 style={{ color: '#f43f5e', marginBottom: '10px' }}>{t('delete_account.retention_title')}</h4>
                        <p style={{ fontSize: '0.9rem' }}>{t('delete_account.retention_desc')}</p>
                    </div>
                </div>
            </section>

            <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '40px 0', textAlign: 'center' }}>
                <p className="text-muted">{t('footer.copyright')}</p>
            </footer>
        </div>
    );
}

export default DeleteAccount;
