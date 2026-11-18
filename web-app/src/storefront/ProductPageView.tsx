// Page produit rendue par le serveur : données structurées et résumé lisible sans script, puis la
// vitrine habituelle qui ouvre la fiche du produit (son adresse est lue par la vitrine).
import StorefrontClient from '../app/shop/[slug]/StorefrontClient';
import { formatPrice, productJsonLd, type PublicProductPayload } from './server';

export default function ProductPageView({ slug, modelId, payload, origin }: {
    slug: string;
    modelId?: string | null;
    payload: PublicProductPayload | null;
    origin: string;
}) {
    return (
        <>
            {payload && (
                <>
                    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd(payload, origin) }} />
                    <noscript>
                        <article>
                            <h1>{payload.product.name}</h1>
                            <p>{formatPrice(payload.product.selling_price, payload.site.currency)}</p>
                            {payload.product.description && <p>{payload.product.description}</p>}
                            <p>{payload.product.available ? 'Disponible' : 'Rupture de stock'} · {payload.site.name}</p>
                        </article>
                    </noscript>
                </>
            )}
            <StorefrontClient slug={slug} modelId={modelId} />
        </>
    );
}
