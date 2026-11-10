const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function loadPayment() {
  const exports = {};
  const compiled = ts.transpileModule(read('frontend/utils/orderPayment.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, { exports });
  return exports;
}

// Commandes techniques de test : valeurs neutres, jamais affichées par l'application.
const wave = { status: 'pending', payment: { method: 'wave', status: 'awaiting' } };
const denkma = { provider: 'denkma' };

test('Mobile and web share the same payment rules', () => {
  assert.equal(read('frontend/utils/orderPayment.ts'), read('web-app/src/lib/orderPayment.ts'));
});

test('The payment state names the operator the customer chose', () => {
  const p = loadPayment();
  assert.equal(p.paymentState(wave).label, 'Paiement Wave attendu');
  assert.equal(p.paymentState({ status: 'pending', payment: { method: 'orange_money', status: 'awaiting' } }).label, 'Paiement Orange Money attendu');
  assert.equal(p.paymentState({ payment: { method: 'on_delivery', status: 'awaiting' } }).label, 'Paiement à la livraison');
  const declared = p.paymentState({ payment: { method: 'orange_money', status: 'declared' } });
  assert.equal(declared.tone, 'warning');
  assert.match(declared.hint, /dans Orange Money/);
  assert.deepEqual({ ...p.paymentState({ payment: { method: 'wave', status: 'paid' } }) }, { label: 'Payée', tone: 'success', hint: 'Vous avez confirmé avoir reçu le paiement.' });
  // Commande passée avant le réglage du paiement : elle peut quand même être marquée payée.
  assert.equal(p.paymentState({ status: 'confirmed' }).label, 'Paiement non confirmé');
  // Autoriser l'expédition n'est pas confirmer l'encaissement.
  const unpaid = { status: 'ready', payment: { method: 'wave', status: 'awaiting' }, delivery: { provider: 'denkma', authorized_unpaid_at: '2026-11-10T12:00:00Z' } };
  assert.deepEqual([p.paymentState(unpaid).label, p.paymentState(unpaid).tone], ['Expédiée sans paiement confirmé', 'warning']);
  assert.equal(p.paymentState({ ...unpaid, payment: { method: 'wave', status: 'paid' } }).label, 'Payée');
  assert.match(p.paymentState({ payment: { method: 'on_delivery', status: 'awaiting' }, delivery: { provider: 'denkma' } }).hint, /n’encaisse pas pour vous/);
  assert.equal(p.orderStatusLabel('pending'), 'Nouvelle');
  assert.equal(p.orderStatusLabel('ready'), 'Prête');
});

test('One next step is put forward at each stage of an order', () => {
  const p = loadPayment();
  assert.equal(p.nextStep(wave).action, 'payment');
  assert.equal(p.nextStep({ status: 'pending', payment: { method: 'on_delivery', status: 'awaiting' } }).action, 'confirm');
  assert.equal(p.nextStep({ status: 'pending' }).action, 'confirm');
  // Le client dit avoir payé : vérifier le paiement passe avant tout, même sur une commande déjà confirmée.
  assert.equal(p.nextStep({ status: 'confirmed', payment: { method: 'wave', status: 'declared' } }).action, 'payment');
  assert.equal(p.nextStep({ status: 'confirmed', payment: { method: 'wave', status: 'paid' } }).action, 'ready');
  assert.match(p.nextStep({ status: 'preparing', delivery: denkma }).hint, /livreur Denkma/);
  assert.equal(p.nextStep({ status: 'ready' }).action, 'deliver');
  // Denkma livre : la commande passera à « Livrée » toute seule, aucun geste n'est demandé.
  assert.equal(p.nextStep({ status: 'ready', delivery: denkma }).action, null);
  for (const status of ['delivered', 'cancelled', 'rejected']) assert.equal(p.nextStep({ status }), null);
});

test('A Denkma order shows the code for the courier and never waits for a photo', () => {
  const shipping = {};
  vm.runInNewContext(ts.transpileModule(read('frontend/utils/denkmaShipping.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: shipping });
  assert.equal(shipping.collectionCode({ collection_code: '123456' }), '123 456');
  assert.equal(shipping.collectionCode({ collection_code: null }), null);
  assert.equal(shipping.collectionCode(null), null);
  const p = loadPayment();
  assert.match(p.nextStep({ status: 'ready', delivery: { provider: 'denkma', collection_code: '123456' } }).hint, /Donnez-lui le code/);
  for (const file of ['frontend/app/(tabs)/orders.tsx', 'web-app/src/components/Orders.tsx']) assert.match(read(file), /collectionCode\(/);
  // La photo du colis est facultative dans les deux fenêtres d'expédition.
  for (const file of ['frontend/components/DenkmaShipModal.tsx', 'web-app/src/components/DenkmaShipDialog.tsx']) {
    const source = read(file);
    assert.match(source, /if \(photo\) form\.append\('photo'/);
    assert.match(source, /const ready = paid && !busy;/);
  }
});

test('Payment can be confirmed once and corrected until delivery', () => {
  const p = loadPayment();
  const paid = { status: 'confirmed', payment: { method: 'wave', status: 'paid' } };
  assert.equal(p.canConfirmPayment(wave), true);
  assert.equal(p.canConfirmPayment(paid), false);
  assert.equal(p.canConfirmPayment({ ...wave, status: 'cancelled' }), false);
  assert.equal(p.canUndoPayment(paid), true);
  assert.equal(p.canUndoPayment({ ...paid, status: 'delivered' }), false);
  assert.equal(p.canUndoPayment(wave), false);
});

test('Marking an order ready warns when a mobile payment has not arrived', () => {
  const p = loadPayment();
  assert.match(p.unpaidReadyWarning({ ...wave, status: 'confirmed', delivery: denkma }), /Wave.*livreur Denkma/);
  assert.match(p.unpaidReadyWarning({ status: 'confirmed', payment: { method: 'orange_money', status: 'declared' } }), /Orange Money/);
  assert.equal(p.unpaidReadyWarning({ status: 'confirmed', payment: { method: 'wave', status: 'paid' } }), null);
  assert.equal(p.unpaidReadyWarning({ status: 'confirmed', payment: { method: 'on_delivery', status: 'awaiting' } }), null);
});

test('Both storefronts offer the payment choice and the payment page of the placed order', () => {
  const panel = read('web-app/src/storefront/OrderPayment.tsx');
  // Le jeton du client voyage dans un en-tête ou dans le corps, jamais dans une adresse.
  assert.match(panel, /headers: \{ 'X-Order-Token': token \}/);
  assert.match(panel, /payment\/declared`/);
  assert.match(panel, /body: JSON\.stringify\(\{ token \}\)/);
  assert.doesNotMatch(panel, /\?token=/);
  assert.match(panel, /document\.visibilityState !== 'visible'/);
  const hook = read('web-app/src/storefront/useStorefrontCommerce.ts');
  assert.match(hook, /\.\.\.\(paymentMethod \? \{ payment_method: paymentMethod \} : \{\}\)/);
  assert.match(hook, /token: data\.payment_token/);
  for (const file of ['web-app/src/storefront/commerce-ui.tsx', 'web-app/src/app/shop/[slug]/StorefrontClient.tsx']) {
    const source = read(file);
    assert.match(source, /<PaymentChoice options=/);
    assert.match(source, /<OrderPaymentPanel state=/);
  }
});

test('Merchant screens confirm a payment through the payment route, on web and mobile', () => {
  for (const file of ['frontend/services/api.ts', 'web-app/src/services/api.ts']) {
    assert.match(read(file), /orders\/\$\{encodeURIComponent\(orderId\)\}\/payment`, \{ method: 'PUT', body: \{ paid \} \}/);
  }
  for (const file of ['frontend/app/(tabs)/orders.tsx', 'web-app/src/components/Orders.tsx']) {
    const source = read(file);
    assert.match(source, /ecommerceApi\.updateOrderPayment\(orderId, paid\)/);
    assert.match(source, /unpaidReadyWarning\(order\)/);
    assert.match(source, /nextStep\(/);
  }
  for (const file of ['frontend/components/EcommercePaymentCard.tsx', 'web-app/src/components/EcommercePaymentSettings.tsx']) {
    const source = read(file);
    for (const field of ['wave_phone', 'wave_name', 'wave_link', 'orange_money_phone', 'orange_money_name', 'pay_on_delivery', 'payment_instructions']) {
      assert.match(source, new RegExp(`onChange\\(\\{ ${field}:`), `${file} ${field}`);
    }
  }
  const draft = read('frontend/utils/starterSettings.ts');
  assert.match(draft, /orange_money_phone: site\?\.orange_money_phone \?\? ''/);
  assert.match(draft, /pay_on_delivery: site\?\.pay_on_delivery !== false/);
});
