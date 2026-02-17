import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

interface SEOProps {
    title: string;
    description: string;
    url?: string;
    image?: string;
}

const SEO = ({ title, description, url = 'https://stockman.app', image = 'https://stockman.app/og-image.jpg' }: SEOProps) => {
    const { i18n } = useTranslation();
    const languages = ['en', 'fr', 'es', 'de', 'it', 'ar', 'tr', 'wo', 'ff', 'pt', 'ru', 'zh', 'hi', 'pl', 'ro'];

    return (
        <Helmet>
            {/* Standard metadata tags */}
            <html lang={i18n.language} />
            <title>{title} | Stockman</title>
            <meta name='description' content={description} />
            <meta name='keywords' content="Stockman, gestion de stock, caisse enregistreuse, inventaire, boutique, commerce, Afrique, ERP, CRM, IA, automatisation" />
            <link rel="canonical" href={url} />

            {/* Hreflang for international SEO */}
            <link rel="alternate" href="https://stockman.app" hrefLang="x-default" />
            {languages.map(lang => (
                <link key={lang} rel="alternate" href={`https://stockman.app/?lang=${lang}`} hrefLang={lang} />
            ))}

            {/* Facebook tags */}
            <meta property="og:type" content="website" />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:url" content={url} />

            {/* Twitter tags */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />
        </Helmet>
    );
};

export default SEO;
