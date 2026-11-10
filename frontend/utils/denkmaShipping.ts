// Livraison Denkma d'une commande en ligne, côté commerçant : destination choisie par le client,
// frais, état de l'expédition et suivi du colis. Copie identique dans web-app/src/lib/denkmaShipping.ts.

export type DenkmaOrderDelivery = {
  provider?: string;
  mode?: string;
  relay_name?: string | null;
  fee?: number | null;
  status?: string | null;
  denkma_status?: string | null;
  parcel_status?: string | null;
  tracking_code?: string | null;
  error?: string | null;
  waiting_for?: string | null;
  // Code à 6 chiffres que le commerçant donne au livreur ; présent tant que le colis attend d'être enlevé.
  collection_code?: string | null;
  // Annulation demandée à Denkma : 'pending' tant que Denkma ne l'a pas confirmée, 'refused' si le colis est déjà parti.
  cancel_state?: 'pending' | 'done' | 'refused' | null;
  cancel_error?: string | null;
  // Le commerçant a autorisé l'expédition sans avoir confirmé le paiement.
  authorized_unpaid_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
};

type OrderLike = { status?: string; total_amount?: number | null; amount_due?: number | null; delivery_fee?: number | null; delivery?: DenkmaOrderDelivery | null };

const ORDER_STATES: Record<string, string> = {
  draft: 'Informations à compléter chez Denkma',
  awaiting_destination: 'Position du client attendue',
  ready_for_quote: 'Prête à expédier',
  awaiting_funding: 'Transport à financer : rechargez votre compte Denkma Pro',
  funded: 'Transport réservé : cliquez sur « Prête » quand le colis est emballé',
  prepared: 'Colis prêt',
  dispatching: 'Enlèvement en cours',
  dispatched: 'Enlèvement demandé : un livreur va venir',
  cancelled: 'Livraison annulée',
};

const PARCEL_STATES: Record<string, string> = {
  created: 'En attente de collecte',
  dropped_at_origin_relay: 'Déposé au relais de départ',
  in_transit: 'En transit',
  at_destination_relay: 'Arrivé au point relais',
  available_at_relay: 'Disponible au point relais',
  out_for_delivery: 'En cours de livraison',
  delivered: 'Livré',
  delivery_failed: 'Livraison échouée',
  redirected_to_relay: 'Redirigé vers un point relais',
  cancelled: 'Annulé',
  suspended: 'Suspendu',
  expired: 'Expiré',
  disputed: 'En litige',
  incident_reported: 'Incident signalé',
  returned: 'Retourné',
};

const OPEN_ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];
const SHIPPED = ['dispatching', 'dispatched', 'cancelled'];

export function denkmaDelivery(order: OrderLike | null | undefined): DenkmaOrderDelivery | null {
  return order?.delivery && order.delivery.provider === 'denkma' ? order.delivery : null;
}

export function denkmaDestination(delivery: DenkmaOrderDelivery): string {
  return delivery.mode === 'home_to_relay'
    ? `Point relais : ${delivery.relay_name || 'choisi par le client'}`
    : 'À domicile : position confirmée par le client';
}

export function denkmaState(delivery: DenkmaOrderDelivery): { label: string; tone: 'neutral' | 'progress' | 'warning' | 'success' } {
  // Une annulation n'est annoncée qu'une fois confirmée par Denkma.
  if (delivery.cancel_state === 'pending') return { label: 'Annulation de la livraison en cours chez Denkma', tone: 'warning' };
  if (delivery.cancel_state === 'refused') return { label: delivery.cancel_error || "Denkma n'a pas pu annuler cette livraison", tone: 'warning' };
  if (delivery.parcel_status) {
    const label = PARCEL_STATES[delivery.parcel_status] || delivery.parcel_status;
    const tone = delivery.parcel_status === 'delivered' ? 'success' : ['delivery_failed', 'cancelled', 'returned', 'disputed', 'incident_reported', 'expired', 'suspended'].includes(delivery.parcel_status) ? 'warning' : 'progress';
    return { label, tone };
  }
  if (delivery.waiting_for === 'photo') return { label: "Transport réservé : ajoutez la photo du colis pour lancer l'enlèvement", tone: 'warning' };
  if (delivery.status === 'sync_failed') return { label: "À reprendre au moment de l'expédition", tone: 'warning' };
  const label = ORDER_STATES[delivery.denkma_status || ''] || 'Prête à expédier';
  const tone = delivery.denkma_status === 'awaiting_funding' || delivery.denkma_status === 'cancelled' ? 'warning' : delivery.denkma_status && SHIPPED.includes(delivery.denkma_status) ? 'progress' : 'neutral';
  return { label, tone };
}

// Code à donner au livreur, lisible à voix haute : « 123 456 ».
export function collectionCode(delivery: DenkmaOrderDelivery | null | undefined): string | null {
  const code = (delivery?.collection_code || '').trim();
  if (!code) return null;
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

export function canShipWithDenkma(order: OrderLike | null | undefined): boolean {
  const delivery = denkmaDelivery(order);
  if (!delivery || !OPEN_ORDER_STATUSES.includes(order?.status || '')) return false;
  return !delivery.parcel_status && !SHIPPED.includes(delivery.denkma_status || '');
}

export function amountDue(order: OrderLike | null | undefined): number {
  if (typeof order?.amount_due === 'number') return order.amount_due;
  return (order?.total_amount || 0) + (order?.delivery_fee || denkmaDelivery(order)?.fee || 0);
}
