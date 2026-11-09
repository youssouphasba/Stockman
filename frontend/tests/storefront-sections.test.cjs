const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const plain = (value) => JSON.parse(JSON.stringify(value));

function loadTokens() {
  const exports = {};
  const compiled = ts.transpileModule(read('web-app/src/storefront/tokens.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const types = { enumSetting: (settings, key, allowed, fallback) => (allowed.includes(settings[key]) ? settings[key] : fallback) };
  vm.runInNewContext(compiled, { exports, require: (name) => (name === './types' ? types : {}), parseInt, Math, Number });
  return exports;
}

test('Every registered section type has a trusted renderer', () => {
  const contract = JSON.parse(read('backend/ecommerce_theme_contract.json'));
  const sections = read('web-app/src/storefront/sections.tsx');
  for (const type of Object.keys(contract.sections).filter((name) => name !== 'legacy-storefront')) {
    assert.match(sections, new RegExp(`case '${type}': return <`), type);
  }
  assert.match(sections, /default: return null;/);
});

test('Section models use the engine and keep Basic as a fallback', () => {
  const contract = JSON.parse(read('backend/ecommerce_theme_contract.json'));
  const client = read('web-app/src/app/shop/[slug]/StorefrontClient.tsx');
  for (const model of Object.keys(contract.models).filter((id) => id !== 'legacy-v1')) {
    assert.match(client, new RegExp(`\\b${model}: SectionStorefront,`), model);
  }
  assert.match(client, /fallback=\{<StockmanBasicStorefront slug=\{slug\} previewToken=\{previewToken\} \/>\}/);
  assert.match(read('web-app/src/app/shop/[slug]/page.tsx'), /<StorefrontClient slug=\{slug\} modelId=\{payload\?\.site\?\.model_id\} \/>/);
  assert.match(read('web-app/src/app/page.tsx'), /<StorefrontClient slug=\{slug\} modelId=\{payload\?\.site\?\.model_id\} \/>/);
});

test('The engine keeps commercial calls on the existing public routes and disables them in preview', () => {
  const commerce = read('web-app/src/storefront/useStorefrontCommerce.ts');
  for (const route of ['/events`', '/orders`', '/contact`']) assert.ok(commerce.includes(`/api/public/ecommerce/\${slug}${route}`), route);
  assert.match(commerce, /const submitOrder = useCallback\(async \(form: OrderForm, delivery\?: \{ destination_session_id: string \} \| null\) => \{\n\s+if \(preview\) \{/);
  assert.match(commerce, /const submitContact = useCallback\(async \(form: ContactForm\) => \{\n\s+if \(preview\) \{/);
  assert.match(commerce, /if \(!payload \|\| preview \|\| tracked\.current \|\| !slug\) return;/);
  // La quantité ajoutée (fiche produit) reste bornée par le stock publié.
  assert.match(commerce, /const wanted = Math\.max\(1, Math\.floor\(quantity\)\);/);
  assert.match(commerce, /quantity: Math\.min\(previous \+ wanted, Math\.max\(0, product\.quantity\)\)/);
  const storefront = read('web-app/src/storefront/ThemeStorefront.tsx');
  // Dans l'aperçu, le fragment de l'adresse porte le jeton : la navigation ne le remplace jamais.
  assert.match(storefront, /if \(!preview\) \{\n\s+const hash = hashForRoute\(target\);/);
  assert.match(storefront, /body: JSON\.stringify\(\{ token: previewToken \}\)/);
  assert.doesNotMatch(storefront, /[?&]token=|preview\/\$\{previewToken\}/);
});

test('Colour tokens always give readable text and keep the brand colour', () => {
  const tokens = loadTokens();
  for (const color of ['#FFFFFF', '#000000', '#7C3AED', '#047857', '#FACC15', '#808080', '#767676', '#10B981', '#EA580C']) {
    const text = tokens.readableTextOn(color);
    assert.ok(tokens.contrastRatio(color, text) >= 4.5, `${color} → ${text}`);
  }
  assert.equal(tokens.contrastRatio('#FFFFFF', '#000000').toFixed(1), '21.0');
  const dark = tokens.buildTokens({ color_scheme: 'dark' }, '#111827');
  assert.equal(dark.accent, '#111827');
  assert.equal(dark.accentNeedsOutline, true);
  const light = tokens.buildTokens({}, null);
  assert.equal(light.scheme, 'light');
  assert.equal(light.accentNeedsOutline, false);
  assert.equal(tokens.buildTokens({ corner_style: 'square' }, '#7C3AED').style['--sf-radius'], '2px');
});

test('Animations stay scoped to the storefront and respect reduced motion', () => {
  const css = read('web-app/src/storefront/storefront.css');
  // Chaque règle vise la boutique (.sf-root) : le back-office n'est jamais animé.
  const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((line) => line.trim()).filter((line) => line.endsWith('{') && !line.startsWith('@') && !/^(from|to|\d+%)\b/.test(line));
  assert.ok(selectors.length > 10);
  for (const selector of selectors) {
    for (const part of selector.replace(/\{$/, '').split(',')) assert.match(part.trim(), /^\.sf-root\b/, part);
  }
  // Toute animation ou transition de mouvement se trouve dans le bloc « no-preference ».
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const pattern = /animation:\s*(?!none)[^;]+;/g;
  let match;
  while ((match = pattern.exec(body))) {
    const before = body.slice(0, match.index);
    const media = before.lastIndexOf('@media');
    assert.ok(media >= 0 && body.slice(media, media + 80).includes('no-preference'), match[0]);
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  const storefront = read('web-app/src/storefront/ThemeStorefront.tsx');
  assert.match(storefront, /import '\.\/storefront\.css';/);
  assert.match(storefront, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/);
  // Un site publié avant ce réglage reste immobile tant que le commerçant ne choisit rien.
  assert.match(storefront, /enumSetting\(payload\.theme\.document\.global_settings, 'animation_style', MOTION_STYLES, 'none'\)/);
});

test('Moving content can be paused and its copies are hidden from assistive technologies', () => {
  const sections = read('web-app/src/storefront/sections.tsx');
  assert.match(sections, /data-duplicate=\{index \? '' : undefined\} aria-hidden=\{index \? true : undefined\}/);
  assert.match(sections, /aria-label=\{paused \? 'Reprendre le défilement' : 'Mettre en pause le défilement'\}/);
  assert.match(sections, /const moving = context\.motion !== 'none' && !context\.edit;/);
});

test('Texts are editable in place only inside the embedded editor preview', () => {
  const storefront = read('web-app/src/storefront/ThemeStorefront.tsx');
  assert.match(storefront, /const edit = useMemo<InlineEdit \| null>\(\(\) => \(embedded \? \{/);
  assert.match(storefront, /window\.parent\.postMessage\(\{ type: LIVE_PREVIEW_EDIT, field, value \}, window\.location\.origin\)/);
  const editable = read('web-app/src/storefront/editable.tsx');
  assert.match(editable, /if \(!edit \|\| !field\) return <Tag className=\{className\}>\{value \|\| fallback \|\| ''\}<\/Tag>;/);
  assert.match(editable, /contentEditable="plaintext-only"/);
  // Les avis affichés sont uniquement ceux saisis par le commerçant.
  const contract = JSON.parse(read('backend/ecommerce_theme_contract.json'));
  assert.match(contract.sections.testimonials.blocks.testimonial.settings.quote.hint, /avis réel/);
});

function loadRoutes() {
  const exports = {};
  const compiled = ts.transpileModule(read('web-app/src/storefront/routes.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, { exports });
  return exports;
}

test('Custom pages open with #/ and their address, and appear where the merchant placed them', () => {
  const routes = loadRoutes();
  // Document technique de test : identifiants et titres neutres, jamais affichés par l'application.
  const doc = { model_id: 'atelier', model_version: '1.0.0', global_settings: {}, pages: [
    { id: 'home', kind: 'home', sections: [] }, { id: 'catalog', kind: 'catalog', sections: [] }, { id: 'contact', kind: 'contact', sections: [] },
    { id: 'page-1', kind: 'custom', path: 'livraison', title: 'Livraison', menu: 'header', sections: [] },
    { id: 'page-2', kind: 'custom', path: 'aide/retours', title: 'Retours', sections: [] },
    { id: 'page-3', kind: 'custom', path: 'offre', title: 'Offre', menu: 'hidden', sections: [] },
  ] };
  assert.equal(routes.routeFromHash(''), 'home');
  assert.equal(routes.routeFromHash('#catalogue'), 'catalog');
  assert.equal(routes.routeFromHash('#contact'), 'contact');
  assert.equal(routes.routeFromHash('#/aide/retours/'), '/aide/retours');
  assert.equal(routes.routeFromHash('#/%E0%A4%A'), '/%E0%A4%A');
  // Le lien « Aller au contenu » ne change pas de page.
  assert.equal(routes.routeFromHash('#sf-main', '/livraison'), '/livraison');
  assert.equal(routes.routeFromHash('#sf-main'), 'home');
  assert.equal(routes.hashForRoute('/livraison'), '#/livraison');
  assert.equal(routes.hashForRoute('catalog'), '#catalogue');
  assert.equal(routes.hashForRoute('home'), '');
  assert.equal(routes.hashForRoute('id:page-1'), '');
  assert.equal(routes.resolvePage(doc, '/aide/retours').id, 'page-2');
  assert.equal(routes.resolvePage(doc, '/inconnue'), null);
  assert.equal(routes.resolvePage(doc, 'id:page-3').id, 'page-3');
  assert.equal(routes.resolvePage(doc, 'contact').id, 'contact');
  const nav = routes.siteNavigation(doc);
  assert.deepEqual(plain(nav.header.map((item) => item.label)), ['Accueil', 'Catalogue', 'Contact', 'Livraison']);
  assert.deepEqual(plain(nav.footer.map((item) => item.route)), ['home', 'catalog', 'contact', '/livraison', '/aide/retours']);
  assert.equal(nav.header[3].pageId, 'page-1');
  assert.equal(routes.documentTitle(doc.pages[3], 'Boutique'), 'Livraison · Boutique');
  assert.equal(routes.documentTitle(doc.pages[0], 'Boutique'), null);
  // Même si un document en annonçait davantage, l'en-tête n'affiche que trois pages personnalisées.
  const crowded = { ...doc, pages: [...doc.pages, ...[4, 5, 6].map((index) => ({ id: `page-${index}`, kind: 'custom', path: `p${index}`, title: `P${index}`, menu: 'header', sections: [] }))] };
  assert.equal(routes.siteNavigation(crowded).header.length, 3 + routes.MAX_HEADER_PAGES);
  assert.equal(routes.MAX_HEADER_PAGES, JSON.parse(read('backend/ecommerce_theme_contract.json')).limits.max_header_pages);

  const storefront = read('web-app/src/storefront/ThemeStorefront.tsx');
  assert.match(storefront, /setRoute\(`id:\$\{message\.page\}`\)/);
  assert.match(storefront, /Page introuvable/);
  const layout = read('web-app/src/storefront/layout.tsx');
  assert.match(layout, /\{items\.map\(\(item\) => \(/);
  assert.doesNotMatch(layout, /NAVIGATION/);
});
