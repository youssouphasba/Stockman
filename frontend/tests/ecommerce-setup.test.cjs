const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const repo = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(repo, file), 'utf8');
const MOBILE_CONTROLLER = 'frontend/utils/ecommerceSetup.ts';
const WEB_CONTROLLER = 'web-app/src/lib/ecommerceSetup.ts';

function loadController() {
  const timers = [];
  const exports = {};
  const compiled = ts.transpileModule(read(MOBILE_CONTROLLER), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    Math,
    setTimeout: (run, delay) => { const timer = { run, delay, cleared: false }; timers.push(timer); return timer; },
    clearTimeout: (timer) => { if (timer) timer.cleared = true; },
  });
  return { ...exports, timers };
}

// Les objets créés dans le contexte vm ont un autre prototype : on compare des copies simples.
const plain = (value) => JSON.parse(JSON.stringify(value));
const flush = async () => { for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setImmediate(resolve)); };

function harness({ status = { state: 'pending', can_configure: true, site_slug: 'site-a' }, claim, respond } = {}) {
  const module = loadController();
  const calls = [];
  const views = [];
  let configured = 0;
  const api = {
    getSetup: async () => { calls.push(['get']); return status; },
    claimSetup: async (data) => {
      calls.push(['claim', plain(data)]);
      return claim ? claim(data) : { state: 'pending', claim_id: 'c'.repeat(43), retry_after_seconds: 180, site_slug: data.site_slug };
    },
    respondSetup: async (data) => { calls.push(['respond', plain(data)]); return respond ? respond(data) : { state: 'deferred' }; },
    releaseSetup: async (data) => { calls.push(['release', plain(data)]); return { released: true }; },
  };
  const controller = module.createEcommerceSetupController(api, (view) => views.push(plain(view)), () => { configured += 1; });
  return { module, controller, calls, views, last: () => views[views.length - 1], configuredCount: () => configured };
}

test('A pending site for an authorised user shows the proposal with the validated wording', async () => {
  const h = harness();
  h.controller.start();
  await flush();
  assert.deepEqual(h.last(), { visible: true, busy: false, error: null });
  assert.equal(h.module.ECOMMERCE_SETUP_MESSAGE.title, 'Bienvenue dans votre boutique en ligne !');
  assert.equal(h.module.ECOMMERCE_SETUP_MESSAGE.description, "Votre boutique dispose déjà d'un modèle de site prêt à personnaliser. Configurez-le maintenant ou poursuivez votre activité.");
  assert.equal(h.module.ECOMMERCE_SETUP_MESSAGE.configure, 'Configurer mon site');
  assert.equal(h.module.ECOMMERCE_SETUP_MESSAGE.later, 'Plus tard');
});

test('Later is recorded explicitly on the server and does not open the settings', async () => {
  const h = harness();
  h.controller.start();
  await flush();
  await h.controller.respond('later');
  const respond = h.calls.find(([name]) => name === 'respond')[1];
  assert.deepEqual(respond, { site_slug: 'site-a', claim_id: 'c'.repeat(43), decision: 'later' });
  assert.equal(h.last().visible, false);
  assert.equal(h.configuredCount(), 0);
});

test('Configure records the choice then opens Paramètres > Boutique en ligne once', async () => {
  const h = harness({ respond: () => ({ state: 'started' }) });
  h.controller.start();
  await flush();
  await h.controller.respond('configure');
  await h.controller.respond('configure');
  assert.equal(h.configuredCount(), 1);
  assert.equal(h.calls.filter(([name]) => name === 'respond').length, 1);
  assert.equal(h.last().visible, false);
});

test('No claim is made when the server says the proposal is unavailable or already handled', async () => {
  for (const status of [
    { state: 'unavailable', can_configure: false, site_slug: null },
    { state: 'deferred', can_configure: true, site_slug: 'site-a' },
    { state: 'configured', can_configure: true, site_slug: 'site-a' },
  ]) {
    const h = harness({ status });
    h.controller.start();
    await flush();
    assert.equal(h.calls.some(([name]) => name === 'claim'), false);
    assert.equal(h.views.some((view) => view.visible), false);
  }
});

test('A network error while answering is shown and records nothing', async () => {
  let attempts = 0;
  const h = harness({ respond: () => { attempts += 1; if (attempts === 1) throw new Error('offline'); return { state: 'started' }; } });
  h.controller.start();
  await flush();
  await h.controller.respond('configure');
  assert.deepEqual(h.last(), { visible: true, busy: false, error: h.module.ECOMMERCE_SETUP_MESSAGE.error });
  assert.equal(h.configuredCount(), 0);
  await h.controller.respond('configure');
  assert.equal(h.configuredCount(), 1);
  assert.equal(h.last().visible, false);
});

