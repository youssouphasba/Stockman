
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './App.css';

function PrivacyPolicy() {
    const { t } = useTranslation();
    const contentRef = useRef<HTMLDivElement>(null);
    const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([]);

    useEffect(() => {
        if (!contentRef.current) return;
        const headings = contentRef.current.querySelectorAll('h3, h4');
        const items: { id: string; text: string; level: number }[] = [];
        headings.forEach((h, i) => {
            const id = `section-${i}`;
            h.id = id;
            items.push({ id, text: h.textContent || '', level: h.tagName === 'H3' ? 3 : 4 });
        });
        setToc(items);
    }, [t]);

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

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

                    {toc.length > 0 && (
                        <div className="legal-toc">
                            <h3 className="legal-toc-title">📑 Sommaire</h3>
                            <ul className="legal-toc-list">
                                {toc.map((item) => (
                                    <li key={item.id} className={item.level === 4 ? 'legal-toc-sub' : ''}>
                                        <button onClick={() => scrollTo(item.id)} className="legal-toc-link">
                                            {item.text}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div
                        ref={contentRef}
                        style={{ lineHeight: '1.8', color: 'var(--text-light)' }}
                        dangerouslySetInnerHTML={{ __html: t('privacy.content') }}
                    />
                </div>
            </section>

            <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '40px 0', textAlign: 'center' }}>
                <p className="text-muted">{t('footer.copyright')}</p>
            </footer>
        </div>
    );
}

export default PrivacyPolicy;
