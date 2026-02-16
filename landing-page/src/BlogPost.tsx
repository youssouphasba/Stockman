import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from './components/SEO';
import './App.css';

const blogSlugs = ['abandonner-cahier-stock', 'eviter-ruptures-fetes', 'augmenter-marge-2026'];
const blogIcons = ['📝', '🎄', '💸'];

function BlogPost() {
    const { slug } = useParams();
    const { t } = useTranslation();
    const index = blogSlugs.indexOf(slug || '');

    if (index === -1) {
        return (
            <div className="landing-page">
                <nav className="navbar">
                    <div className="container">
                        <Link to="/" className="logo"><span className="text-gradient">Stockman</span></Link>
                    </div>
                </nav>
                <div className="container" style={{ textAlign: 'center', padding: '100px 0' }}>
                    <h1>{t('blog.not_found')}</h1>
                    <Link to="/blog" className="btn-primary" style={{ marginTop: '20px' }}>{t('blog.back_to_blog')}</Link>
                </div>
            </div>
        );
    }

    const title = t(`blog.posts.${slug}.title`);
    const content = t(`blog.posts.${slug}.content`);
    const date = t(`blog.posts.${slug}.date`);

    return (
        <div className="landing-page">
            <SEO title={title} description={title} />
            <nav className="navbar">
                <div className="container">
                    <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
                        <span className="text-gradient">Stockman</span>
                    </Link>
                    <div className="nav-links">
                        <Link to="/blog" className="nav-link">{t('blog.back_to_articles')}</Link>
                    </div>
                </div>
            </nav>

            <article className="container" style={{ padding: 'var(--spacing-xl) 0', maxWidth: '800px' }}>
                <div className="glass-card" style={{ padding: '40px' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '20px', textAlign: 'center' }}>{blogIcons[index]}</div>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{t('blog.published_on')} {date.toUpperCase()}</span>
                        <h1 style={{ fontSize: '2.5rem', marginTop: '10px' }}>{title}</h1>
                    </div>
                    <div className="blog-body" style={{ lineHeight: '1.8', fontSize: '1.1rem', color: 'var(--text-light)' }} dangerouslySetInnerHTML={{ __html: content }} />
                    <div style={{ marginTop: '60px', paddingTop: '40px', borderTop: '1px solid var(--glass-border)', textAlign: 'center' }}>
                        <h3>{t('blog.liked_article')}</h3>
                        <p className="text-muted" style={{ marginBottom: '20px' }}>{t('blog.try_stockman')}</p>
                        <a href="#contact" className="btn-primary">{t('blog.start_trial')}</a>
                    </div>
                </div>
            </article>

            <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '40px 0', textAlign: 'center' }}>
                <p className="text-muted">{t('footer.copyright')}</p>
            </footer>
        </div>
    );
}

export default BlogPost;
