import { Linking, Platform } from 'react-native';

const DENKMA_SCHEME_URL = 'denkma://app/create-parcel';
const DENKMA_ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.denkma.app';
const DENKMA_IOS_STORE_URL = 'https://apps.apple.com/fr/app/denkma/id6760837156';

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

export function buildDenkmaCreateParcelUrl(order: DenkmaOrderPayload): string {
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
  return `${DENKMA_SCHEME_URL}?${params.toString()}`;
}

export async function openDenkmaForOrder(order: DenkmaOrderPayload): Promise<void> {
  const deepLink = buildDenkmaCreateParcelUrl(order);
  const fallbackUrl = Platform.OS === 'ios' ? DENKMA_IOS_STORE_URL : DENKMA_ANDROID_STORE_URL;
  const canOpenDenkma = await Linking.canOpenURL(deepLink);
  if (canOpenDenkma) {
    await Linking.openURL(deepLink);
    return;
  }
  await Linking.openURL(fallbackUrl);
}
