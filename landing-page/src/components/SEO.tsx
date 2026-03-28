import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

interface SEOProps {
    title: string;
    description: string;
    url?: string;
    image?: string;
    keywords?: string[];
    robots?: string;
    structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const SEO = ({
    title,
    description,
    url = 'https://stockman.pro',
    image = 'https://stockman.pro/og-image.jpg',
    keywords,
    robots = 'index, follow',
    structuredData,
}: SEOProps) => {
    const { i18n } = useTranslation();
    const languages = ['en', 'fr', 'es', 'de', 'it', 'ar', 'tr', 'wo', 'ff', 'pt', 'ru', 'zh', 'hi', 'pl', 'ro'];
    const resolvedKeywords = (keywords ?? [
        'Stockman',
        'logiciel de gestion de stock',
        'caisse POS',
        'inventaire',
        'commerce',
        'restaurant',
        'supermarche',
        'CRM',
        'comptabilite',
        'multi-boutiques',
        'application web Enterprise',
    ]).join(', ');
    const jsonLdItems = Array.isArray(structuredData)
        ? structuredData
        : structuredData
            ? [structuredData]
            : [];

    return (
        <Helmet>
            <html lang={i18n.language} />
            <title>{title} | Stockman</title>
            <meta name='description' content={description} />
            <meta name='keywords' content={resolvedKeywords} />
            <meta name='robots' content={robots} />
            <link rel="canonical" href={url} />

            <link rel="alternate" href="https://stockman.pro" hrefLang="x-default" />
            {languages.map(lang => (
                <link key={lang} rel="alternate" href={`https://stockman.pro/?lang=${lang}`} hrefLang={lang} />
            ))}

            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="Stockman" />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:url" content={url} />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />

            {jsonLdItems.map((item, index) => (
                <script
                    key={`${url}-ld-${index}`}
                    type="application/ld+json"
                >
                    {JSON.stringify(item)}
                </script>
            ))}
        </Helmet>
    );
};

export default SEO;
