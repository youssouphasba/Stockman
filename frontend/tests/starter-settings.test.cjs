const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createHarness } = require('./helpers/settingsHarness.cjs');

function content(harness) {
  const layout = harness.nodes().find((node) => node.type === harness.layout.default);
  assert.ok(layout);
  return { layout, nodes: harness.renderedNodes(harness.layout.default(layout.props)) };
}

const site = { slug: 'store', site_url: 'https://app.stockman.pro/shop/store', store_id: 'store', enabled: false, custom_domain: 'www.stockman-test.example', domain_mode: 'connect' };

test('Native Starter settings show exactly the six requested main sections', () => {
  const h = createHarness();
  const { nodes } = content(h);
  const labels = nodes.filter((node) => node.type === 'Text').map((node) => node.props.children);
  assert.deepEqual(labels, ['Ma boutique', 'Boutique en ligne', 'Mon compte', 'Notifications', 'Mon abonnement', 'Aide et informations']);
  assert.equal(nodes.filter((node) => node.type === 'TouchableOpacity').length, 6);
  assert.equal(h.calls.length, 0);
});

test('Subscribed Pro, Enterprise, web and demo accounts retain the original settings tree', () => {
  for (const options of [
    { user: { user_id: 'pro', role: 'shopkeeper', subscription_plan: 'pro', effective_plan: 'starter' } },
    { user: { user_id: 'enterprise', role: 'shopkeeper', subscription_plan: 'enterprise' } },
    { platform: 'web' },
    { user: { user_id: 'demo', role: 'shopkeeper', subscription_plan: 'starter', is_demo: true } },
    { user: { user_id: 'staff', role: 'staff', subscription_plan: 'starter' }, auth: { isOrgAdmin: false, isBillingAdmin: false } },
  ]) {
    const h = createHarness(options);
    const { layout } = content(h);
    assert.equal(layout.props.enabled, false);
    assert.equal(h.layout.default(layout.props).props.children, layout.props.children);
  }
});

test('Store documents keep advanced values when saving from the simplified form', async () => {
  const saved = { name: 'store-name', address: 'store-address', invoice_label: '', invoice_prefix: '', invoice_footer: 'invoice-footer', invoice_payment_terms: 'payment-terms', receipt_footer: 'receipt-footer', receipt_business_name: 'receipt-name', invoice_business_name: 'invoice-name', invoice_business_address: 'invoice-address' };
  const h = createHarness({ states: {
    starterSection: 'store', storeName: saved.name, storeAddress: saved.address,
    invoiceLabel: saved.invoice_label, invoicePrefix: saved.invoice_prefix, invoiceFooter: saved.invoice_footer,
    invoicePaymentTerms: saved.invoice_payment_terms, receiptFooter: saved.receipt_footer,
    receiptName: saved.receipt_business_name, invoiceName: saved.invoice_business_name, invoiceAddress: saved.invoice_business_address,
  } });
  const { nodes } = content(h);
  assert.ok(nodes.some((node) => node.props.placeholder === 'settings.invoice_name_placeholder'));
  assert.ok(!nodes.some((node) => node.props.placeholder === 'settings.invoice_prefix_placeholder'));
  const save = nodes.find((node) => node.props.onPress?.name === 'saveActiveStoreSettings');
  await save.props.onPress();
  const call = h.calls.find(([name]) => name === 'stores.update');
  assert.equal(call[1], 'store');
  assert.deepEqual(JSON.parse(JSON.stringify(call[2])), saved);
  assert.equal(h.calls.some(([name]) => name === 'settings.update'), false);
});

test('Document personalization is still available behind More options', () => {
  const h = createHarness({ states: { starterSection: 'store', showDocumentOptions: true } });
  const { nodes } = content(h);
  for (const field of ['invoice_prefix', 'invoice_type', 'invoice_payment_terms', 'invoice_footer', 'receipt_footer']) {
    assert.ok(nodes.some((node) => node.props.placeholder === `settings.${field}_placeholder`), field);
  }
});

test('Saving site text does not resend or reset a verified domain', async () => {
  const h = createHarness({ states: { starterSection: 'online', ecommerceSite: site } });
  const helper = h.load('utils/starterSettings.ts');
  const draft = helper.createEcommerceDraft(site);
  assert.deepEqual(JSON.parse(JSON.stringify(helper.buildEcommerceSettingsUpdate(site, draft))), {});
  assert.deepEqual(JSON.parse(JSON.stringify(helper.buildEcommerceSettingsUpdate(site, { ...draft, welcome_message: 'new-description' }))), { welcome_message: 'new-description' });
  assert.deepEqual(JSON.parse(JSON.stringify(helper.buildEcommerceSettingsUpdate(site, draft, true))), { enabled: true });
  assert.equal('store_id' in helper.buildEcommerceSettingsUpdate(site, { store_id: '' }), false);
});

