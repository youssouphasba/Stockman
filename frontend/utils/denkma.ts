import { Linking, Platform } from 'react-native';

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

function buildDenkmaCreateParcelParams(order: DenkmaOrderPayload): URLSearchParams {
  const reference = cleanText(order.order_number) || cleanText(order.order_id);
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;
  const description = reference
    ? `Commande Stockman ${reference}${itemCount > 0 ? ` - ${itemCount} article(s)` : ''}`
    : 'Commande Stockman';

  const params = new URLSearchParams();
  params.set('source', 'stockman');
  if (reference) params.set('external_ref', reference);
  if (cleanText(order.customer_name)) params.set('recipient_name', cleanText(order.customer_name));
  if (cleanText(order.customer_phone)) params.set('recipient_phone', cleanText(order.customer_phone));
  if (cleanText(order.customer_address)) params.set('delivery_address_label', cleanText(order.customer_address));
  if (normalizeAmount(order.total_amount)) params.set('declared_value', normalizeAmount(order.total_amount));
  params.set('description', description);
  return params;
}

export function buildDenkmaCreateParcelUrl(order: DenkmaOrderPayload): string {
  const params = buildDenkmaCreateParcelParams(order);
  return `${DENKMA_SCHEME_URL}?${params.toString()}`;
}

export function buildDenkmaCreateParcelAppLink(order: DenkmaOrderPayload): string {
  const params = buildDenkmaCreateParcelParams(order);
  return `${DENKMA_APP_LINK_URL}?${params.toString()}`;
}

export function buildDenkmaCreateParcelAndroidIntentUrl(order: DenkmaOrderPayload): string {
  const params = buildDenkmaCreateParcelParams(order).toString();
  return `intent://app/create-parcel?${params}#Intent;scheme=denkma;package=${DENKMA_ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(DENKMA_ANDROID_STORE_URL)};end`;
}

export async function openDenkmaForOrder(order: DenkmaOrderPayload): Promise<void> {
  const primaryUrl = Platform.OS === 'android'
    ? buildDenkmaCreateParcelAndroidIntentUrl(order)
    : buildDenkmaCreateParcelUrl(order);
  const deepLink = buildDenkmaCreateParcelUrl(order);
  const appLink = buildDenkmaCreateParcelAppLink(order);
  const fallbackUrl = Platform.OS === 'ios' ? DENKMA_IOS_STORE_URL : DENKMA_ANDROID_STORE_URL;

  try {
    await Linking.openURL(primaryUrl);
    return;
  } catch (_) {}

  if (primaryUrl !== deepLink) {
    try {
      await Linking.openURL(deepLink);
      return;
    } catch (_) {}
  }

  try {
    await Linking.openURL(appLink);
    return;
  } catch (_) {}

  try {
    const canOpenFallback = await Linking.canOpenURL(fallbackUrl);
    if (canOpenFallback) {
      await Linking.openURL(fallbackUrl);
      return;
    }
  } catch (_) {}

  throw new Error("Impossible d'ouvrir Denkma.");
}
