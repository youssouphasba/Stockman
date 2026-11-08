const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const repo = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(repo, file), 'utf8');
const MOBILE_HELPER = 'frontend/utils/ecommerceAppearance.ts';
const WEB_HELPER = 'web-app/src/lib/ecommerceAppearance.ts';

function loadHelper() {
  const exports = {};
  const compiled = ts.transpileModule(read(MOBILE_HELPER), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(compiled, { exports, JSON, Number, String, Date });
  return exports;
}

// Les objets créés dans le contexte vm ont un autre prototype : on compare des copies simples.
const plain = (value) => JSON.parse(JSON.stringify(value));
const flush = async () => { for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setImmediate(resolve)); };

// Forme des réponses du serveur pour Stockman Basic (données de test, jamais utilisées par l'application).
const FIELDS = [
  { id: 'global.brand_color', scope: 'global', key: 'brand_color', type: 'color', label: 'Couleur de marque', nullable: true },
  { id: 'home.storefront.site_name', scope: 'section', page_id: 'home', section_id: 'storefront', key: 'site_name', type: 'text', label: 'Nom du site', max_length: 120, nullable: true },
  { id: 'home.storefront.hero_title', scope: 'section', page_id: 'home', section_id: 'storefront', key: 'hero_title', type: 'text', label: "Titre d'accueil", max_length: 120, nullable: true },
  { id: 'home.storefront.welcome_message', scope: 'section', page_id: 'home', section_id: 'storefront', key: 'welcome_message', type: 'text', label: "Message d'accueil", max_length: 600, multiline: true, nullable: true },
];
const CAPABILITIES = { view: true, guided_edit: true, change_model: true, publish: true, structure_edit: false, custom_pages: false, manage_history: false, preview: true };

function documentWith(settings, globals = {}) {
  return {
    schema_version: 1, model_id: 'legacy-v1', model_version: '1.0.0',
    global_settings: { logo_asset_id: null, ...globals },
    pages: [{ id: 'home', kind: 'home', sections: [{ id: 'storefront', type: 'legacy-storefront', type_version: 1, settings, blocks: [] }] }],
  };
}

function themeState({ lock = 0, published = documentWith({ hero_title: 'Bienvenue' }, { brand_color: '#047857' }), draft = null, enabled = false } = {}) {
  return {
    site_slug: 'boutique-a', site_enabled: enabled, lock_version: lock, capabilities: CAPABILITIES,
    model: { id: 'legacy-v1', name: 'Stockman Basic', version: '1.0.0' }, fields: FIELDS,
    published: { document: published, fingerprint: `fp-${lock}`, revision_id: null, published_at: null, issues: [] },
    draft: draft ? { revision_id: `threv_${lock}`, document: draft, updated_at: '2026-11-08T09:30:00+00:00', updated_by: 'Awa Diop' } : null,
  };
}

function harness(initial = themeState(), overrides = {}) {
  const helper = loadHelper();
  const calls = [];
  const views = [];
  let server = initial;
  const api = {
    getTheme: async () => { calls.push(['get']); return server; },
    saveThemeDraft: async (data) => {
      calls.push(['save', plain(data)]);
      if (overrides.save) return overrides.save(data);
      server = themeState({ lock: data.lock_version + 1, published: server.published.document, draft: data.document, enabled: server.site_enabled });
      return server;
    },
    discardThemeDraft: async (data) => {
      calls.push(['discard', plain(data)]);
      server = themeState({ lock: data.lock_version + 1, published: server.published.document, enabled: server.site_enabled });
      return server;
    },
    publishTheme: async (data) => {
      calls.push(['publish', plain(data)]);
      if (overrides.publish) return overrides.publish(data);
      server = themeState({ lock: data.lock_version + 1, published: server.draft.document, enabled: server.site_enabled });
      return server;
    },
    createThemePreview: async (data) => { calls.push(['preview', plain(data)]); return { preview_url: 'https://app.stockman.pro/preview#jeton', expires_at: '2026-11-08T10:00:00+00:00' }; },
  };
  const controller = helper.createAppearanceController(api, (view) => views.push(plain(view)));
  return { helper, controller, calls, views, last: () => views[views.length - 1], setServer: (next) => { server = next; } };
}