test('Site activation uses the existing API and keeps hidden fields unchanged', async () => {
  const base = createHarness().load('utils/starterSettings.ts');
  const h = createHarness({ states: { starterSection: 'online', ecommerceSite: site, ecommerceDraft: base.createEcommerceDraft(site) } });
  const { nodes } = content(h);
  assert.ok(!nodes.some((node) => node.props.placeholder === 'www.votredomaine.com'));
  const toggle = nodes.find((node) => node.type === 'Switch' && String(node.props.onValueChange).includes('saveEcommerceSettings'));
  await toggle.props.onValueChange(true);
  const call = h.calls.find(([name]) => name === 'ecommerce.updateSite');
  assert.deepEqual(JSON.parse(JSON.stringify(call[1])), { enabled: true });
});

test('Online settings remain reachable without a site or without an active store', () => {
  for (const currentStore of [null, { store_id: 'store' }]) {
    const h = createHarness({ states: { starterSection: 'online', currentStore, ecommerceSite: null } });
    const { nodes } = content(h);
    assert.ok(nodes.some((node) => node.type === 'Text' && node.props.children === 'Boutique en ligne'));
    assert.equal(nodes.some((node) => node.type === 'Switch'), false);
    assert.ok(nodes.some((node) => node.type === (currentStore ? 'TouchableOpacity' : 'StoreSelector')));
  }
});

test('Existing E-com orders and preview remain available with a disabled site', async () => {
  const h = createHarness({ states: { starterSection: 'online', ecommerceSite: site } });
  const { nodes } = content(h);
  const orders = nodes.find((node) => node.props.onPress && String(node.props.onPress).includes("source: 'ecommerce'"));
  orders.props.onPress();
  assert.equal(h.calls.find(([name]) => name === 'navigate')[1].params.tab, 'web');
  const preview = nodes.find((node) => node.props.onPress && String(node.props.onPress).includes('openEcommercePreview'));
  await preview.props.onPress();
  await Promise.resolve();
  assert.ok(h.calls.some(([name, url]) => name === 'openURL' && url.endsWith('?preview=1')));
});

test('The notification toggle writes only its existing preference', async () => {
  const h = createHarness({ states: { starterSection: 'notifications' } });
  const { nodes } = content(h);
  const toggle = nodes.find((node) => node.type === 'Switch');
  assert.ok(toggle);
  await toggle.props.onValueChange();
  const call = h.calls.find(([name]) => name === 'settings.update');
  assert.deepEqual(JSON.parse(JSON.stringify(call[1])), { push_notifications: false });
  assert.equal(nodes.filter((node) => node.type === 'TextInput').length, 0);
});

test('Advanced notification severity values survive simple preference saves', async () => {
  const preferences = { in_app: false, push: true, email: true, minimum_severity_for_push: 'info', minimum_severity_for_email: 'warning' };
  const h = createHarness({ states: { starterSection: 'notifications', showNotificationOptions: true, notificationPreferences: preferences } });
  const { nodes } = content(h);
  const save = nodes.find((node) => node.props.onPress?.name === 'saveNotificationPreferences');
  await save.props.onPress();
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls.find(([name]) => name === 'settings.update')[1])), { push_notifications: true, notification_preferences: preferences });
  assert.ok(!nodes.some((node) => node.type === 'TextInput'));
});

test('Security, language, theme and stored accounts retain their handlers', async () => {
  const h = createHarness({ states: { starterSection: 'account' } });
  const { nodes } = content(h);
  nodes.find((node) => node.props.onPress?.name === 'handleTogglePin').props.onPress();
  assert.equal(h.calls.find(([name]) => name === 'navigate')[1], '/pin');
  nodes.find((node) => node.type === 'Switch').props.onValueChange(true);
  assert.ok(h.calls.some(([name, value]) => name === 'theme' && value === 'dark'));
  assert.ok(nodes.some((node) => node.props.onPress?.name === 'handleToggleBiometrics'));
  assert.ok(nodes.some((node) => String(node.props.onPress).includes('setShowLanguageModal(true)')));
  assert.ok(nodes.some((node) => String(node.props.onPress).includes('setShowAccountSwitcher(true)')));
  nodes.find((node) => node.props.onPress?.name === 'handleLogout').props.onPress();
  assert.ok(h.calls.some(([name]) => name === 'alert'));
  assert.ok(!h.calls.some(([name]) => name === 'logout'));
});

