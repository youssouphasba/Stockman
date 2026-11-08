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
  assert.match(commerce, /quantity: Math\.min\(previous \+ 1, Math\.max\(0, product\.quantity\)\)/);
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
