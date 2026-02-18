import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './App.css';

function HelpCenter() {
    const [searchTerm, setSearchTerm] = useState('');
    const { t } = useTranslation();

    const categories = ['getting_started', 'account_billing', 'technical_support'];

    const faqs = categories.map(cat => {
        const questions = [];
        for (let i = 1; i <= 10; i++) {
            const q = t(`help.${cat}.q${i}`);
            const a = t(`help.${cat}.a${i}`);
            // If the key is returned as the key itself (default i18next behavior for missing keys)
            // or is empty/undefined, we stop.
            if (!q || q === `help.${cat}.q${i}`) break;
            questions.push({ q, a });
        }
        return {
            category: t(`help.${cat}.title`),
            questions
        };
    });

    const filteredFaqs = faqs.map(cat => ({
        ...cat,
        questions: cat.questions.filter(q =>
            q.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.a.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(cat => cat.questions.length > 0);

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

            <section className="hero" style={{ minHeight: '40vh', padding: 'var(--spacing-xl) 0' }}>
                <div className="container" style={{ textAlign: 'center' }}>
                    <h1 style={{ marginBottom: '20px' }}>{t('help.hero_start')} <span className="text-gradient">{t('help.hero_highlight')}</span> ?</h1>
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <input
                            type="text"
                            placeholder={t('help.search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%', padding: '16px 24px', borderRadius: '50px',
                                border: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.05)',
                                color: 'white', fontSize: '1.1rem', outline: 'none', backdropFilter: 'blur(10px)'
                            }}
                        />
                    </div>
                </div>
            </section>

            <section className="container" style={{ paddingBottom: 'var(--spacing-xl)' }}>
                <div className="glass-card">
                    {filteredFaqs.map((cat, idx) => (
                        <div key={idx} style={{ marginBottom: '40px' }}>
                            <h2 style={{ color: 'var(--primary)', marginBottom: '20px', fontSize: '1.5rem' }}>{cat.category}</h2>
                            <div style={{ display: 'grid', gap: '20px' }}>
                                {cat.questions.map((item, qIdx) => (
                                    <div key={qIdx} style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px' }}>
                                        <h3 style={{ marginBottom: '10px', fontSize: '1.1rem' }}>{item.q}</h3>
                                        <p className="text-muted">{item.a}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {filteredFaqs.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <p>{t('help.no_results', { term: searchTerm })}</p>
                        </div>
                    )}

                    <div style={{ marginTop: '60px', textAlign: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '40px' }}>
                        <h2>{t('help.need_more')}</h2>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px', flexWrap: 'wrap' }}>
                            <a href="mailto:support@stockman.app" className="btn-primary" style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.1)' }}>
                                {t('help.email_support')}
                            </a>
                            <a href="#" className="btn-primary" style={{ textDecoration: 'none' }}>
                                {t('help.whatsapp_chat')}
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '40px 0', textAlign: 'center' }}>
                <p className="text-muted">{t('footer.copyright')}</p>
            </footer>
        </div>
    );
}

export default HelpCenter;
