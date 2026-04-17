import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

interface SEOProps {
    title: string;
    description: string;
    url?: string;
    image?: string;
    keywords?: string[];
    robots?: string;
    type?: 'website' | 'article';
    structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const SITE_URL = 'https://stockman.pro';
const DEFAULT_IMAGE = `${SITE_URL}/stockman_landing_hero.png`;
const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'de', 'it', 'ar', 'tr', 'wo', 'ff', 'pt', 'ru', 'zh', 'hi', 'pl', 'ro'];

const getLocalizedUrl = (url: string, language: string) => {
    const parsedUrl = new URL(url, SITE_URL);
    parsedUrl.searchParams.set('lang', language);
    return parsedUrl.toString();
};

const SEO = ({
    title,
    description,
    url = SITE_URL,
    image = DEFAULT_IMAGE,
    keywords,
    robots = 'index, follow',
    type = 'website',
    structuredData,
}: SEOProps) => {
    const { i18n } = useTranslation();
    const normalizedUrl = new URL(url, SITE_URL).toString();
    const resolvedTitle = title.includes('Stockman') ? title : `${title} | Stockman`;
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
            <title>{resolvedTitle}</title>
            <meta name='description' content={description} />
            <meta name='keywords' content={resolvedKeywords} />
            <meta name='robots' content={robots} />
            <link rel="canonical" href={normalizedUrl} />

            <link rel="alternate" href={normalizedUrl} hrefLang="x-default" />
            {SUPPORTED_LANGUAGES.map(lang => (
                <link key={lang} rel="alternate" href={getLocalizedUrl(normalizedUrl, lang)} hrefLang={lang} />
            ))}

            <meta property="og:type" content={type} />
            <meta property="og:site_name" content="Stockman" />
            <meta property="og:locale" content={i18n.language === 'fr' ? 'fr_FR' : i18n.language} />
            <meta property="og:title" content={resolvedTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:image:alt" content="Stockman, logiciel de gestion de stock et caisse POS" />
            <meta property="og:url" content={normalizedUrl} />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:domain" content="stockman.pro" />
            <meta name="twitter:url" content={normalizedUrl} />
            <meta name="twitter:title" content={resolvedTitle} />
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
