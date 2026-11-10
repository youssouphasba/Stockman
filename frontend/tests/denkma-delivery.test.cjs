const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function loadShipping() {
  const exports = {};
  const compiled = ts.transpileModule(read('frontend/utils/denkmaShipping.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, { exports });
  return exports;
}

// Commandes techniques de test : valeurs neutres, jamais affichées par l'application.
const order = { status: 'confirmed', total_amount: 10000, delivery_fee: 1750, amount_due: 11750, delivery: { provider: 'denkma', mode: 'home_to_relay', relay_name: 'Relais Test', fee: 1750, status: 'registered', denkma_status: 'ready_for_quote' } };

test('Mobile and web share the same Denkma shipping rules', () => {
  assert.equal(read('frontend/utils/denkmaShipping.ts'), read('web-app/src/lib/denkmaShipping.ts'));
});

test('A Denkma order shows its destination, state and amount due, and ships only once', () => {
  const s = loadShipping();
  assert.equal(s.denkmaDestination(order.delivery), 'Point relais : Relais Test');
  assert.equal(s.denkmaDestination({ mode: 'home_to_home' }), 'À domicile : position confirmée par le client');
  assert.equal(s.denkmaState(order.delivery).label, 'Prête à expédier');
  assert.equal(s.denkmaState({ ...order.delivery, denkma_status: 'awaiting_funding' }).tone, 'warning');
  assert.deepEqual({ ...s.denkmaState({ ...order.delivery, parcel_status: 'delivered' }) }, { label: 'Livré', tone: 'success' });
  assert.equal(s.denkmaState({ ...order.delivery, status: 'sync_failed' }).tone, 'warning');
  // Le colis créé attend son livreur : il n'est pas encore pris en charge.
  assert.equal(s.denkmaState({ ...order.delivery, parcel_status: 'created' }).label, 'En attente de collecte');
  // Une annulation n'est annoncée qu'une fois confirmée par Denkma.
  assert.deepEqual({ ...s.denkmaState({ ...order.delivery, parcel_status: 'created', cancel_state: 'pending' }) }, { label: 'Annulation de la livraison en cours chez Denkma', tone: 'warning' });
  assert.equal(s.denkmaState({ ...order.delivery, cancel_state: 'refused', cancel_error: 'Le colis est déjà parti.' }).label, 'Le colis est déjà parti.');
  assert.equal(s.denkmaState({ ...order.delivery, denkma_status: 'cancelled', cancel_state: 'done' }).label, 'Livraison annulée');
  assert.equal(s.canShipWithDenkma(order), true);
  for (const variant of [{ ...order, status: 'delivered' }, { ...order, delivery: { ...order.delivery, denkma_status: 'dispatched' } }, { ...order, delivery: { ...order.delivery, parcel_status: 'created' } }, { ...order, delivery: null }]) {
    assert.equal(s.canShipWithDenkma(variant), false);
  }
  assert.equal(s.amountDue(order), 11750);
  assert.equal(s.amountDue({ total_amount: 10000, delivery: { provider: 'denkma', fee: 500 } }), 10500);
});

test('The storefront replaces the written address by the Denkma choice and sends only the session', () => {
  const picker = read('web-app/src/storefront/DenkmaDelivery.tsx');
  assert.match(picker, /body: JSON\.stringify\(\{ mode, page_origin: window\.location\.origin \}\)/);
  assert.match(picker, /event\.origin === origin && event\.data\?\.type === 'denkma-destination'/);
  assert.match(picker, /allow="geolocation"/);
  const cart = read('web-app/src/storefront/commerce-ui.tsx');
  assert.match(cart, /denkma\.available \|\| denkma\.loading \? \(/);
  assert.match(cart, /commerce\.submitOrder\(form, denkma\.choice \? \{ destination_session_id: denkma\.choice\.sessionId \} : null, paymentMethod\)/);
  const config = read('web-app/next.config.ts');
  assert.match(config, /frame-src [^"]*https:\/\/api\.denkma\.com/);
  assert.match(config, /geolocation=\("https:\/\/api\.denkma\.com"\)/);
  for (const file of ['frontend/app/(tabs)/orders.tsx', 'web-app/src/components/Orders.tsx']) assert.doesNotMatch(read(file), /utils\/denkma'/);
  for (const file of ['frontend/components/DenkmaShipModal.tsx', 'web-app/src/components/DenkmaShipDialog.tsx']) {
    const source = read(file);
    assert.match(source, /form\.append\('customer_paid', 'true'\)/);
    assert.match(source, /shipWithDenkma\(order\.order_id, form\)/);
  }
});

function loadSignup() {
  const exports = {};
  const compiled = ts.transpileModule(read('frontend/utils/denkmaSignup.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, { exports });
  return exports;
}

test('Denkma Pro signup follows the Denkma phone and pickup rules before sending the SMS', () => {
  const s = loadSignup();
  for (const value of ['77 000 00 00', '+221 77 000 00 00', '00221770000000']) assert.equal(s.denkmaPhone(value), '+221770000000');
  assert.equal(s.denkmaPhone('06 12 34 56 78'), '+33612345678');
  for (const value of ['', '12345', '+1 555 000 0000', '88 000 00 00']) assert.equal(s.denkmaPhone(value), null);
  // Formulaire technique de test : valeurs neutres, jamais affichées par l'application.
  const form = { businessName: 'Boutique A', ownerName: 'Responsable A', phone: '77 000 00 00', pin: '4821', pinConfirmation: '4821',
    label: 'Repère de test', city: 'Dakar', accuracy: 12, located: true, acceptedLegal: true };
  assert.equal(s.signupProblem(form), null);
  assert.match(s.signupProblem({ ...form, located: false }), /position de votre point de collecte/);
  assert.match(s.signupProblem({ ...form, accuracy: 85 }), /± 85 m/);
  assert.equal(s.accuracyProblem(60), null);
  assert.match(s.signupProblem({ ...form, pin: '12', pinConfirmation: '12' }), /4 à 12 chiffres/);
  assert.match(s.signupProblem({ ...form, pinConfirmation: '4822' }), /pas identiques/);
  assert.match(s.signupProblem({ ...form, acceptedLegal: false }), /conditions de Denkma/);
  assert.match(s.signupProblem({ ...form, phone: '+225 07 01 02 03 04' }), /Sénégal ou de France/);
});

test('The signup screen is mounted only when open and offers the existing-account connection too', () => {
  const card = read('frontend/components/DenkmaSettingsCard.tsx');
  assert.match(card, /\{signingUp && \(\s*<DenkmaSignupModal/);
  assert.match(card, /J'ai déjà un compte Denkma Pro/);
  assert.match(read('frontend/components/DenkmaSignupModal.tsx'), /source: 'gps'/);
});

test('Once linked, the card sends the merchant to the Denkma app to top up and track parcels', () => {
  const s = loadSignup();
  assert.equal(s.denkmaAppUrl('android'), 'https://play.google.com/store/apps/details?id=com.denkma.app');
  assert.equal(s.denkmaAppUrl('ios'), 'https://apps.apple.com/fr/app/denkma/id6760837156');
  const card = read('frontend/components/DenkmaSettingsCard.tsx');
  assert.match(card, /denkmaAppUrl\(Platform\.OS\)/);
  assert.match(card, /Télécharger l'application Denkma/);
  const panel = read('web-app/src/components/DenkmaSettingsPanel.tsx');
  for (const url of [s.DENKMA_ANDROID_URL, s.DENKMA_IOS_URL, s.DENKMA_PRO_WEB_URL]) assert.ok(panel.includes(url), url);
});
