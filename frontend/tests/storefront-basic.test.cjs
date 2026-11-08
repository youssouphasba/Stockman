const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const { test } = require('node:test');
const root = path.resolve(__dirname, '../..');

const STOREFRONT = 'web-app/src/app/shop/[slug]/StorefrontClient.tsx';
const HISTORICAL_BASIC_FINGERPRINT = '133ea4af04f4e8878e08a2d202436517f9bbb794641297f56f0eb211c02f3a41';
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

function basicBody() {
  const source = ts.createSourceFile(STOREFRONT, fs.readFileSync(path.join(root, STOREFRONT), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'StockmanBasicStorefront');
  assert.ok(component);
  return { source, component, text: component.body.getText(source) };
}

test('Stockman Basic keeps its exact render; the private preview only adds isolated branches', () => {
  const { text } = basicBody();
  assert.equal(sha256(text), '901ba310a745d45e0a57bcb248fe119262d07ea04d8bea2fdf6484244b889c9e');
  // En retirant les seules branches de l'aperçu privé, on retrouve octet pour octet le rendu public historique.
  const removals = [
    [`    // L'aperçu privé lit une révision grâce au jeton transmis dans le corps ; le site public garde sa lecture par adresse.
    const request = previewToken
      ? fetch('/api/public/ecommerce/preview', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: previewToken }) })
      : fetch(\`/api/public/ecommerce/\${slug}\`, { cache: 'no-store' });
    request
`, "    fetch(`/api/public/ecommerce/${slug}`, { cache: 'no-store' })\n"],
    ["throw new Error(previewToken ? PREVIEW_UNAVAILABLE : 'Boutique en ligne introuvable.');", "throw new Error('Boutique en ligne introuvable.');"],
    ['  }, [slug, previewToken]);', '  }, [slug]);'],
    ["  const privatePreview = Boolean(previewToken);\n  const isPreview = privatePreview || searchParams.get('preview') === '1';\n  const previewExpiry = formatPreviewExpiry(payload?.preview?.expires_at);\n", "  const isPreview = searchParams.get('preview') === '1';\n"],
    ['    if (privatePreview) {\n      setError(PREVIEW_ORDER_DISABLED);\n      return;\n    }\n', ''],
    ['    if (privatePreview) {\n      setContactError(PREVIEW_CONTACT_DISABLED);\n      return;\n    }\n', ''],
    [`{privatePreview ? "Commandes désactivées dans l'aperçu" : submitting ? 'Envoi...' : 'Envoyer la commande'}`, "{submitting ? 'Envoi...' : 'Envoyer la commande'}"],
    [`{privatePreview ? "Messages désactivés dans l'aperçu" : contactSubmitting ? 'Envoi...' : 'Envoyer le message'}`, "{contactSubmitting ? 'Envoi...' : 'Envoyer le message'}"],
  ];
  let historical = text;
  for (const [preview, original] of removals) {
    assert.equal(historical.split(preview).length - 1, 1, preview.slice(0, 60));
    historical = historical.replace(preview, original);
  }
  const banner = historical.indexOf('      {privatePreview && (');
  assert.ok(banner > 0);
  historical = historical.slice(0, banner) + historical.slice(historical.indexOf('      )}\n', banner) + '      )}\n'.length);
  historical = historical.split('privatePreview || ').join('');
  assert.equal(historical.includes('privatePreview'), false);
  assert.equal(sha256(historical), HISTORICAL_BASIC_FINGERPRINT);
});

test('The private preview disables commercial actions and never puts the token in a URL', () => {
  const { source, component, text } = basicBody();
  const firstStatement = (name) => {
    let found = null;
    const visit = (node) => {
      if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) found = node.initializer.body.statements[0].getText(source);
      ts.forEachChild(node, visit);
    };
    visit(component);
    return found;
  };
  assert.match(firstStatement('submitOrder'), /^if \(privatePreview\)/);
  assert.match(firstStatement('submitContactRequest'), /^if \(privatePreview\)/);
  assert.match(text, /const isPreview = privatePreview \|\| searchParams\.get\('preview'\) === '1';/);
  assert.match(text, /disabled=\{privatePreview \|\| submitting/);
  assert.match(text, /disabled=\{privatePreview \|\| contactSubmitting/);
  const full = fs.readFileSync(path.join(root, STOREFRONT), 'utf8');
  assert.doesNotMatch(full, /preview\/\$\{previewToken\}|[?&]token=/);
  assert.match(full, /return <Renderer slug=\{slug\} previewToken=\{previewToken\} \/>;/);
  const page = fs.readFileSync(path.join(root, 'web-app/src/app/preview/page.tsx'), 'utf8');
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true/);
  assert.match(page, /referrer: 'no-referrer'/);
  const client = fs.readFileSync(path.join(root, 'web-app/src/app/preview/PreviewClient.tsx'), 'utf8');
  assert.match(client, /window\.location\.hash/);
  assert.match(client, /<StorefrontClient key=\{token\} slug="" previewToken=\{token\} \/>/);
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
