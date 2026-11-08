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
  assert.equal(marcheDocument().pages[0].sections.length, 4);
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
});

test('The editor streams its working document and the preview never applies it outside an embedded preview', () => {
  const editor = read('web-app/src/components/EcommerceThemeEditor.tsx');
  assert.match(editor, /target\.postMessage\(\{ source: LIVE_PREVIEW_SOURCE, document, media: liveMedia, page: page\?\.kind \|\| 'home', selected \}, previewOrigin\)/);
  assert.match(editor, /event\.origin !== previewOrigin \|\| event\.source !== frame\.current\?\.contentWindow/);
  const storefront = read('web-app/src/storefront/ThemeStorefront.tsx');
  assert.match(storefront, /if \(!preview \|\| window\.parent === window\) return;/);
  assert.match(storefront, /readLivePreviewMessage\(event, window\.location\.origin, window\.parent\)/);
});
