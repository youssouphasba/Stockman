const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const { test } = require('node:test');
const root = path.resolve(__dirname, '../..');

test('Stockman Basic retains the exact historical render and commercial behavior', () => {
  const filename = 'web-app/src/app/shop/[slug]/StorefrontClient.tsx';
  const source = ts.createSourceFile(filename, fs.readFileSync(path.join(root, filename), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'StockmanBasicStorefront');
  assert.ok(component);
  assert.equal(crypto.createHash('sha256').update(component.body.getText(source)).digest('hex'), '133ea4af04f4e8878e08a2d202436517f9bbb794641297f56f0eb211c02f3a41');
});

test('Missing and unsupported model identifiers fall back to Basic', () => {
  const source = fs.readFileSync(path.join(root, 'web-app/src/lib/ecommerceThemes.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  const requireContract = (request) => {
    assert.equal(request, './ecommerceThemeContract.json');
    return JSON.parse(fs.readFileSync(path.join(root, 'web-app/src/lib/ecommerceThemeContract.json'), 'utf8'));
  };
  vm.runInNewContext(compiled, { exports, Object, require: requireContract });
  for (const id of [undefined, null, '', 'legacy-v1', 'unsupported', 'toString', '__proto__']) {
    assert.equal(exports.resolveEcommerceModel(id).id, 'legacy-v1');
    assert.equal(exports.resolveEcommerceModel(id).name, 'Stockman Basic');
  }
});

test('Unknown renderers fall back to Basic instead of a blank page', () => {
  const source = fs.readFileSync(path.join(root, 'web-app/src/app/shop/[slug]/StorefrontClient.tsx'), 'utf8');
  assert.match(source, /STOREFRONT_RENDERERS\[model\.id as keyof typeof STOREFRONT_RENDERERS\] \|\| StockmanBasicStorefront/);
});

test('The shared theme contract is identical on the server and the web', () => {
  assert.equal(
    fs.readFileSync(path.join(root, 'web-app/src/lib/ecommerceThemeContract.json'), 'utf8'),
    fs.readFileSync(path.join(root, 'backend/ecommerce_theme_contract.json'), 'utf8'),
  );
});