test('Mobile and web helpers stay identical', () => {
  assert.equal(read(WEB_HELPER), read(MOBILE_HELPER));
});

test('Untouched fields keep their original form and edited empty fields become null', () => {
  const helper = loadHelper();
  const original = documentWith({ hero_title: null, site_name: '' });
  const values = helper.readThemeValues(original, FIELDS);
  assert.deepEqual(plain(values), { 'global.brand_color': '', 'home.storefront.site_name': '', 'home.storefront.hero_title': '', 'home.storefront.welcome_message': '' });
  assert.deepEqual(plain(helper.writeThemeValues(original, FIELDS, values)), original);
  const edited = helper.writeThemeValues(original, FIELDS, { ...values, 'home.storefront.welcome_message': '  Livraison à Dakar  ', 'global.brand_color': '#2563eb', 'home.storefront.site_name': '   ' });
  const settings = edited.pages[0].sections[0].settings;
  assert.equal(settings.welcome_message, 'Livraison à Dakar');
  assert.equal(edited.global_settings.brand_color, '#2563EB');
  assert.equal(settings.site_name, '');
  assert.equal('hero_title' in settings && settings.hero_title === null, true);
  assert.equal(original.pages[0].sections[0].settings.welcome_message, undefined);
});

test('Changes are listed in French and local edits survive a reload after a conflict', () => {
  const helper = loadHelper();
  const before = { 'home.storefront.hero_title': 'Bienvenue', 'global.brand_color': '#047857' };
  const after = { 'home.storefront.hero_title': 'Soldes', 'global.brand_color': '#047857', 'home.storefront.site_name': 'Maison Awa' };
  const lines = helper.themeChanges(FIELDS, before, after).map(helper.describeThemeChange);
  assert.deepEqual(lines, ['Nom du site : (vide) → « Maison Awa »', "Titre d'accueil : « Bienvenue » → « Soldes »"]);
  assert.match(helper.describeThemeChange({ field: FIELDS[3], before: '', after: 'x'.repeat(100) }), /…/);
  const rebased = helper.rebaseThemeValues(FIELDS, before, after, { 'home.storefront.hero_title': 'Changé ailleurs', 'global.brand_color': '#DB2777' });
  assert.equal(rebased['home.storefront.hero_title'], 'Soldes');
  assert.equal(rebased['global.brand_color'], '#DB2777');
  assert.equal(rebased['home.storefront.site_name'], 'Maison Awa');
});

test('Server errors are read from their structured detail', () => {
  const helper = loadHelper();
  const conflict = helper.parseThemeError({ status: 409, message: JSON.stringify({ code: 'published_changed', message: 'Le site publié a été modifié entre-temps.' }) }, 'Erreur');
  assert.deepEqual(plain(conflict), { code: 'published_changed', message: 'Le site publié a été modifié entre-temps.', status: 409 });
  assert.equal(helper.isThemeConflict(conflict), true);
  assert.deepEqual(plain(helper.parseThemeError({ status: 503, message: 'Cette action nécessite une connexion internet active.' }, 'Erreur')), { code: null, message: 'Cette action nécessite une connexion internet active.', status: 503 });
  assert.equal(helper.parseThemeError(null, 'Message par défaut').message, 'Message par défaut');
  assert.equal(helper.isThemeConflict(helper.parseThemeError({ status: 422, message: '{"code":"text_too_long","message":"Texte limité"}' }, '')), false);
});

