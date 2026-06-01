const DENKMA_SCHEME_URL = 'denkma://app/create-parcel';
const DENKMA_APP_LINK_URL = 'https://denkma.com/app/create-parcel';
const DENKMA_ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.denkma.app';
const DENKMA_IOS_STORE_URL = 'https://apps.apple.com/fr/app/denkma/id6760837156';
const DENKMA_ANDROID_PACKAGE = 'com.denkma.app';

export type DenkmaOrderPayload = {
    order_id?: string;
    order_number?: string;
    customer_name?: string | null;
    customer_phone?: string | null;
    customer_address?: string | null;
    total_amount?: number | null;
    items?: Array<unknown> | null;
};

type DenkmaPrefillPayload = {
    source: string;
    external_ref?: string;
    recipient_name?: string;
    recipient_phone?: string;
    delivery_address_label?: string;
    declared_value?: string;
    description?: string;
};

function cleanText(value: unknown): string {
    return String(value || '').trim();
}

function normalizeAmount(value: unknown): string {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
        return '';
    }
    return String(Math.round(amount));
}

function buildPayload(order: DenkmaOrderPayload): DenkmaPrefillPayload {
    const reference = cleanText(order.order_number) || cleanText(order.order_id);
    const itemCount = Array.isArray(order.items) ? order.items.length : 0;
    const description = reference
        ? `Commande Stockman ${reference}${itemCount > 0 ? ` - ${itemCount} article(s)` : ''}`
        : 'Commande Stockman';
    const declaredValue = normalizeAmount(order.total_amount);
    return {
        source: 'stockman',
        ...(reference ? { external_ref: reference } : {}),
        ...(cleanText(order.customer_name) ? { recipient_name: cleanText(order.customer_name) } : {}),
        ...(cleanText(order.customer_phone) ? { recipient_phone: cleanText(order.customer_phone) } : {}),
        ...(cleanText(order.customer_address) ? { delivery_address_label: cleanText(order.customer_address) } : {}),
        ...(declaredValue ? { declared_value: declaredValue } : {}),
        description,
    };
}

function encodePayload(payload: DenkmaPrefillPayload): string {
    return encodeURIComponent(JSON.stringify(payload));
}

function isIosUserAgent(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }
    return /iPad|iPhone|iPod/i.test(navigator.userAgent);
}

function isAndroidUserAgent(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }
    return /Android/i.test(navigator.userAgent);
}

function buildDenkmaCreateParcelParams(order: DenkmaOrderPayload): URLSearchParams {
    const payload = buildPayload(order);
    const params = new URLSearchParams();
    params.set('source', payload.source);
    if (payload.external_ref) params.set('external_ref', payload.external_ref);
    if (payload.recipient_name) params.set('recipient_name', payload.recipient_name);
    if (payload.recipient_phone) params.set('recipient_phone', payload.recipient_phone);
    if (payload.delivery_address_label) params.set('delivery_address_label', payload.delivery_address_label);
    if (payload.declared_value) params.set('declared_value', payload.declared_value);
    if (payload.description) params.set('description', payload.description);
    return params;
}

export function buildDenkmaCreateParcelUrl(order: DenkmaOrderPayload): string {
    const params = buildDenkmaCreateParcelParams(order);
    const encodedPayload = encodePayload(buildPayload(order));
    return `${DENKMA_SCHEME_URL}/${encodedPayload}?${params.toString()}`;
}

export function buildDenkmaCreateParcelAppLink(order: DenkmaOrderPayload): string {
    const params = buildDenkmaCreateParcelParams(order);
    const encodedPayload = encodePayload(buildPayload(order));
    return `${DENKMA_APP_LINK_URL}/${encodedPayload}?${params.toString()}`;
}

export function buildDenkmaCreateParcelAndroidIntentUrl(order: DenkmaOrderPayload): string {
    const params = buildDenkmaCreateParcelParams(order).toString();
    const encodedPayload = encodePayload(buildPayload(order));
    return `intent://app/create-parcel/${encodedPayload}?${params}#Intent;scheme=denkma;package=${DENKMA_ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(DENKMA_ANDROID_STORE_URL)};end`;
}

export function openDenkmaForOrder(order: DenkmaOrderPayload): void {
    if (typeof window === 'undefined') {
        return;
    }

    const deepLink = buildDenkmaCreateParcelUrl(order);
    const appLink = buildDenkmaCreateParcelAppLink(order);
    const primaryUrl = isAndroidUserAgent()
        ? buildDenkmaCreateParcelAndroidIntentUrl(order)
        : deepLink;
    const fallbackUrl = isIosUserAgent() ? DENKMA_IOS_STORE_URL : DENKMA_ANDROID_STORE_URL;

    window.location.assign(primaryUrl);
    window.setTimeout(() => {
        if (primaryUrl !== deepLink) {
            window.location.assign(deepLink);
            return;
        }
        const popup = window.open(appLink, '_blank', 'noopener,noreferrer');
        if (popup) {
            return;
        }
        window.location.assign(fallbackUrl);
    }, 1200);
}
