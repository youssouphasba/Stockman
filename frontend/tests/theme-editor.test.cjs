const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const contract = JSON.parse(read('web-app/src/lib/ecommerceThemeContract.json'));
const plain = (value) => JSON.parse(JSON.stringify(value));

function loadStructure() {
  const exports = {};
  const compiled = ts.transpileModule(read('web-app/src/lib/themeStructure.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true } }).outputText;
  vm.runInNewContext(compiled, { exports, JSON, Set, Error, Object, require: (name) => (name === './ecommerceThemeContract.json' ? contract : {}) });
  return exports;
}

// Document de test conforme à la structure du modèle Marché (données neutres, jamais utilisées par l'application).
function marcheDocument() {
  const model = contract.models.marche;
  return {
    schema_version: 1, model_id: 'marche', model_version: model.version, global_settings: {},
    pages: model.pages.map((page) => ({ id: page.id, kind: page.kind, sections: page.sections.map((section) => ({ id: section.id, type: section.type, type_version: 1, settings: { ...(section.settings || {}) }, blocks: [] })) })),
  };
}

test('Sections can be added, moved and removed, except the indispensable ones', () => {
  const s = loadStructure();
  let doc = marcheDocument();
  const added = s.addSection(doc, 'home', 'faq');
  assert.equal(added.id, 'faq-1');
  doc = added.document;
  assert.equal(doc.pages[0].sections.at(-1).type, 'faq');
  assert.equal(s.addSection(doc, 'home', 'faq').id, 'faq-2');
  doc = s.moveSection(doc, 'home', 'faq-1', -1);
  assert.equal(doc.pages[0].sections.at(-2).id, 'faq-1');
  assert.equal(s.moveSection(doc, 'home', doc.pages[0].sections[0].id, -1), doc);
  doc = s.removeSection(doc, 'home', 'hero');
  assert.equal(doc.pages[0].sections.some((item) => item.id === 'hero'), false);
  assert.equal(s.isRequiredSection(doc, 'catalog', 'catalog-main'), true);
  assert.equal(s.removeSection(doc, 'catalog', 'catalog-main'), doc);
  assert.throws(() => s.addSection(doc, 'home', 'legacy-storefront'));
  assert.equal(marcheDocument().pages[0].sections.length, contract.models.marche.pages[0].sections.length);
});

test('Blocks get unique ids and every setting of a section is editable', () => {
  const s = loadStructure();
  let doc = s.addSection(marcheDocument(), 'home', 'features').document;
  doc = s.addBlock(doc, 'home', 'features-1', 'feature');
  doc = s.addBlock(doc, 'home', 'features-1', 'feature');
  const section = doc.pages[0].sections.find((item) => item.id === 'features-1');
  assert.deepEqual(plain(section.blocks.map((block) => block.id)), ['feature-1', 'feature-2']);
  doc = s.moveBlock(doc, 'home', 'features-1', 'feature-2', -1);
  assert.equal(doc.pages[0].sections.find((item) => item.id === 'features-1').blocks[0].id, 'feature-2');
  const fields = s.sectionFields(doc, 'home', 'features-1');
  assert.deepEqual(plain(fields.map((field) => field.key)), ['heading', 'icon', 'title', 'text', 'icon', 'title', 'text']);
  assert.equal(fields[1].group_label, 'Point fort 1');
  assert.equal(fields[1].options[0].label, 'Livraison');
  const hero = s.sectionFields(marcheDocument(), 'home', 'hero').map((field) => field.key);
  assert.ok(hero.includes('layout') && hero.includes('image_asset_id'));
  doc = s.removeBlock(doc, 'home', 'features-1', 'feature-1');
  assert.equal(doc.pages[0].sections.find((item) => item.id === 'features-1').blocks.length, 1);
  assert.equal(s.isStructureEditable('marche'), true);
  assert.equal(s.isStructureEditable('legacy-v1'), false);
});

test('Only the preview page may be framed, and only by the same origin', () => {
  const config = read('web-app/next.config.ts');
  assert.match(config, /source: '\/preview',\n\s+headers: \[\n\s+\{ key: 'X-Frame-Options', value: 'SAMEORIGIN' \},\n\s+\{ key: 'Content-Security-Policy', value: contentSecurityPolicy\("'self'"\) \}/);
  assert.match(config, /\{ key: 'X-Frame-Options', value: 'DENY' \}/);
  assert.match(config, /contentSecurityPolicy\("'none'"\)/);
  assert.doesNotMatch(config, /frame-ancestors \*/);
});

test('The visual editor is offered only for structural editing and is server-checked', () => {
  const panel = read('web-app/src/components/EcommerceAppearancePanel.tsx');
  assert.match(panel, /capabilities\?\.structure_edit && isStructureEditable\(state\.model\.id\) && \(/);
  const editor = read('web-app/src/components/EcommerceThemeEditor.tsx');
  assert.match(editor, /ecommerceApi\.saveThemeDraft\(\{ site_slug: server\.site_slug, lock_version: server\.lock_version, document \}\)/);
  assert.match(editor, /disabled=\{required\}/);
  assert.match(editor, /<iframe ref=\{frame\} key=\{previewUrl\} src=\{previewUrl\}/);
});

function loadLive() {
  const exports = {};
  const compiled = ts.transpileModule(read('web-app/src/storefront/livePreview.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, { exports, Array });
  return exports;
}

test('Live preview accepts only same-origin messages from the parent editor', () => {
  const live = loadLive();
  const parent = {};
  const document = { model_id: 'marche', global_settings: {}, pages: [{ kind: 'home', sections: [] }] };
  const valid = { origin: 'https://app.stockman.pro', source: parent, data: { source: live.LIVE_PREVIEW_SOURCE, document, media: {}, page: 'catalog', selected: 'hero' } };
  const message = live.readLivePreviewMessage(valid, 'https://app.stockman.pro', parent);
  assert.equal(message.page, 'catalog');
  assert.equal(message.selected, 'hero');
  assert.equal(live.readLivePreviewMessage({ ...valid, origin: 'https://exemple.test' }, 'https://app.stockman.pro', parent), null);
  assert.equal(live.readLivePreviewMessage({ ...valid, source: {} }, 'https://app.stockman.pro', parent), null);
  assert.equal(live.readLivePreviewMessage({ ...valid, data: { ...valid.data, source: 'autre' } }, 'https://app.stockman.pro', parent), null);
  assert.equal(live.readLivePreviewMessage({ ...valid, data: { ...valid.data, document: { model_id: 'x', pages: 'non' } } }, 'https://app.stockman.pro', parent), null);
  assert.equal(live.readLivePreviewMessage({ ...valid, data: { ...valid.data, page: '../admin' } }, 'https://app.stockman.pro', parent).page, 'home');
  // Une page personnalisée est désignée par son identifiant.
  assert.equal(live.readLivePreviewMessage({ ...valid, data: { ...valid.data, page: 'page-1' } }, 'https://app.stockman.pro', parent).page, 'page-1');
});

test('The editor streams its working document and the preview never applies it outside an embedded preview', () => {
  const editor = read('web-app/src/components/EcommerceThemeEditor.tsx');
  assert.match(editor, /target\.postMessage\(\{ source: LIVE_PREVIEW_SOURCE, document, media: liveMedia, page: page\?\.id \|\| 'home', selected \}, previewOrigin\)/);
  assert.match(editor, /event\.origin !== previewOrigin \|\| event\.source !== frame\.current\?\.contentWindow/);
  const storefront = read('web-app/src/storefront/ThemeStorefront.tsx');
  assert.match(storefront, /if \(!preview \|\| window\.parent === window\) return;/);
  assert.match(storefront, /readLivePreviewMessage\(event, window\.location\.origin, window\.parent\)/);
});

test('Texts typed in the preview are accepted only from the embedded preview and cleaned like on the server', () => {
  const live = loadLive();
  const frame = {};
  const valid = { origin: 'https://app.stockman.pro', source: frame, data: { type: live.LIVE_PREVIEW_EDIT, field: 'home.hero.heading', value: 'Bienvenue' } };
  assert.deepEqual(plain(live.readLivePreviewEdit(valid, 'https://app.stockman.pro', frame)), { field: 'home.hero.heading', value: 'Bienvenue' });
  assert.equal(plain(live.readLivePreviewEdit({ ...valid, data: { ...valid.data, field: 'home.faq.question-1.answer' } }, 'https://app.stockman.pro', frame)).field, 'home.faq.question-1.answer');
  assert.equal(live.readLivePreviewEdit({ ...valid, origin: 'https://exemple.test' }, 'https://app.stockman.pro', frame), null);
  assert.equal(live.readLivePreviewEdit({ ...valid, source: {} }, 'https://app.stockman.pro', frame), null);
  assert.equal(live.readLivePreviewEdit(valid, 'https://app.stockman.pro', null), null);
  for (const field of ['global.brand_color', 'home.hero', '__proto__.x.y', 'home.hero.heading.x.y', 'Home.hero.heading']) {
    assert.equal(live.readLivePreviewEdit({ ...valid, data: { ...valid.data, field } }, 'https://app.stockman.pro', frame), null, field);
  }
  assert.equal(live.readLivePreviewEdit({ ...valid, data: { ...valid.data, value: 'x'.repeat(5001) } }, 'https://app.stockman.pro', frame), null);
  assert.equal(live.cleanInlineText('Bonjour\n  tout le monde\u0007', false, 120), 'Bonjour tout le monde');
  assert.equal(live.cleanInlineText('Ligne 1\r\nLigne 2\u0001', true), 'Ligne 1\nLigne 2');
  assert.equal(live.cleanInlineText('abcdef', false, 4), 'abcd');
  const editor = read('web-app/src/components/EcommerceThemeEditor.tsx');
  // L'éditeur n'accepte qu'un champ texte existant de la section visée.
  assert.match(editor, /const field = candidates\.find\(\(item\) => item\.id === fieldId && item\.type === 'text'\);/);
  assert.match(editor, /setField\(field, cleanInlineText\(raw, !!field\.multiline, field\.max_length\)\);/);
});

test('Site settings, section descriptions and category choices come from the registry', () => {
  const s = loadStructure();
  const fields = s.globalFields();
  assert.deepEqual(plain(fields.map((field) => field.key)), Object.keys(contract.global_settings));
  assert.ok(fields.every((field) => field.id === `global.${field.key}` && field.scope === 'global' && field.group_label));
  assert.equal(fields.find((field) => field.key === 'animation_style').options.map((option) => option.label).join(', '), 'Aucune, Discrètes, Expressives');
  const sections = s.addableSections();
  assert.ok(sections.length >= 13);
  for (const item of sections) assert.ok(item.description, item.type);
  const doc = s.addSection(marcheDocument(), 'home', 'featured-collection').document;
  const category = s.sectionFields(doc, 'home', 'featured-collection-1').find((field) => field.key === 'category');
  assert.equal(category.source, 'categories');
});

test('Custom pages get a readable address, a title and a bounded menu placement', () => {
  const s = loadStructure();
  let doc = marcheDocument();
  assert.equal(s.canAddCustomPage(doc), true);
  assert.equal(s.slugifyPath('À propos de nous !'), 'a-propos-de-nous');
  assert.equal(s.slugifyPath('Œuvres / Été'), 'oeuvres/ete');
  assert.equal(s.slugifyPath('  --Livraison--  '), 'livraison');
  assert.equal(s.slugifyPath('Livraison-', false), 'livraison-');
  assert.equal(s.slugifyPath('x'.repeat(200)).length, contract.limits.max_path_length);
  const created = s.addCustomPage(doc, '  Livraison et retours ');
  doc = created.document;
  const page = doc.pages.find((item) => item.id === created.id);
  assert.deepEqual(plain({ kind: page.kind, path: page.path, title: page.title, menu: page.menu }), { kind: 'custom', path: 'livraison-et-retours', title: 'Livraison et retours', menu: 'footer' });
  // Seul le titre saisi est repris : aucun texte n'est inventé.
  assert.deepEqual(plain(page.sections.map((section) => [section.type, section.settings])), [['rich-text', { heading: 'Livraison et retours' }]]);
  assert.equal(s.addCustomPage(doc, 'Livraison et retours').document.pages.at(-1).path, 'livraison-et-retours-2');
  assert.equal(s.addCustomPage(doc, 'Contact').document.pages.at(-1).path, 'page-contact');
  assert.throws(() => s.addCustomPage(doc, '   '), /titre/);
  assert.equal(s.pageLabel(page), 'Livraison et retours');
  assert.equal(s.pageLabel(doc.pages[0]), 'Accueil');
  assert.equal(s.pathProblem(doc, created.id, 'livraison-et-retours'), null);
  assert.match(s.pathProblem(doc, created.id, 'checkout'), /réservée/);
  assert.match(s.pathProblem(doc, created.id, 'Livraison'), /minuscules/);
  assert.match(s.pathProblem(doc, created.id, ''), /Indiquez/);
  doc = s.addCustomPage(doc, 'Aide').document;
  const help = doc.pages.at(-1);
  assert.match(s.pathProblem(doc, help.id, 'livraison-et-retours'), /déjà/);
  doc = s.updateCustomPage(doc, created.id, { title: 'Livraison\nexpress', menu: 'header' });
  assert.equal(doc.pages.find((item) => item.id === created.id).title, 'Livraison express');
  assert.equal(s.customPageProblem(doc), null);
  assert.equal(s.customPageProblem(s.updateCustomPage(doc, help.id, { title: ' ' })).pageId, help.id);
  // Le menu principal accueille trois pages personnalisées au plus.
  for (const title of ['Une', 'Deux']) {
    doc = s.addCustomPage(doc, title).document;
    doc = s.updateCustomPage(doc, doc.pages.at(-1).id, { menu: 'header' });
  }
  assert.equal(s.canUseHeaderMenu(doc, help.id), false);
  assert.equal(s.canUseHeaderMenu(doc, created.id), true);
  assert.match(s.customPageProblem(s.updateCustomPage(doc, help.id, { menu: 'header' })).message, /au plus 3/);
  // Les pages du modèle ne sont ni renommées ni supprimées par ces opérations.
  assert.equal(s.removeCustomPage(doc, 'home'), doc);
  assert.equal(s.updateCustomPage(doc, 'home', { title: 'x' }), doc);
  assert.equal(s.removeCustomPage(doc, created.id).pages.some((item) => item.id === created.id), false);
  assert.equal(s.canAddCustomPage({ ...doc, model_id: 'legacy-v1' }), false);
  // Les sections d'une page personnalisée se règlent comme les autres.
  assert.ok(s.sectionFields(doc, created.id, page.sections[0].id).some((field) => field.key === 'text'));
  assert.equal(s.isRequiredSection(doc, created.id, page.sections[0].id), false);

  const editor = read('web-app/src/components/EcommerceThemeEditor.tsx');
  assert.match(editor, /\{canManagePages && canAddCustomPage\(document\) && \(/);
  assert.match(editor, /const canManagePages = !!server\.capabilities\?\.custom_pages;/);
  assert.match(editor, /const problem = customPageProblem\(document\);\n\s+if \(problem\) \{/);
});

test('A section can be hidden without losing its settings, except the last visible indispensable one', () => {
  const s = loadStructure();
  let doc = marcheDocument();
  const faq = doc.pages[0].sections.find((item) => item.type === 'faq').id;
  const hidden = s.setSectionHidden(doc, 'home', faq, true);
  assert.equal(hidden.pages[0].sections.find((item) => item.id === faq).hidden, true);
  assert.equal(doc.pages[0].sections.find((item) => item.id === faq).hidden, undefined);
  // Le serveur n'accepte que true : une section réaffichée perd la propriété.
  const shown = s.setSectionHidden(hidden, 'home', faq, false);
  assert.equal('hidden' in shown.pages[0].sections.find((item) => item.id === faq), false);
  assert.equal(s.setSectionHidden(doc, 'catalog', 'catalog-main', true), doc);
  // Avec une seconde section catalogue, l'une des deux peut être masquée, jamais les deux.
  doc = s.addSection(doc, 'catalog', 'catalog').document;
  const copy = doc.pages[1].sections[1].id;
  doc = s.setSectionHidden(doc, 'catalog', 'catalog-main', true);
  assert.equal(doc.pages[1].sections[0].hidden, true);
  assert.equal(s.isRequiredSection(doc, 'catalog', copy), true);
  assert.equal(s.setSectionHidden(doc, 'catalog', copy, true), doc);
  assert.equal(s.isRequiredSection(doc, 'catalog', 'catalog-main'), false);
  assert.equal(s.removeSection(doc, 'catalog', 'catalog-main').pages[1].sections.length, 1);
});

test('Drag and drop places a section or a block at a bounded index', () => {
  const s = loadStructure();
  let doc = marcheDocument();
  const ids = doc.pages[0].sections.map((item) => item.id);
  doc = s.moveSectionTo(doc, 'home', ids[0], 3);
  assert.deepEqual(doc.pages[0].sections.map((item) => item.id), [ids[1], ids[2], ids[3], ids[0], ...ids.slice(4)]);
  doc = s.moveSectionTo(doc, 'home', ids[0], 99);
  assert.equal(doc.pages[0].sections.at(-1).id, ids[0]);
  assert.equal(s.moveSectionTo(doc, 'home', 'inconnue', 0), doc);
  const faq = doc.pages[0].sections.find((item) => item.type === 'faq').id;
  doc = s.addBlock(s.addBlock(doc, 'home', faq, 'question'), 'home', faq, 'question');
  const blocks = doc.pages[0].sections.find((item) => item.id === faq).blocks.map((item) => item.id);
  doc = s.moveBlockTo(doc, 'home', faq, blocks[0], 1);
  assert.deepEqual(doc.pages[0].sections.find((item) => item.id === faq).blocks.map((item) => item.id), [blocks[1], blocks[0]]);
  // Le nom d'un bloc reprend son premier texte saisi, sinon il reste vide.
  assert.deepEqual(plain(s.blockSummary('faq', { type: 'question', settings: { question: '  Livrez-vous ?  ' } }, 0)), { label: 'Question 1', text: 'Livrez-vous ?' });
  assert.deepEqual(plain(s.blockSummary('faq', { type: 'question', settings: {} }, 1)), { label: 'Question 2', text: null });
});

test('The preview asks to insert a section only from the embedded frame, at a valid place', () => {
  const live = loadLive();
  const frame = {};
  const valid = { origin: 'https://app.stockman.pro', source: frame, data: { type: live.LIVE_PREVIEW_INSERT, index: 2 } };
  assert.equal(live.readLivePreviewInsert(valid, 'https://app.stockman.pro', frame), 2);
  assert.equal(live.readLivePreviewInsert({ ...valid, origin: 'https://exemple.test' }, 'https://app.stockman.pro', frame), null);
  assert.equal(live.readLivePreviewInsert({ ...valid, source: {} }, 'https://app.stockman.pro', frame), null);
  for (const index of [-1, 1.5, '2', 5000]) {
    assert.equal(live.readLivePreviewInsert({ ...valid, data: { ...valid.data, index } }, 'https://app.stockman.pro', frame), null);
  }
  // Une section masquée n'est jamais rendue pour les visiteurs.
  const storefront = read('web-app/src/storefront/ThemeStorefront.tsx');
  assert.match(storefront, /\.filter\(\(section\) => embedded \|\| !section\.hidden\)/);
});