test('Another device holding the proposal keeps it hidden here', async () => {
  const h = harness({ claim: (data) => ({ state: 'pending', claim_id: null, retry_after_seconds: 180, site_slug: data.site_slug }) });
  h.controller.start();
  await flush();
  assert.equal(h.views.some((view) => view.visible), false);
  const retry = h.module.timers.find((timer) => !timer.cleared);
  assert.equal(retry.delay, 180000);
});

test('Leaving the screen releases the lease, including a claim that resolves afterwards', async () => {
  const h = harness();
  h.controller.start();
  await flush();
  h.controller.dispose();
  await flush();
  assert.deepEqual(h.calls.filter(([name]) => name === 'release').map(([, data]) => data), [{ site_slug: 'site-a', claim_id: 'c'.repeat(43) }]);

  let resolveClaim;
  const late = harness({ claim: (data) => new Promise((resolve) => { resolveClaim = () => resolve({ state: 'pending', claim_id: 'd'.repeat(43), retry_after_seconds: 180, site_slug: data.site_slug }); }) });
  late.controller.start();
  await flush();
  assert.equal(typeof resolveClaim, 'function');
  late.controller.dispose();
  resolveClaim();
  await flush();
  assert.equal(late.views.some((view) => view.visible), false);
  assert.deepEqual(late.calls.filter(([name]) => name === 'release').map(([, data]) => data), [{ site_slug: 'site-a', claim_id: 'd'.repeat(43) }]);

  const early = harness();
  early.controller.start();
  early.controller.dispose();
  await flush();
  assert.equal(early.calls.some(([name]) => name === 'claim'), false);
});

test('Mobile and web controllers stay identical and the web never imports mobile code', () => {
  assert.equal(read(WEB_CONTROLLER), read(MOBILE_CONTROLLER));
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(repo, dir), { withFileTypes: true })) {
      const relative = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(relative);
      else if (/\.(ts|tsx)$/.test(entry.name) && /['"](\.\.\/)+frontend\//.test(read(relative))) offenders.push(relative);
    }
  };
  walk('web-app/src');
  assert.deepEqual(offenders, []);
});

test('Proposal calls bypass the offline queue and the web cache', () => {
  const mobile = read('frontend/services/api.ts');
  const requestBody = mobile.slice(mobile.indexOf('async function request<T>'));
  assert.match(requestBody.split('\n')[1], /startsWith\('\/ecommerce\/site\/onboarding'\)\) return rawRequest/);
  const web = read('web-app/src/services/api.ts');
  assert.match(web, /NON_CACHEABLE_GET_PREFIXES = \[\s*'\/ecommerce\/site\/onboarding'/);
  assert.match(web, /startsWith\('\/ecommerce\/site\/onboarding'\)\) return performRequest/);
});

test('Mobile shows the proposal only to native operational admins on E-com or Paramètres', () => {
  const file = 'frontend/app/(tabs)/_layout.tsx';
  const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = {};
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ['canOfferEcommerceSetup', 'onEcommerceSetupScreen'].includes(node.name.getText(source))) {
      declarations[node.name.getText(source)] = node.initializer.getText(source);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const evaluate = (scope) => vm.runInNewContext(`(${declarations.canOfferEcommerceSetup}) && (${declarations.onEcommerceSetupScreen})`, scope);
  const base = { Platform: { OS: 'android' }, isOrgAdmin: true, user: { is_demo: false, can_write_data: true }, currentRoute: 'settings', tab: undefined, source: undefined };
  assert.equal(evaluate(base), true);
  assert.equal(evaluate({ ...base, currentRoute: 'ecommerce' }), true);
  assert.equal(evaluate({ ...base, currentRoute: 'orders', tab: 'web' }), true);
  assert.equal(evaluate({ ...base, currentRoute: 'orders', source: 'ecommerce' }), true);
  assert.equal(evaluate({ ...base, currentRoute: 'orders' }), false);
  assert.equal(evaluate({ ...base, currentRoute: 'products' }), false);
  assert.equal(evaluate({ ...base, Platform: { OS: 'web' } }), false);
  assert.equal(evaluate({ ...base, isOrgAdmin: false }), false);
  assert.equal(evaluate({ ...base, user: { is_demo: true, can_write_data: true } }), false);
  assert.equal(evaluate({ ...base, user: { is_demo: false, can_write_data: false } }), false);
});
