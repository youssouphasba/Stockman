import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from './components/SEO';
import './App.css';

const blogSlugs = ['abandonner-cahier-stock', 'eviter-ruptures-fetes', 'augmenter-marge-2026'];
const blogIcons = ['📝', '🎄', '💸'];

function Blog() {
    const { t } = useTranslation();

    return (
        <div className="landing-page">
            <SEO
                title={t('blog.seo_title')}
                description={t('blog.seo_desc')}
            />

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
                <div className="section-title">
                    <h1>{t('blog.page_title')}</h1>
                    <p className="text-muted">{t('blog.page_subtitle')}</p>
                </div>

                <div className="blog-grid">
                    {blogSlugs.map((slug, index) => (
                        <div key={slug} className="glass-card blog-card">
                            <div className="blog-icon">{blogIcons[index]}</div>
                            <div className="blog-content">
                                <span className="blog-date">{t(`blog.posts.${slug}.date`)}</span>
                                <h3>{t(`blog.posts.${slug}.title`)}</h3>
                                <p>{t(`blog.posts.${slug}.excerpt`)}</p>
                                <Link to={`/blog/${slug}`} className="btn-link">{t('blog.read_more')}</Link>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '40px 0', textAlign: 'center' }}>
                <p className="text-muted">{t('footer.copyright')}</p>
            </footer>
        </div>
    );
}

export default Blog;