test('Help preserves sync, support, export and the existing account deletion modal', async () => {
  const h = createHarness({ states: { starterSection: 'help' }, sync: { isOnline: false, pendingCount: 3 } });
  const { nodes } = content(h);
  assert.ok(nodes.some((node) => node.props.onPress?.name === 'prefetchData' && node.props.disabled));
  assert.ok(nodes.some((node) => node.props.onPress?.name === 'processQueue' && node.props.disabled));
  assert.ok(nodes.some((node) => String(node.props.onPress).includes('setShowSupportModal(true)')));
  const remove = nodes.find((node) => String(node.props.onPress).includes('setShowDeleteModal(true)'));
  remove.props.onPress();
  assert.equal(h.values.showDeleteModal, true);
  assert.ok(h.nodes().some((node) => node.type === 'DeleteAccountModal'));
  await nodes.find((node) => node.props.onPress?.name === 'handleExportData').props.onPress();
  assert.ok(h.calls.some(([name]) => name === 'exportData'));
});

test('Legacy settings deep links and E-com events select the matching Starter section', () => {
  const groups = { storeDocuments: 'store', tax: 'store', storeEcommerce: 'online', security: 'account', billing: 'billing', support: 'help', sync: 'help', accountAlerts: 'notifications' };
  for (const [section, group] of Object.entries(groups)) {
    const h = createHarness({ params: { section } });
    h.effects.find((effect) => String(effect).includes('SETTINGS_SECTION_KEYS'))();
    h.effects.find((effect) => String(effect).includes('setShowDocumentOptions(false)'))();
    assert.equal(h.values.starterSection, group);
  }
  const repeated = createHarness({ params: { section: ['storeEcommerce', 'security'] } });
  repeated.effects.find((effect) => String(effect).includes('SETTINGS_SECTION_KEYS'))();
  repeated.effects.find((effect) => String(effect).includes('setShowDocumentOptions(false)'))();
  assert.equal(repeated.values.starterSection, 'online');
  const h = createHarness();
  h.effects.find((effect) => String(effect).includes('settings:open-ecommerce'))();
  h.events.get('settings:open-ecommerce')();
  assert.equal(h.values.starterSection, 'online');
});

test('A settings response that arrives after leaving the account cannot replace the current state', async () => {
  let resolve;
  const h = createHarness({ services: { settings: { get: () => new Promise((done) => { resolve = done; }) } } });
  const cleanup = h.focusEffects[0]();
  cleanup();
  resolve({ modules: { crm: false } });
  await new Promise(setImmediate);
  assert.deepEqual(h.values.settingsData.modules, {});
});

test('Android back returns to the six settings sections before leaving Settings', () => {
  const h = createHarness({ states: { starterSection: 'store' } });
  content(h);
  h.focusEffects.at(-1)();
  assert.equal(h.events.get('back')(), true);
  assert.equal(h.values.starterSection, null);
});

test('Loading a store preserves its explicit blank document fields instead of account defaults', async () => {
  const store = { store_id: 'store', invoice_prefix: '', invoice_label: '', receipt_footer: '', invoice_footer: '' };
  const h = createHarness({ services: {
    settings: { get: async () => ({ modules: {}, invoice_prefix: 'ACCOUNT', invoice_label: 'Account label', receipt_footer: 'Account footer' }) },
    stores: { list: async () => [store] },
  } });
  h.focusEffects[0]();
  await new Promise(setImmediate);
  assert.equal(h.values.invoicePrefix, '');
  assert.equal(h.values.invoiceLabel, '');
  assert.equal(h.values.receiptFooter, '');
  assert.equal(h.values.currentStore.store_id, 'store');
});

test('Opening Starter settings does not change tax values or organization modules', () => {
  const settingsData = { modules: { crm: true, stock_management: false, reservations: true }, tax_enabled: true, tax_rate: 7.5, tax_mode: 'ht' };
  const h = createHarness({ states: { starterSection: 'store', settingsData } });
  const { nodes } = content(h);
  assert.ok(nodes.some((node) => node.type === 'TextInput' && node.props.value === '7.5'));
  assert.equal(h.values.settingsData, settingsData);
  assert.equal(h.calls.length, 0);
});