test('Saving a draft sends only the edited document with the current lock version', async () => {
  const h = harness();
  await h.controller.load();
  assert.equal(h.last().status, 'ready');
  assert.equal(h.helper.describeAppearanceStatus(h.last()), 'Aucune modification en attente : le formulaire affiche la version publiée.');
  h.controller.setValue('home.storefront.hero_title', 'Nouveautés');
  assert.equal(h.helper.describeAppearanceStatus(h.last()), 'Modifications non enregistrées.');
  await h.controller.saveDraft();
  const [, saved] = h.calls.find(([name]) => name === 'save');
  assert.equal(saved.lock_version, 0);
  assert.equal(saved.site_slug, 'boutique-a');
  assert.equal(saved.document.pages[0].sections[0].settings.hero_title, 'Nouveautés');
  assert.equal(saved.document.global_settings.brand_color, '#047857');
  assert.equal(h.last().notice, "Brouillon enregistré. Le site public n'a pas changé.");
  assert.match(h.helper.describeAppearanceStatus(h.last()), /^Brouillon enregistré le \d{2}\/\d{2}\/2026 à \d{2}:\d{2} par Awa Diop\. Il n'est pas encore publié\.$/);
});

test('Preview saves pending edits first, and shows the published version otherwise', async () => {
  const clean = harness();
  await clean.controller.load();
  assert.equal(await clean.controller.preview(), 'https://app.stockman.pro/preview#jeton');
  assert.deepEqual(clean.calls.filter(([name]) => name !== 'get'), [['preview', { site_slug: 'boutique-a', source: 'published' }]]);

  const dirty = harness();
  await dirty.controller.load();
  dirty.controller.setValue('home.storefront.site_name', 'Maison Awa');
  await dirty.controller.preview();
  assert.deepEqual(dirty.calls.filter(([name]) => name !== 'get').map(([name, data]) => [name, data.source || data.lock_version]), [['save', 0], ['preview', 'draft']]);
});

test('Publishing confirms the exact draft, lock version and published fingerprint', async () => {
  const h = harness();
  await h.controller.load();
  h.controller.setValue('home.storefront.hero_title', 'Soldes');
  assert.deepEqual(plain(h.controller.pendingChanges().map(h.helper.describeThemeChange)), ["Titre d'accueil : « Bienvenue » → « Soldes »"]);
  assert.equal(await h.controller.publish(), true);
  const [, published] = h.calls.find(([name]) => name === 'publish');
  assert.deepEqual(published, { site_slug: 'boutique-a', lock_version: 1, revision_id: 'threv_1', published_fingerprint: 'fp-1' });
  assert.equal(h.last().notice, "Apparence publiée. Le site reste désactivé tant que vous ne l'activez pas.");
  assert.equal(h.last().state.draft, null);

  const enabled = harness(themeState({ enabled: true }));
  await enabled.controller.load();
  enabled.controller.setValue('home.storefront.hero_title', 'En ligne');
  await enabled.controller.publish();
  assert.equal(enabled.last().notice, 'Apparence publiée sur votre site.');
});

test('Nothing is published without changes or a draft', async () => {
  const h = harness();
  await h.controller.load();
  assert.equal(await h.controller.publish(), false);
  assert.equal(h.calls.some(([name]) => name === 'publish' || name === 'save'), false);
  assert.equal(h.last().notice, 'Aucune modification à publier.');
});

test('A conflict keeps the local edits and offers a reload on the latest version', async () => {
  const conflict = { status: 409, message: JSON.stringify({ code: 'published_changed', message: 'Le site publié a été modifié entre-temps. Vérifiez les différences avant de publier.' }) };
  const h = harness(themeState(), { publish: async () => { throw conflict; } });
  await h.controller.load();
  h.controller.setValue('home.storefront.hero_title', 'Ma saisie');
  assert.equal(await h.controller.publish(), false);
  assert.equal(h.last().conflict, true);
  assert.equal(h.last().error.message, 'Le site publié a été modifié entre-temps. Vérifiez les différences avant de publier.');
  h.setServer(themeState({ lock: 2, published: documentWith({ hero_title: 'Bienvenue', site_name: 'Changé ailleurs' }), draft: documentWith({ hero_title: 'Brouillon serveur' }) }));
  h.controller.setValue('home.storefront.welcome_message', 'Livraison le jour même');
  await h.controller.reload();
  const view = h.last();
  assert.equal(view.conflict, false);
  assert.equal(view.state.lock_version, 2);
  assert.equal(view.values['home.storefront.welcome_message'], 'Livraison le jour même');
  assert.equal(view.values['home.storefront.hero_title'], 'Brouillon serveur');
});

test('Discarding a draft calls the server; cancelling unsaved edits stays local', async () => {
  const local = harness();
  await local.controller.load();
  local.controller.setValue('home.storefront.hero_title', 'Essai');
  await local.controller.discard();
  assert.equal(local.calls.some(([name]) => name === 'discard'), false);
  assert.equal(local.last().values['home.storefront.hero_title'], 'Bienvenue');
  assert.equal(local.last().notice, 'Modifications annulées.');

  const remote = harness(themeState({ lock: 3, draft: documentWith({ hero_title: 'Brouillon' }) }));
  await remote.controller.load();
  await remote.controller.discard();
  assert.deepEqual(remote.calls.find(([name]) => name === 'discard'), ['discard', { site_slug: 'boutique-a', lock_version: 3 }]);
  assert.equal(remote.last().state.draft, null);
  assert.equal(remote.last().notice, "Brouillon abandonné. Le site public n'a pas changé.");
});

test('A disposed editor ignores late answers', async () => {
  const h = harness();
  const pending = h.controller.load();
  const before = h.views.length;
  h.controller.dispose();
  await pending;
  await flush();
  assert.equal(h.views.length, before);
  assert.equal(h.views.some((view) => view.status === 'ready'), false);
});

test('Appearance calls bypass the offline queue and the web cache', () => {
  const mobile = read('frontend/services/api.ts');
  const requestBody = mobile.slice(mobile.indexOf('async function request<T>')).split('\n');
  assert.match(requestBody[3], /startsWith\('\/ecommerce\/site\/theme'\)\) return rawRequest/);
  const web = read('web-app/src/services/api.ts');
  assert.match(web, /NON_CACHEABLE_GET_PREFIXES = \[\s*'\/ecommerce\/site\/onboarding',\s*'\/ecommerce\/site\/theme'/);
  assert.match(web, /startsWith\('\/ecommerce\/site\/theme'\)\) return performRequest/);
});

