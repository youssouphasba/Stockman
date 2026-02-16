import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title: string;
    description: string;
    url?: string;
    image?: string;
}

const SEO = ({ title, description, url = 'https://stockman.app', image = 'https://stockman.app/og-image.jpg' }: SEOProps) => {
    return (
        <Helmet>
            {/* Standard metadata tags */}
            <title>{title} | Stockman</title>
            <meta name='description' content={description} />

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
