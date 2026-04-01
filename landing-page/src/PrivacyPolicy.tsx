import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { fetchLegalContent } from './utils/legal';
import './App.css';

function PrivacyPolicy() {
    const { t, i18n } = useTranslation();
    const contentRef = useRef<HTMLDivElement>(null);
    const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([]);
    const [content, setContent] = useState('');
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        fetchLegalContent('privacy', i18n.language === 'ar' ? 'ar' : i18n.language === 'en' ? 'en' : 'fr')
            .then((res) => {
                if (isMounted) {
                    setContent(res.content || '');
                    setUpdatedAt(res.updated_at || null);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setContent(t('privacy.error_loading', "Impossible de charger la politique de confidentialité."));
                }
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });
        return () => { isMounted = false; };
    }, [i18n.language, t]);

    useEffect(() => {
        if (!contentRef.current || loading) return;
        const headings = contentRef.current.querySelectorAll('h1, h2, h3, h4');
        const items: { id: string; text: string; level: number }[] = [];
        headings.forEach((h, i) => {
            const id = `section-${i}`;
            h.id = id;
            const level = parseInt(h.tagName.substring(1));
            items.push({ id, text: h.textContent || '', level });
        });
        setToc(items);
    }, [content, loading]);

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
                        <Link to="/" className="nav-link">{t('feature_pages.back_home', 'Retour')}</Link>
                    </div>
                </div>
            </nav>

            <section className="container" style={{ padding: 'var(--spacing-xl) 0' }}>
                <div className="glass-card">
                    <h1>{t('privacy.title', 'Politique de Confidentialité')}</h1>
                    {updatedAt && (
                        <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '20px' }}>
                            {t('privacy.last_updated', 'Dernière mise à jour :')} {new Date(updatedAt).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
                        </p>
                    )}

                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
                            <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        </div>
                    ) : (
                        <>
                            {toc.length > 0 && (
                                <div className="legal-toc">
                                    <h3 className="legal-toc-title">📑 {t('legal.toc', 'Sommaire')}</h3>
                                    <ul className="legal-toc-list">
                                        {toc.map((item) => (
                                            <li key={item.id} className={item.level > 3 ? 'legal-toc-sub' : ''} style={{ marginLeft: item.level > 2 ? `${(item.level - 2) * 15}px` : '0' }}>
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
                                style={{ lineHeight: '1.8', color: 'var(--text-light)', whiteSpace: 'pre-wrap' }}
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
                            />
                        </>
                    )}
                </div>
            </section>

            <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '40px 0', textAlign: 'center' }}>
                <p className="text-muted">{t('footer.copyright')}</p>
            </footer>
        </div>
    );
}

export default PrivacyPolicy;
