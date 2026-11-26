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
  delivery?: { provider?: string; denkma_status?: string | null; parcel_status?: string | null; collection_code?: string | null; shipped_at?: string | null; authorized_unpaid_at?: string | null } | null;
};

export type Tone = 'neutral' | 'progress' | 'warning' | 'success';

// Traduction des libellés : le français sert de texte par défaut. L'application branche sa propre fonction
// de traduction au démarrage (setOrderPaymentTranslator) ; sans elle, les textes restent en français.
type Translator = (key: string, fallback: string, vars?: Record<string, string>) => string;
const fill = (text: string, vars?: Record<string, string>) => text.replace(/\{\{(\w+)\}\}/g, (_m, name) => vars?.[name] ?? '');
let translate: Translator = (_key, fallback, vars) => fill(fallback, vars);
export function setOrderPaymentTranslator(fn: Translator): void {
  translate = fn;
}
const tr = (key: string, fallback: string, vars?: Record<string, string>) => translate(`order_payment.${key}`, fallback, vars);
export type NextStep = { action: 'payment' | 'confirm' | 'prepare' | 'ready' | 'deliver' | null; label: string; hint: string };

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
  const key = status || '';
  return STATUS_LABELS[key] ? tr(`status_${key}`, STATUS_LABELS[key]) : key;
}

function isPaid(order: OrderLike | null | undefined): boolean {
  return order?.payment?.status === 'paid';
}

function usesDenkma(order: OrderLike | null | undefined): boolean {
  return order?.delivery?.provider === 'denkma';
}

// « Livrer avec Denkma » already prepared and dispatched the parcel: the
// order may still read « confirmed », but there is nothing left to mark ready.
function denkmaLaunched(order: OrderLike | null | undefined): boolean {
  const delivery = order?.delivery;
  return usesDenkma(order) && (delivery?.denkma_status === 'dispatching' || delivery?.denkma_status === 'dispatched' || !!delivery?.shipped_at || !!delivery?.collection_code);
}

export function paymentState(order: OrderLike | null | undefined): { label: string; tone: Tone; hint: string } {
  const payment = order?.payment;
  if (payment?.status === 'paid') return { label: tr('paid', 'Payée'), tone: 'success', hint: tr('paid_hint', 'Vous avez confirmé avoir reçu le paiement.') };
  // Autoriser l'expédition n'est pas confirmer l'encaissement : le paiement reste à suivre.
  if (order?.delivery?.authorized_unpaid_at) return { label: tr('shipped_unpaid', 'Expédiée sans paiement confirmé'), tone: 'warning', hint: tr('shipped_unpaid_hint', 'Vous avez autorisé l’expédition avant d’avoir reçu le paiement. Confirmez « Paiement reçu » dès que le client vous a payé.') };
  const wallet = walletLabel(payment?.method);
  if (payment?.status === 'declared') return { label: tr('declared', 'Le client dit avoir payé'), tone: 'warning', hint: wallet ? tr('declared_hint_wallet', 'Vérifiez dans {{wallet}} que l’argent est arrivé, puis confirmez.', { wallet }) : tr('declared_hint', 'Vérifiez sur votre compte que l’argent est arrivé, puis confirmez.') };
  if (wallet) return { label: tr('wallet_expected', 'Paiement {{wallet}} attendu', { wallet }), tone: 'progress', hint: tr('wallet_expected_hint', 'Le client a vu votre numéro {{wallet}} et le montant à payer.', { wallet }) };
  if (payment?.method === 'on_delivery') return { label: tr('on_delivery', 'Paiement à la livraison'), tone: 'neutral', hint: usesDenkma(order) ? tr('on_delivery_denkma_hint', 'Le livreur Denkma n’encaisse pas pour vous : convenez du paiement avec le client avant le départ du colis.') : tr('on_delivery_hint', 'Le client vous paiera à la réception de sa commande.') };
  return { label: tr('unconfirmed', 'Paiement non confirmé'), tone: 'neutral', hint: tr('unconfirmed_hint', 'Confirmez le paiement quand le client vous a payé.') };
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
    ? tr('unpaid_ready_denkma', 'Le client n’a pas encore payé avec {{wallet}}. Demander quand même le livreur Denkma ?', { wallet })
    : tr('unpaid_ready', 'Le client n’a pas encore payé avec {{wallet}}. Marquer quand même la commande comme prête ?', { wallet });
}

// Avant « Livrer » : une commande dont le paiement n'est pas confirmé devient une vente à crédit, sauf si le
// commerçant indique que le client l'a payé à la réception.
export function deliveryPaymentQuestion(order: OrderLike | null | undefined): string | null {
  if (!order || isPaid(order)) return null;
  return tr('delivery_question', 'Le client vous a-t-il payé à la réception ? Sinon, la vente sera enregistrée à crédit et le montant restera dû dans le compte du client.');
}

export function nextStep(order: OrderLike | null | undefined): NextStep | null {
  const status = order?.status || '';
  if (!order || CLOSED.includes(status)) return null;
  const wallet = walletLabel(order.payment?.method);
  if (order.payment?.status === 'declared') {
    return { action: 'payment', label: tr('step_payment', 'Paiement reçu'), hint: wallet ? tr('step_declared_hint_wallet', 'Le client dit avoir payé. Vérifiez dans {{wallet}}, puis confirmez.', { wallet }) : tr('step_declared_hint', 'Le client dit avoir payé. Vérifiez sur votre compte, puis confirmez.') };
  }
  if (status === 'pending') {
    if (wallet && !isPaid(order)) {
      return { action: 'payment', label: tr('step_payment', 'Paiement reçu'), hint: tr('step_wallet_hint', 'Dès que le paiement {{wallet}} du client est arrivé, confirmez-le : la commande sera confirmée du même geste.', { wallet }) };
    }
    return { action: 'confirm', label: tr('step_confirm', 'Confirmer la commande'), hint: order.payment?.method === 'on_delivery' ? tr('step_confirm_on_delivery_hint', 'Le client paiera à la livraison. Confirmez si vous acceptez la commande.') : tr('step_confirm_hint', 'Confirmez la commande pour commencer à la préparer.') };
  }
  // Ordre des étapes : confirmée, puis « En préparation », puis « Prête », puis livrée.
  if (status === 'confirmed' && !denkmaLaunched(order)) {
    return { action: 'prepare', label: tr('step_prepare', 'En préparation'), hint: tr('step_prepare_hint', 'Quand vous commencez à préparer la commande, touchez « En préparation ».') };
  }
  if (status === 'preparing' && !denkmaLaunched(order)) {
    return { action: 'ready', label: tr('step_ready', 'Prête'), hint: usesDenkma(order) ? tr('step_ready_denkma_hint', 'Quand le colis est emballé, touchez « Prête » : un livreur Denkma viendra le chercher.') : tr('step_ready_hint', 'Quand la commande est emballée, touchez « Prête ».') };
  }
  if (usesDenkma(order)) {
    // Le livreur est en route : il ne repart avec le colis qu'après avoir saisi le code du commerçant.
    if (order.delivery?.collection_code) {
      return { action: null, label: '', hint: tr('step_courier_hint', 'Un livreur Denkma arrive. Donnez-lui le code affiché ci-dessus quand vous lui remettez le colis.') };
    }
    return { action: null, label: '', hint: tr('step_denkma_hint', 'Denkma s’occupe de la livraison : la commande passera à « Livrée » toute seule.') };
  }
  return { action: 'deliver', label: tr('step_deliver', 'Livrer et créer la vente'), hint: tr('step_deliver_hint', 'Quand le client a reçu sa commande, enregistrez la vente.') };
}
