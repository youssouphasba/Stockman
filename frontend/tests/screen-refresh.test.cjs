const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const transpile = (text) => ts.transpileModule(text, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;
const { createScreenRefresh: createPosRefresh } = vm.runInNewContext(
  transpile(fs.readFileSync(path.join(root, 'utils/screenRefresh.ts'), 'utf8')) + '\nexports;',
  { exports: {} },
);
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function readCallback(name, scope, route = 'pos') {
  const file = path.join(root, 'app/(tabs)', route + '.tsx');
  const screenAst = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function find(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(screenAst) === name) return node;
    return ts.forEachChild(node, find);
  }
  const initializer = find(screenAst).initializer;
  return vm.runInNewContext(transpile('(' + initializer.arguments[0].getText(screenAst) + ')'), scope);
}

function catalogLoader(overrides = {}) {
  const state = {};
  const scope = {
    productRefresh: { current: createPosRefresh(60_000) },
    catalogKeyRef: { current: 'catalog-query' }, catalogRequestKey: 'catalog-query',
    catalogScope: 'current-store', isConnected: true, isRestaurant: false,
    selectedCategory: null, productSortMode: 'stock_priority', serverProductStatus: undefined,
    PRODUCTS_PAGE_SIZE: 100, MOBILE_PERF_ENABLED: false,
    visibleCatalogRef: { current: null }, catalogRevisionRef: { current: 0 },
    cache: { get: async () => null, set: async () => {} },
    KEYS: { PRODUCTS_SNAPSHOT: 'snapshot', PRODUCTS: 'products', CATEGORIES: 'categories' },
    setProductList: (items) => { state.items = items; },
    setProductsTotal: (value) => { state.total = value; },
    setLoading: (value) => { state.loading = value; },
    setCatalogError: (value) => { state.error = value; },
    setProductsLoadingMore: () => {}, setCategoryList: () => {}, setRefreshing: () => {},
    setVisibleCatalogKey: () => {}, setAccessDenied: () => {},
    loadProductExtras: () => {}, loadCategories: () => {},
    ApiError: class extends Error {},
    ...overrides,
  };
  return { state, load: readCallback('loadCatalog', scope, 'products'), scope };
}

test('Products publish the first page without waiting for categories or local storage', async () => {
  const categories = deferred();
  const disk = deferred();
  const items = [];
  let requests = 0;
  const h = catalogLoader({
    loadCategories: () => categories.promise,
    productsApi: { list: async () => { requests++; return { items, total: 0 }; } },
    cache: { get: () => disk.promise, set: async () => {} },
  });
  await Promise.all([h.load(false), h.load(false)]);
  assert.equal(h.state.items, items);
  assert.equal(h.state.loading, false);
  assert.equal(requests, 1);
  disk.resolve({ scope: 'current-store', items: [{ product_id: Symbol() }] });
  categories.resolve([]);
  await new Promise(setImmediate);
  assert.equal(h.state.items, items);
});

test('A products response cannot replace the list after the filters change', async () => {
  const page = deferred();
  const h = catalogLoader({ productsApi: { list: () => page.promise } });
  const refresh = h.load(false);
  await Promise.resolve();
  h.scope.catalogKeyRef.current = 'new-filter';
  page.resolve({ items: [], total: 0 });
  await refresh;
  assert.equal(h.state.items, undefined);
  assert.equal(h.state.loading, undefined);
});

test('Dashboard displays the matching cached store immediately and ignores other stores', async () => {
  for (const cacheScope of ['current-store', 'other-store']) {
    const server = deferred();
    const settings = deferred();
    const cached = { dashboard: Symbol('cached') };
    const live = { dashboard: Symbol('live') };
    const states = [];
    let loading = true;
    const load = readCallback('loadCoreData', {
      dashboardScope: 'current-store', isConnected: true, hasDashboardDataRef: { current: false },
      MOBILE_PERF_ENABLED: false, Platform: { OS: 'web' },
      cache: { get: async () => ({ scope: cacheScope, data: cached }), set: async () => {} },
      KEYS: { DASHBOARD_SNAPSHOT: 'dashboard-snapshot' },
      dashboardApi: { get: () => server.promise }, settingsApi: { get: () => settings.promise },
      setData: (data) => states.push(data), setLoading: (value) => { loading = value; },
      setRefreshing: () => {}, setUserSettings: () => {},
    }, 'index');
    const running = load(() => true);
    await Promise.resolve();
    assert.equal(loading, cacheScope === 'other-store');
    assert.deepEqual(states, cacheScope === 'current-store' ? [cached] : []);
    server.resolve(live);
    await running;
    assert.equal(states.at(-1), live);
    assert.equal(loading, false);
    settings.resolve({});
  }
});

test('POS publishes the restaurant catalog even while the customer and tax endpoints are pending', async () => {
  const refresh = createPosRefresh(60_000);
  const waiting = deferred();
  const customerTask = refresh.run('customers', async () => { await waiting.promise; return true; });
  const taxTask = refresh.run('settings', async () => { await waiting.promise; return true; });
  const calls = [];
  const product = { product_id: Symbol('test-product'), is_active: true };
  const load = readCallback('loadProducts', {
    refresh, POS_PRODUCT_LIMIT: 500, user: {}, verifiedRestaurantMode: { current: null },
    userFeatures: { get: async () => ({ is_restaurant: true }) },
    isRestaurantBusiness: (features) => features.is_restaurant,
    setProductsLoading: (value) => calls.push(value),
    setRestaurantMode: (value) => calls.push(['restaurant', value]),
    loadTables: () => waiting.promise,
    productsApi: { list: async (_category, _skip, _limit, menuOnly) => {
      assert.equal(menuOnly, true);
      return { items: [product] };
    } },
    mergePosProductsOfflineState: async (items) => items,
    setProductList: (items) => calls.push(items[0]),
    setProductLoadError: (error) => assert.equal(error, null),
  });
  await load();
  assert.deepEqual(calls, [true, ['restaurant', true], product, false]);
  waiting.resolve();
  await Promise.all([customerTask, taxTask]);
});

