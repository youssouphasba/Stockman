const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

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
  assert.match(commerce, /const submitOrder = useCallback\(async \(form: OrderForm\) => \{\n\s+if \(preview\) \{/);
  assert.match(commerce, /const submitContact = useCallback\(async \(form: ContactForm\) => \{\n\s+if \(preview\) \{/);
  assert.match(commerce, /if \(!payload \|\| preview \|\| tracked\.current \|\| !slug\) return;/);
  // La quantité ajoutée (fiche produit) reste bornée par le stock publié.
  assert.match(commerce, /const wanted = Math\.max\(1, Math\.floor\(quantity\)\);/);
  assert.match(commerce, /quantity: Math\.min\(previous \+ wanted, Math\.max\(0, product\.quantity\)\)/);
  const storefront = read('web-app/src/storefront/ThemeStorefront.tsx');
  // Dans l'aperçu, le fragment de l'adresse porte le jeton : la navigation ne le remplace jamais.
  assert.match(storefront, /if \(!preview\) \{\n\s+const hash = PAGE_HASHES\[target\];/);
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
