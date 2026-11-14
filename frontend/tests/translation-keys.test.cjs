const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const { createInstance } = require('i18next');

const root = path.resolve(__dirname, '../..');
const readLocale = (folder, language) => JSON.parse(fs.readFileSync(path.join(root, folder, language + '.json'), 'utf8'));
const lookup = (dictionary, key) => key.split('.').reduce((node, part) => node?.[part], dictionary);

for (const { name, screens, locales } of [
  { name: 'Mobile', screens: ['frontend/app', 'frontend/components'], locales: ['frontend/locales'] },
  { name: 'Web', screens: ['web-app/src/app', 'web-app/src/components'], locales: ['web-app/src/locales', 'web-app/public/locales'] },
]) {
  test(name + ' translation calls have a dictionary entry or an explicit fallback', () => {
    const dictionaries = locales.flatMap((directory) => ['fr', 'en'].map((language) => readLocale(directory, language)));
    const missing = new Map();
    for (const directory of screens) {
      for (const relativeFile of fs.readdirSync(path.join(root, directory), { recursive: true })) {
        if (!relativeFile.endsWith('.tsx')) continue;
        const file = path.join(directory, relativeFile);
        const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        function visit(node) {
          if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't') {
            const [key, options] = node.arguments;
            if (key && ts.isStringLiteral(key)) {
              const returnsObjects = options && ts.isObjectLiteralExpression(options) &&
                options.properties.some((property) => ts.isPropertyAssignment(property) &&
                  property.name.getText(source) === 'returnObjects' && property.initializer.kind === ts.SyntaxKind.TrueKeyword);
              const translated = dictionaries.some((dictionary) =>
                ['', '_one', '_other', '_zero'].some((suffix) => {
                  const value = lookup(dictionary, key.text + suffix);
                  return typeof value === 'string' || (returnsObjects && value != null && typeof value === 'object');
                }));
              const fallback = options && (ts.isStringLiteralLike(options) || ts.isTemplateExpression(options) ||
                (ts.isObjectLiteralExpression(options) && options.properties.some((property) => property.name?.getText(source) === 'defaultValue')));
              if (!translated && !fallback) missing.set(key.text, file);
            }
          }
          ts.forEachChild(node, visit);
        }
        visit(source);
      }
    }
    assert.deepEqual([...missing], []);
  });
}

test('Product deletion and restoration have accented French labels and English translations', async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: 'fr',
    fallbackLng: 'fr',
    resources: Object.fromEntries(['fr', 'en'].map((language) => [language, {
      translation: readLocale('frontend/locales', language),
    }])),
  });
  assert.equal(i18n.t('products.delete_confirmed_title'), 'Produit supprimé');
  assert.match(i18n.t('products.delete_restore_hint'), /a été supprimé/);
  assert.equal(i18n.t('products.restore_success'), 'Produit restauré avec succès.');
  await i18n.changeLanguage('en');
  assert.equal(i18n.t('products.delete_confirmed_title'), 'Product deleted');
  assert.equal(i18n.t('supplier_catalog_import.imported', { count: 2 }), '2 products added to the supplier catalogue.');
});
