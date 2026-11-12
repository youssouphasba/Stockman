// Paiement d'une commande en ligne, côté commerçant : le client paie le commerçant directement
// (Wave, Orange Money ou à la livraison) et Stockman suit seulement l'état. Ce fichier dit aussi quelle est la
// prochaine étape d'une commande, pour que l'écran ne mette en avant qu'un seul geste.
// Copie identique dans frontend/utils/orderPayment.ts.

export type OrderPayment = {
  method?: string | null;
  status?: string | null;
  declared_at?: string | null;
  paid_at?: string | null;
};

type OrderLike = {
  status?: string;
  payment?: OrderPayment | null;
  delivery?: { provider?: string; denkma_status?: string | null; parcel_status?: string | null; collection_code?: string | null; authorized_unpaid_at?: string | null } | null;
};

export type Tone = 'neutral' | 'progress' | 'warning' | 'success';
export type NextStep = { action: 'payment' | 'confirm' | 'ready' | 'deliver' | null; label: string; hint: string };

const STATUS_LABELS: Record<string, string> = {
  pending: 'Nouvelle',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  ready: 'Prête',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  rejected: 'Refusée',
};

const CLOSED = ['delivered', 'cancelled', 'rejected'];
// Comptes de paiement mobile que le commerçant peut afficher dans sa boutique.
const WALLETS: Record<string, string> = { wave: 'Wave', orange_money: 'Orange Money' };

export function walletLabel(method?: string | null): string | null {
  return WALLETS[method || ''] || null;
}

export function orderStatusLabel(status?: string | null): string {
  return STATUS_LABELS[status || ''] || status || '';
}

function isPaid(order: OrderLike | null | undefined): boolean {
  return order?.payment?.status === 'paid';
}

function usesDenkma(order: OrderLike | null | undefined): boolean {
  return order?.delivery?.provider === 'denkma';
}

export function paymentState(order: OrderLike | null | undefined): { label: string; tone: Tone; hint: string } {
  const payment = order?.payment;
  if (payment?.status === 'paid') return { label: 'Payée', tone: 'success', hint: 'Vous avez confirmé avoir reçu le paiement.' };
  // Autoriser l'expédition n'est pas confirmer l'encaissement : le paiement reste à suivre.
  if (order?.delivery?.authorized_unpaid_at) return { label: 'Expédiée sans paiement confirmé', tone: 'warning', hint: 'Vous avez autorisé l’expédition avant d’avoir reçu le paiement. Confirmez « Paiement reçu » dès que le client vous a payé.' };
  const wallet = walletLabel(payment?.method);
  if (payment?.status === 'declared') return { label: 'Le client dit avoir payé', tone: 'warning', hint: `Vérifiez ${wallet ? `dans ${wallet}` : 'sur votre compte'} que l’argent est arrivé, puis confirmez.` };
  if (wallet) return { label: `Paiement ${wallet} attendu`, tone: 'progress', hint: `Le client a vu votre numéro ${wallet} et le montant à payer.` };
  if (payment?.method === 'on_delivery') return { label: 'Paiement à la livraison', tone: 'neutral', hint: usesDenkma(order) ? 'Le livreur Denkma n’encaisse pas pour vous : convenez du paiement avec le client avant le départ du colis.' : 'Le client vous paiera à la réception de sa commande.' };
  return { label: 'Paiement non confirmé', tone: 'neutral', hint: 'Confirmez le paiement quand le client vous a payé.' };
}

export function canConfirmPayment(order: OrderLike | null | undefined): boolean {
  return Boolean(order) && !isPaid(order) && !['cancelled', 'rejected'].includes(order?.status || '');
}

export function canUndoPayment(order: OrderLike | null | undefined): boolean {
  return isPaid(order) && !CLOSED.includes(order?.status || '');
}

// Avant « Prête » : un livreur va partir avec un colis que le client devait payer avant la livraison.
export function unpaidReadyWarning(order: OrderLike | null | undefined): string | null {
  const wallet = walletLabel(order?.payment?.method);
  if (isPaid(order) || !wallet) return null;
  return usesDenkma(order)
    ? `Le client n’a pas encore payé avec ${wallet}. Demander quand même le livreur Denkma ?`
    : `Le client n’a pas encore payé avec ${wallet}. Marquer quand même la commande comme prête ?`;
}

// Avant « Livrer » : une commande dont le paiement n'est pas confirmé devient une vente à crédit, sauf si le
// commerçant indique que le client l'a payé à la réception.
export function deliveryPaymentQuestion(order: OrderLike | null | undefined): string | null {
  if (!order || isPaid(order)) return null;
  return 'Le client vous a-t-il payé à la réception ? Sinon, la vente sera enregistrée à crédit et le montant restera dû dans le compte du client.';
}

export function nextStep(order: OrderLike | null | undefined): NextStep | null {
  const status = order?.status || '';
  if (!order || CLOSED.includes(status)) return null;
  const wallet = walletLabel(order.payment?.method);
  if (order.payment?.status === 'declared') {
    return { action: 'payment', label: 'Paiement reçu', hint: `Le client dit avoir payé. Vérifiez ${wallet ? `dans ${wallet}` : 'sur votre compte'}, puis confirmez.` };
  }
  if (status === 'pending') {
    if (wallet && !isPaid(order)) {
      return { action: 'payment', label: 'Paiement reçu', hint: `Dès que le paiement ${wallet} du client est arrivé, confirmez-le : la commande sera confirmée du même geste.` };
    }
    return { action: 'confirm', label: 'Confirmer la commande', hint: order.payment?.method === 'on_delivery' ? 'Le client paiera à la livraison. Confirmez si vous acceptez la commande.' : 'Confirmez la commande pour commencer à la préparer.' };
  }
  if (status === 'confirmed' || status === 'preparing') {
    return { action: 'ready', label: 'Prête', hint: usesDenkma(order) ? 'Quand le colis est emballé, touchez « Prête » : un livreur Denkma viendra le chercher.' : 'Quand la commande est emballée, touchez « Prête ».' };
  }
  if (usesDenkma(order)) {
    // Le livreur est en route : il ne repart avec le colis qu'après avoir saisi le code du commerçant.
    if (order.delivery?.collection_code) {
      return { action: null, label: '', hint: 'Un livreur Denkma arrive. Donnez-lui le code affiché ci-dessus quand vous lui remettez le colis.' };
    }
    return { action: null, label: '', hint: 'Denkma s’occupe de la livraison : la commande passera à « Livrée » toute seule.' };
  }
  return { action: 'deliver', label: 'Livrer et créer la vente', hint: 'Quand le client a reçu sa commande, enregistrez la vente.' };
}
