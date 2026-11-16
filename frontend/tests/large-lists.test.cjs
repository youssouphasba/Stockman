const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const read = (file) => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

// La boucle de chargement des clients est extraite de services/api.ts et exécutée avec un faux serveur.
function loadListAll(totalCustomers) {
  const source = read('services/api.ts');
  const page = source.slice(source.indexOf('const CUSTOMERS_PAGE_SIZE'), source.indexOf('export const customers = {'));
  const listAll = source.slice(source.indexOf('  listAll: async'), source.indexOf('  get: (id: string) => request<Customer>'));
  const program = `${page}\nconst customersObject = {\n${listAll}};\nmodule.exports = customersObject;`;
  const output = ts.transpileModule(program, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const calls = [];
  const request = async (url) => {
    const params = new URLSearchParams(url.split('?')[1]);
    const skip = Number(params.get('skip'));
    const limit = Number(params.get('limit'));
    calls.push({ skip, limit });
    const items = Array.from({ length: Math.max(0, Math.min(limit, totalCustomers - skip)) }, (_, index) => ({ customer_id: `c${skip + index}` }));
    return { items, total: totalCustomers };
  };
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports, request, URLSearchParams });
  return { customers: module.exports, calls };
}

test('tous les clients sont chargés, au-delà de la première page', async () => {
  const { customers, calls } = loadListAll(1234);
  const pages = [];
  const result = await customers.listAll('name', (items, total) => pages.push([items.length, total]));
  assert.equal(result.items.length, 1234);
  assert.equal(new Set(result.items.map((item) => item.customer_id)).size, 1234);
  assert.deepEqual(calls.map((call) => call.skip), [0, 500, 1000]);
  assert.ok(calls.every((call) => call.limit <= 500), 'le serveur refuse plus de 500 clients par page');
  assert.deepEqual(pages, [[500, 1234], [1000, 1234], [1234, 1234]]);
});

test('le chargement s’arrête si l’écran a changé de compte ou de boutique', async () => {
  const { customers, calls } = loadListAll(5000);
  let current = true;
  await customers.listAll('name', () => { current = false; }, () => current);
  assert.equal(calls.length, 1);
});

test('le CRM, la caisse et la facture utilisent tout le fichier client', () => {
  assert.match(read('app/(tabs)/crm.tsx'), /customersApi\.listAll\(sort,/);
  assert.match(read('app/(tabs)/crm.tsx'), /visibleCustomers\.map\(/);
  assert.match(read('app/(tabs)/pos.tsx'), /customersApi\.listAll\(undefined, undefined, isCurrent\)/);
  assert.match(read('app/(tabs)/pos.tsx'), /shownCustomers\.map\(/);
  assert.match(read('app/(tabs)/accounting.tsx'), /customersApi\.listAll\(\)/);
});

test('la caisse cherche sur le serveur les produits au-delà de ceux chargés', () => {
  const pos = read('app/(tabs)/pos.tsx');
  assert.match(pos, /const catalogTruncated = productTotal > productList\.length;/);
  assert.match(pos, /productsApi\.list\(undefined, 0, 50, restaurantMode \? true : undefined, query\)/);
  assert.match(pos, /if \(matches\.length === 0 && catalogTruncated && code\)/);
});

test('les commandes fournisseurs se chargent par pages', () => {
  const orders = read('app/(tabs)/orders.tsx');
  assert.match(orders, /ordersApi\.list\(\.\.\.orderQueryArgs\(\), orderList\.length, 50\)/);
  assert.match(orders, /orderList\.length < orderTotal &&/);
});
