'use client';

// Services commerciaux des modèles à sections : mêmes routes publiques, mêmes données et mêmes
// règles que Stockman Basic (quantités bornées par le stock, incréments inchangés).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StorefrontPayload, StorefrontProduct } from './types';
import { usePlacedOrder } from './OrderPayment';

export type CartLine = { product: StorefrontProduct; quantity: number };
export type OrderForm = { name: string; phone: string; email: string; address: string; notes: string };
export type ContactForm = { name: string; phone: string; email: string; company: string; subject: string; message: string };
type SubmitState = { submitting: boolean; error: string | null; success: string | null };

export const PREVIEW_ORDER_DISABLED = 'Aperçu privé : les commandes sont désactivées.';
export const PREVIEW_CONTACT_DISABLED = "Aperçu privé : l'envoi de messages est désactivé.";
const IDLE: SubmitState = { submitting: false, error: null, success: null };

export function formatAmount(value: number, currency: string) {
    try {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currency || 'XOF',
            maximumFractionDigits: currency === 'XOF' ? 0 : 2,
        }).format(value || 0);
    } catch {
        return `${new Intl.NumberFormat('fr-FR').format(value || 0)} ${currency || ''}`.trim();
    }
}

function postJson(url: string, body: unknown) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

async function readError(response: Response, fallback: string) {
    const data = await response.json().catch(() => null);
    return typeof data?.detail === 'string' ? data.detail : fallback;
}

export function useStorefrontCommerce(payload: StorefrontPayload | null, preview: boolean) {
    const slug = payload?.site.slug || '';
    const [cart, setCart] = useState<Record<string, CartLine>>({});
    const [order, setOrder] = useState<SubmitState>(IDLE);
    const [contact, setContact] = useState<SubmitState>(IDLE);
    const tracked = useRef(false);
    // Dernière commande passée sur cet appareil : sa page de paiement reste accessible dans le panier.
    const placedOrder = usePlacedOrder(slug, !preview);
    const placeOrder = placedOrder.place;

    // Les statistiques de visite ne comptent jamais un aperçu privé.
    useEffect(() => {
        if (!payload || preview || tracked.current || !slug) return;
        tracked.current = true;
        postJson(`/api/public/ecommerce/${slug}/events`, { event_type: 'site_view' }).catch(() => null);
    }, [payload, preview, slug]);

    // La quantité ajoutée ne dépasse jamais le stock disponible publié.
    const addToCart = useCallback((product: StorefrontProduct, quantity = 1) => {
        const wanted = Math.max(1, Math.floor(quantity));
        if (!product.available || product.quantity <= 0) return;
        setCart((current) => {
            const previous = current[product.product_id]?.quantity || 0;
            return { ...current, [product.product_id]: { product, quantity: Math.min(previous + wanted, Math.max(0, product.quantity)) } };
        });
        setOrder((state) => (state.success ? IDLE : state));
        if (!preview && slug) {
            postJson(`/api/public/ecommerce/${slug}/events`, { event_type: 'add_to_cart', product_id: product.product_id, quantity: wanted }).catch(() => null);
        }
    }, [preview, slug]);

    const updateQuantity = useCallback((productId: string, quantity: number) => {
        setCart((current) => {
            const line = current[productId];
            if (!line) return current;
            if (quantity <= 0) {
                const next = { ...current };
                delete next[productId];
                return next;
            }
            return { ...current, [productId]: { ...line, quantity: Math.min(quantity, Math.max(0, line.product.quantity)) } };
        });
    }, []);

    const lines = useMemo(() => Object.values(cart), [cart]);
    const total = useMemo(() => lines.reduce((sum, line) => sum + line.product.selling_price * line.quantity, 0), [lines]);
    const count = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);

    const submitOrder = useCallback(async (form: OrderForm, delivery?: { destination_session_id: string } | null, paymentMethod?: string | null) => {
        if (preview) {
            setOrder({ ...IDLE, error: PREVIEW_ORDER_DISABLED });
            return false;
        }
        if (!form.name.trim() || lines.length === 0) return false;
        setOrder({ ...IDLE, submitting: true });
        try {
            const response = await postJson(`/api/public/ecommerce/${slug}/orders`, {
                customer_name: form.name.trim(),
                customer_phone: form.phone.trim() || null,
                customer_email: form.email.trim() || null,
                customer_address: form.address.trim() || null,
                notes: form.notes.trim() || null,
                items: lines.map((line) => ({ product_id: line.product.product_id, quantity: line.quantity })),
                ...(delivery ? { delivery: { provider: 'denkma', destination_session_id: delivery.destination_session_id } } : {}),
                ...(paymentMethod ? { payment_method: paymentMethod } : {}),
            });
            if (!response.ok) throw new Error(await readError(response, "Impossible d'envoyer la commande."));
            const data = await response.json();
            setCart({});
            if (payload?.site.payment && data.payment_token) {
                // La boutique affiche un compte de paiement : le panier montre la page de paiement de la commande.
                placeOrder({
                    orderId: data.order_id,
                    orderNumber: data.order_number,
                    token: data.payment_token,
                    amountDue: typeof data.amount_due === 'number' ? data.amount_due : data.total_amount,
                    currency: payload.site.currency || 'XOF',
                    method: data.payment?.method || 'other',
                    status: 'awaiting',
                    orderStatus: data.status || 'pending',
                });
                setOrder(IDLE);
                return true;
            }
            const due = delivery && typeof data.amount_due === 'number' ? ` Montant à régler, livraison comprise : ${formatAmount(data.amount_due, payload?.site.currency || 'XOF')}.` : '';
            setOrder({ ...IDLE, success: `Commande envoyée : ${data.order_number}.${due} La boutique vous recontactera pour confirmer.` });
            return true;
        } catch (error) {
            setOrder({ ...IDLE, error: error instanceof Error && error.message ? error.message : "Impossible d'envoyer la commande." });
            return false;
        }
    }, [lines, payload?.site.currency, payload?.site.payment, placeOrder, preview, slug]);

    const submitContact = useCallback(async (form: ContactForm) => {
        if (preview) {
            setContact({ ...IDLE, error: PREVIEW_CONTACT_DISABLED });
            return false;
        }
        if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) return false;
        setContact({ ...IDLE, submitting: true });
        try {
            const response = await postJson(`/api/public/ecommerce/${slug}/contact`, {
                customer_name: form.name.trim(),
                customer_phone: form.phone.trim() || null,
                customer_email: form.email.trim() || null,
                company_name: form.company.trim() || null,
                subject: form.subject.trim(),
                message: form.message.trim(),
            });
            if (!response.ok) throw new Error(await readError(response, "Impossible d'envoyer votre demande."));
            setContact({ ...IDLE, success: 'Votre message a bien été envoyé. La boutique vous répondra rapidement.' });
            return true;
        } catch (error) {
            setContact({ ...IDLE, error: error instanceof Error && error.message ? error.message : "Impossible d'envoyer votre demande." });
            return false;
        }
    }, [preview, slug]);

    return { cart, lines, total, count, addToCart, updateQuantity, order, submitOrder, contact, submitContact, placedOrder };
}

export type StorefrontCommerce = ReturnType<typeof useStorefrontCommerce>;
