const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function loadHelper() {
  const exports = {};
  const compiled = ts.transpileModule(read('frontend/utils/ecommerceDomain.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, { exports, Date, Number, String, Array });
  return exports;
}

// Sites techniques de test : domaines neutres, jamais affichés par l'application.
const pending = {
  site_url: 'https://app.stockman.pro/shop/senlab', custom_domain: 'www.senlab.com', domain_state: 'dns_pending', domain_redirect_from: 'senlab.com',
  domain_records: [
    { type: 'CNAME', name: 'www', host: 'www.senlab.com', value: 'cname.vercel-dns.com', purpose: 'site' },
    { type: 'A', name: '@', host: 'senlab.com', value: '76.76.21.21', purpose: 'redirect' },
  ],
};

test('Mobile and web share the same domain rules', () => {
  assert.equal(read('frontend/utils/ecommerceDomain.ts'), read('web-app/src/lib/ecommerceDomain.ts'));
});

test('Each connection state has a clear title, and older server answers still work', () => {
  const h = loadHelper();
  assert.equal(h.domainState({ site_url: 'x' }), 'not_connected');
  assert.equal(h.domainState(pending), 'dns_pending');
  assert.equal(h.domainState({ custom_domain: 'www.senlab.com', domain_status: 'verified' }), 'active');
  assert.equal(h.domainState({ custom_domain: 'www.senlab.com', domain_status: 'pending_verification', domain_state: 'inconnu' }), 'dns_pending');
  const expected = {
    not_connected: ['neutral', 'Adresse Stockman active'],
    dns_pending: ['progress', 'En attente de vos réglages DNS'],
    ownership_pending: ['progress', 'Preuve de propriété demandée'],
    certificate_pending: ['progress', 'Sécurisation en cours'],
    activation_pending: ['warning', 'Activation par Stockman'],
    active: ['success', 'Domaine connecté'],
  };
  for (const [state, [tone, title]] of Object.entries(expected)) {
    const site = state === 'not_connected' ? {} : { ...pending, domain_state: state };
    const description = h.describeDomainState(site);
    assert.deepEqual([description.tone, description.title], [tone, title], state);
    assert.ok(description.text.length > 40, state);
  }
  assert.match(h.describeDomainState({ ...pending, domain_state: 'active' }).text, /https:\/\/www\.senlab\.com/);
});

test('Records explain their purpose and the redirect of the bare domain is followed', () => {
  const h = loadHelper();
  const records = h.domainRecords(pending);
  assert.deepEqual(records.map((record) => h.recordPurpose(record, pending)), ['Ouvre votre site sur www.senlab.com', 'Redirige senlab.com vers votre site']);
  assert.equal(h.recordPurpose({ type: 'TXT', name: '_vercel', value: 'vc', purpose: 'ownership' }, pending), 'Prouve que le domaine vous appartient');
  assert.equal(h.redirectHint(pending), null);
  assert.equal(h.redirectHint({ ...pending, domain_state: 'active', domain_redirect_ready: true }), 'senlab.com redirige vers www.senlab.com.');
  assert.match(h.redirectHint({ ...pending, domain_state: 'active', domain_redirect_ready: false }), /enregistrement A sur @/);
  assert.deepEqual(h.domainRecords({ domain_records: [{ type: '', value: '' }] }), []);
});

test('The input is checked before sending and waiting states are checked again on opening', () => {
  const h = loadHelper();
  assert.match(h.domainInputProblem(''), /Saisissez/);
  assert.match(h.domainInputProblem('sen lab.com'), /espace/);
  assert.match(h.domainInputProblem('senlab'), /incomplet/);
  for (const value of ['senlab.com', 'https://www.senlab.com/boutique', 'boutique.senlab.com', 'senlab.com.']) assert.equal(h.domainInputProblem(value), null, value);
  const now = Date.parse('2026-11-08T20:00:00Z');
  assert.equal(h.shouldAutoCheck(pending, now), true);
  assert.equal(h.shouldAutoCheck({ ...pending, domain_checked_at: '2026-11-08T19:59:30Z' }, now), false);
  assert.equal(h.shouldAutoCheck({ ...pending, domain_checked_at: '2026-11-08T19:50:00Z' }, now), true);
  assert.equal(h.shouldAutoCheck({ ...pending, domain_state: 'active' }, now), false);
  assert.equal(h.shouldAutoCheck({ ...pending, domain_state: 'activation_pending' }, now), false);
  const sameDay = h.formatCheckedAt('2026-11-08T10:05:00', new Date('2026-11-08T18:00:00'));
  assert.equal(sameDay, 'Dernière vérification à 10:05');
  assert.equal(h.formatCheckedAt('2026-11-07T10:05:00', new Date('2026-11-08T18:00:00')), 'Dernière vérification le 07/11 à 10:05');
  assert.equal(h.formatCheckedAt('pas une date'), null);
  assert.match(h.DNS_PROVIDERS.find((provider) => provider.key === 'cloudflare').tip, /DNS only/);
});

test('Both settings screens use the dedicated domain flow and never resend the domain with the form', () => {
  const mobile = read('frontend/app/(tabs)/settings.tsx');
  assert.match(mobile, /<EcommerceDomainCard site=\{ecommerceSite\} canEdit=\{canManageStoreSettings\}/);
  const web = read('web-app/src/components/SettingsWorkspace.tsx');
  assert.match(web, /<EcommerceDomainPanel/);
  assert.match(web, /canEdit=\{canManageOrgSettings && !webConsultationOnly\}/);
  for (const source of [mobile, web]) {
    for (const legacy of ['DOMAIN_REGISTRAR_OPTIONS', 'domainSetupChecklist', 'verifyDomain', 'custom_domain:']) assert.equal(source.includes(legacy), false, legacy);
  }
  assert.equal(read('frontend/utils/starterSettings.ts').includes('custom_domain'), false);
  for (const file of ['frontend/services/api.ts', 'web-app/src/services/api.ts']) {
    const api = read(file);
    assert.match(api, /connectDomain: \(domain: string\) =>/);
    assert.match(api, /'\/ecommerce\/site\/domain\/check', \{ method: 'POST' \}/);
    assert.match(api, /'\/ecommerce\/site\/domain', \{ method: 'DELETE' \}/);
  }
  for (const file of ['frontend/components/EcommerceDomainCard.tsx', 'web-app/src/components/EcommerceDomainPanel.tsx', 'frontend/utils/ecommerceDomain.ts']) {
    const source = read(file);
    assert.doesNotMatch(source, /\u00C3|\u00E2\u20AC|\uFFFD/, file);
    for (const call of ['connectDomain(', 'checkDomain(']) assert.ok(file.includes('utils/') || source.includes(call), `${file} ${call}`);
  }
});