test('Repeated focus events reuse the same request and respect its freshness', async () => {
  const refresh = createPosRefresh(60_000);
  const read = deferred();
  let calls = 0;
  const fetchProducts = async () => { calls++; await read.promise; return true; };
  const first = refresh.run('products', fetchProducts);
  assert.equal(refresh.run('products', fetchProducts), first);
  read.resolve();
  await first;
  await refresh.run('products', fetchProducts);
  assert.equal(calls, 1);
});

test('A post-sale refresh supersedes pre-sale stock responses and disposed work cannot publish', async () => {
  const refresh = createPosRefresh(60_000);
  const old = deferred();
  const update = deferred();
  const commits = [];
  const first = refresh.run('products', async (isCurrent) => {
    await old.promise;
    if (isCurrent()) commits.push('old stock');
    return true;
  });
  await Promise.resolve();
  await refresh.run('products', async (isCurrent) => {
    if (isCurrent()) commits.push('new stock');
    return true;
  }, { replace: true });
  old.resolve();
  await first;
  const customers = refresh.run('customers', async (isCurrent) => {
    await update.promise;
    if (isCurrent()) commits.push('previous store');
    return true;
  });
  await Promise.resolve();
  refresh.dispose();
  update.resolve();
  await customers;
  await refresh.run('products', () => assert.fail('Disposed work must not make new requests'));
  assert.deepEqual(commits, ['new stock']);
});

test('Failed reads are retried on the next automatic refresh instead of marked fresh', async () => {
  const refresh = createPosRefresh(60_000);
  let calls = 0;
  const read = async () => ++calls === 2;
  await refresh.run('settings', read);
  await refresh.run('settings', read);
  await refresh.run('settings', read);
  assert.equal(calls, 2);
});

test('A customer added while the POS list is loading remains selectable', async () => {
  const waiting = deferred();
  const createdCustomers = { current: [] };
  let renderedIds = [];
  const load = readCallback('loadCustomers', {
    refresh: createPosRefresh(60_000), createdCustomers,
    customersApi: { list: () => waiting.promise },
    setCustomerList: (items) => { renderedIds = Array.from(items, (item) => item.customer_id); },
  });
  const request = load();
  await Promise.resolve();
  const customerId = Symbol('new-customer');
  createdCustomers.current.push({ customer_id: customerId });
  waiting.resolve({ items: [] });
  await request;
  assert.deepEqual(renderedIds, [customerId]);
});

test('Clients publishes the current sort without waiting for promotions or loyalty', async () => {
  const waiting = deferred();
  const slowSort = deferred();
  const latestSort = { current: 'name' };
  const states = [];
  const load = readCallback('loadData', {
    refresh: createPosRefresh(60_000), latestSort,
    promotionsApi: { list: () => waiting.promise },
    settingsApi: { get: () => waiting.promise },
    customersApi: { list: (sort) => sort === 'name' ? slowSort.promise : Promise.resolve({ items: [] }) },
    mergeCustomersOfflineState: async (customers) => ({ customers, summary: {} }),
    setCustomerList: (value) => states.push(value.length),
    setPendingCrmSummary: () => {}, setPromoList: () => {}, setLoyaltySettings: () => {},
    setCustomerLoadError: () => {}, setAccessDenied: () => {}, setLoading: () => {}, setRefreshing: () => {},
  }, 'crm');
  const first = load(false);
  await Promise.resolve();
  latestSort.current = 'total_spent';
  await load(false);
  assert.deepEqual(states, [0]);
  slowSort.resolve({ items: [] });
  await first;
  assert.deepEqual(states, [0]);
  waiting.resolve({});
});

test('Compta publishes current indicators while histories are pending and drops the old period', async () => {
  const waiting = deferred();
  const oldPeriod = deferred();
  const latestQuery = { current: { reportDays: 30, invoiceKey: '30', statsKey: '30/all', salesChannel: 'all' } };
  const snapshots = [];
  const load = readCallback('loadData', {
    refresh: createPosRefresh(60_000), latestQuery, user: {},
    storesApi: { list: () => waiting.promise }, settingsApi: { get: () => waiting.promise },
    accountingApi: {
      getStats: (days) => days === 30 ? oldPeriod.promise : Promise.resolve(Symbol('stats')),
      getSalesHistory: () => waiting.promise,
      getInvoices: () => waiting.promise,
    },
    expensesApi: { list: () => waiting.promise },
    confirmedHistory: { current: {} },
    mergeAccountingOfflineState: async () => ({}),
    setCurrentStore: () => {}, setSettingsData: () => {}, setStatsSnapshot: (snapshot) => snapshots.push(snapshot.key),
    setStatsErrorKey: () => {}, setRefreshing: () => {}, setHistoryStatus: () => {},
    setRecentSales: () => {}, setInvoiceHistory: () => {}, setExpensesList: () => {}, setPendingSummary: () => {},
  }, 'accounting');
  const first = load(false);
  await Promise.resolve();
  latestQuery.current = { reportDays: 7, invoiceKey: '7', statsKey: '7/all', salesChannel: 'all' };
  const second = load(false);
  await new Promise(setImmediate);
  assert.deepEqual(snapshots, ['7/all']);
  oldPeriod.resolve(Symbol('old-stats'));
  waiting.resolve([]);
  await Promise.all([first, second]);
  assert.deepEqual(snapshots, ['7/all']);
});