test('Settings no longer edit appearance fields directly and show actions only when allowed', () => {
  const settings = read('frontend/app/(tabs)/settings.tsx');
  assert.match(settings, /<EcommerceAppearanceEditor/);
  for (const removed of ['placeholder="Nom du site web"', "placeholder=\"Titre d'accueil\"", "placeholder=\"Message d'accueil\"", 'ECOMMERCE_COLOR_SWATCHES']) {
    assert.equal(settings.includes(removed), false, removed);
  }
  const workspace = read('web-app/src/components/SettingsWorkspace.tsx');
  assert.match(workspace, /<EcommerceAppearancePanel/);
  const syncState = workspace.slice(workspace.indexOf('function syncEcommerceState'), workspace.indexOf('if (loading && !settings)'));
  for (const key of ['hero_title', 'site_name', 'welcome_message', 'brand_color']) assert.equal(syncState.includes(key), false, key);
  for (const file of ['frontend/components/EcommerceAppearanceEditor.tsx', 'web-app/src/components/EcommerceAppearancePanel.tsx']) {
    const source = read(file);
    assert.match(source, /capabilities\?\.publish && \(/, file);
    assert.match(source, /capabilities\?\.preview && \(/, file);
    assert.match(source, /canEdit && /, file);
  }
  assert.match(read('web-app/src/components/EcommerceAppearancePanel.tsx'), /capabilities\?\.manage_history && \(/);
  assert.equal(read('frontend/components/EcommerceAppearanceEditor.tsx').includes('listThemeRevisions'), false);
});
