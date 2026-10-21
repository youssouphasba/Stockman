const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');

const root = path.resolve(__dirname, '..');
function read(file) {
  return ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function find(source, predicate) {
  let found;
  function visit(node) {
    if (found) return;
    if (predicate(node)) found = node;
    else ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(found);
  return found;
}
function evaluate(source, scope) {
  return vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, { exports: {}, ...scope });
}
const orders = read('app/(tabs)/orders.tsx');
const overview = read('components/EcommerceOverview.tsx');
const route = read('app/(tabs)/ecommerce.tsx');
const loader = find(orders, (node) => ts.isVariableDeclaration(node) && node.name.getText(orders) === 'loadWebOrders').initializer.arguments[0];

function orderLoader(overrides = {}) {
  const state = { orders: [], total: 0, loading: false, error: false, calls: [] };
  const scope = {
    ecommerceWorkspace: true, webStatus: 'all', webOrdersRequestRef: { current: 0 }, webOrdersOffsetRef: { current: 0 },
    setWebOrders: (value) => { state.orders = typeof value === 'function' ? value(state.orders) : value; },
    setWebOrdersTotal: (value) => { state.total = value; },
    setWebOrdersLoading: (value) => { state.loading = value; },
    setWebOrdersError: (value) => { state.error = value; },
    ecommerceApi: { listOrders: async (...args) => { state.calls.push(args); return { items: [], total: 0 }; } },
    ...overrides,
  };
  return { state, scope, run: evaluate('(' + loader.getText(orders) + ')', scope) };
}

test('The workspace route is native Starter only and resets when account or store changes', () => {
  const component = find(route, (node) => ts.isFunctionDeclaration(node));
  for (const platform of ['android', 'ios', 'web']) {
    for (const starter of [true, false]) {
      const Screen = evaluate(component.getText(route) + '\nEcommerceScreen;', {
        React, Platform: { OS: platform }, Redirect: 'redirect', OrdersScreen: 'orders',
        useAuth: () => ({ user: { user_id: 'account', active_store_id: 'store' } }),
        isStarterShopkeeper: () => starter,
      });
      const tree = Screen();
      assert.equal(tree.type, starter && platform !== 'web' ? 'orders' : 'redirect');
      if (tree.type === 'orders') {
        assert.equal(tree.key, 'account:store');
        assert.equal(tree.props.ecommerceWorkspace, true);
      }
    }
  }
});

test('Status filters and pagination use the existing order API without a date limit', async () => {
  const h = orderLoader({ webStatus: 'preparing' });
  h.scope.ecommerceApi.listOrders = async (...args) => {
    h.state.calls.push(args);
    return { items: [{ order_id: String(args[1]) }], total: 2 };
  };
  await h.run();
  await h.run(true);
  assert.deepEqual(h.state.calls, [['preparing', 0], ['preparing', 1]]);
  assert.equal(h.state.orders.length, 2);
  assert.equal(h.state.total, 2);
  assert.equal(h.state.loading, false);
});

test('A late response cannot overwrite a newer filter result', async () => {
  const pending = [];
  const h = orderLoader({ ecommerceApi: { listOrders: () => new Promise((resolve) => pending.push(resolve)) } });
  const first = h.run();
  const second = h.run();
  pending[1]({ items: [{ order_id: 'new' }], total: 1 });
  await second;
  pending[0]({ items: [{ order_id: 'old' }], total: 20 });
  await first;
  assert.equal(h.state.orders[0].order_id, 'new');
  assert.equal(h.state.total, 1);
});

test('Loading failures remain errors instead of a successful empty list', async () => {
  const h = orderLoader({ ecommerceApi: { listOrders: async () => { throw new Error('offline'); } } });
  await h.run();
  assert.equal(h.state.error, true);
  assert.equal(h.state.loading, false);
});

test('Pro and Enterprise keep the original unfiltered API call', async () => {
  const h = orderLoader({ ecommerceWorkspace: false });
  await h.run();
  assert.deepEqual(h.state.calls, [[]]);
});

test('The reused detail preserves the full order, including customer, items and amounts', async () => {
  const detail = find(orders, (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'openWebOrderDetail');
  const record = Object.freeze({ order_id: 'order', customer_name: '', customer_phone: '', customer_address: '', items: [], total_amount: 0 });
  let selected;
  const open = evaluate(detail.getText(orders) + '\nopenWebOrderDetail;', {
    webOrderDetailRequestRef: { current: 0 }, ecommerceWorkspace: true, webOrders: [record],
    setActiveTab: (value) => assert.equal(value, 'web'), setShowWebOrderDetailModal: (value) => assert.equal(value, true),
    setSelectedWebOrder: (value) => { selected = value; },
    ecommerceApi: { getOrder: async (id) => { assert.equal(id, record.order_id); return record; } },
    Alert: { alert: () => assert.fail('Unexpected detail error') }, t: (key) => key,
  });
  await open(record.order_id);
  assert.equal(selected, record);
});

test('The existing Denkma action forwards the selected order unchanged', async () => {
  const button = find(orders, (node) => ts.isJsxElement(node) && node.openingElement.tagName.getText(orders) === 'TouchableOpacity' && node.getText(orders).includes('await openDenkmaForOrder(selectedWebOrder)'));
  const onPress = button.openingElement.attributes.properties.find((node) => node.name?.text === 'onPress');
  const selected = Object.freeze({ order_id: 'order' });
  let forwarded;
  await evaluate('(' + onPress.initializer.expression.getText(orders) + ')', {
    selectedWebOrder: selected, openDenkmaForOrder: async (value) => { forwarded = value; },
    Alert: { alert: () => assert.fail('Unexpected Denkma error') }, t: (key) => key,
  })();
  assert.equal(forwarded, selected);
});

test('Status changes reuse the current handler and refresh workspace statistics only', async () => {
  const node = find(orders, (node) => ts.isVariableDeclaration(node) && node.name.getText(orders) === 'updateWebOrderStatus');
  for (const workspace of [true, false]) {
    const calls = [];
    const update = evaluate('(' + node.initializer.getText(orders) + ')', {
      ecommerceWorkspace: workspace, ecommerceApi: { updateOrderStatus: async (...args) => calls.push(args) },
      loadWebOrders: async () => calls.push('list'), setEcommerceRefreshKey: () => calls.push('stats'),
      Alert: { alert: () => assert.fail('Unexpected alert') }, t: (key) => key,
    });
    await update('order', 'ready');
    assert.deepEqual(calls, workspace ? [['order', 'ready'], 'list', 'stats'] : [['order', 'ready'], 'list']);
  }
});

test('A failed status update shows the existing error without refreshing or claiming success', async () => {
  const node = find(orders, (node) => ts.isVariableDeclaration(node) && node.name.getText(orders) === 'updateWebOrderStatus');
  let alerted = false;
  const update = evaluate('(' + node.initializer.getText(orders) + ')', {
    ecommerceWorkspace: true, ecommerceApi: { updateOrderStatus: async () => { throw new Error('denied'); } },
    loadWebOrders: () => assert.fail('A failed update must not refresh'),
    setEcommerceRefreshKey: () => assert.fail('A failed update must not refresh statistics'),
    Alert: { alert: () => { alerted = true; } }, t: (key) => key,
  });
  await update('order', 'cancelled');
  assert.equal(alerted, true);
});

test('A Starter E-com deep link loads once through the focus effect, not twice', () => {
  const effect = find(orders, (node) => ts.isCallExpression(node) && node.expression.getText(orders) === 'useEffect' && node.arguments[0]?.getText(orders).includes('const reminderKey ='));
  evaluate('(' + effect.arguments[0].getText(orders) + ')', {
    ecommerceOnly: true, orderIdParam: undefined, productIdParam: undefined, tabParam: 'web', sourceParam: 'ecommerce', reminderTypeParam: undefined,
    setActiveTab: (value) => assert.equal(value, 'web'),
    loadWebOrders: () => assert.fail('Already loaded through focus'),
  })();
});

test('Compact screens wrap order actions and preserve 48px targets only in the workspace', () => {
  const styles = find(orders, (node) => ts.isVariableDeclaration(node) && node.name.getText(orders) === 'getStyles');
  const getStyles = evaluate('(' + styles.initializer.getText(orders) + ')', {
    StyleSheet: { create: (value) => value }, Spacing: {}, BorderRadius: {}, FontSize: {},
  });
  assert.equal(getStyles({}, {}, true).orderActions.flexWrap, 'wrap');
  assert.equal(getStyles({}, {}, true).actionBtn.minHeight, 48);
  assert.equal(getStyles({}, {}, false).orderActions.flexWrap, undefined);
});

function statsLoader(overrides = {}) {
  const node = find(overview, (node) => ts.isCallExpression(node) && node.expression.getText(overview) === 'useFocusEffect');
  const values = {};
  const scope = {
    setLoading: (value) => { values.loading = value; },
    setError: (value) => { values.error = value; },
    setStats: (value) => { values.stats = value; },
    ...overrides,
  };
  const start = evaluate('(' + node.arguments[0].arguments[0].getText(overview) + ')', scope);
  return { values, start };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('Statistics do not depend on site activation and never fetch its configuration', async () => {
  const h = statsLoader({ ecommerceApi: {
    getStats: async () => ({ site: { enabled: false } }),
    getSite: () => assert.fail('Duplicate site request'),
  } });
  h.start();
  await flush();
  assert.equal(h.values.stats.site.enabled, false);
  assert.equal(h.values.loading, false);
  assert.equal(h.values.error, false);
});

test('Statistics failure stays local and never falls back to site configuration', async () => {
  const h = statsLoader({ ecommerceApi: {
    getStats: async () => { throw new Error('offline'); },
    getSite: () => assert.fail('Statistics must not load site configuration'),
  } });
  h.start();
  await flush();
  assert.equal(h.values.error, true);
  assert.equal(h.values.stats, null);
});

test('Leaving the statistics screen ignores the pending response', async () => {
  let resolve;
  const h = statsLoader({ ecommerceApi: { getStats: () => new Promise((done) => { resolve = done; }) } });
  const stop = h.start();
  stop();
  resolve({ site: { enabled: true } });
  await flush();
  assert.equal(h.values.stats, undefined);
});

function renderOverview(values, props = {}) {
  const names = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(overview) === 'useState') names.push(node.name.elements[0].getText(overview));
    ts.forEachChild(node, visit);
  }
  visit(overview);
  let index = 0;
  const calls = [];
  const component = find(overview, (node) => ts.isFunctionDeclaration(node));
  const Screen = evaluate(component.getText(overview) + '\nEcommerceOverview;', {
    React, View: 'View', Text: 'Text', TouchableOpacity: 'Button', ActivityIndicator: 'Loading', Ionicons: 'Icon',
    useState: (initial) => { const name = names[index++]; return [name in values ? values[name] : initial, () => {}]; },
    useFocusEffect: () => {}, useCallback: (fn) => fn,
    useAuth: () => ({ user: {} }), useTheme: () => ({ colors: {} }),
    useRouter: () => ({ push: (route) => calls.push(route) }), formatCurrency: (value) => String(value),
  });
  const nodes = [];
  function collect(node) {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) return;
      nodes.push(child);
      collect(child.props.children);
    });
  }
  collect(Screen({ refreshKey: 0, ...props }));
  return { nodes, calls, text: nodes.filter((node) => node.type === 'Text').map((node) => node.props.children).join(' ') };
}

test('Disabled and unconfigured sites show no activation, configuration or site links in E-com', () => {
  for (const site of [null, { enabled: false, store_id: 'store' }, { enabled: true, site_url: 'https://stockman.pro' }]) {
    const h = renderOverview({ loading: false, stats: { site } });
    assert.ok(!h.nodes.some((node) => ['TextInput', 'Switch'].includes(node.type)));
    assert.ok(!h.nodes.some((node) => node.type === 'Button'));
    assert.ok(!/configur|désactiv|active|mon site/i.test(h.text));
    assert.equal(h.calls.length, 0);
  }
});

test('Six metrics render real zero values and explicit API periods', () => {
  const h = renderOverview({ loading: false, stats: {
    site: {}, period_days: 30, orders_total: 0, pending_orders: 0, revenue_30d: 0,
    average_order_30d: 0, visits_30d: 0, conversion_rate_30d: 0,
  } });
  for (const label of ['Commandes', 'En attente', 'CA E-com', 'Panier moyen', 'Visites', 'Conversion', '30 jours']) assert.ok(h.text.includes(label));
  assert.ok(h.text.includes('0 %'));
});

test('The default Commands view does not mount statistics or depend on their result', () => {
  const state = find(orders, (node) => ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && node.name.elements[0].getText(orders) === 'ecommerceView');
  assert.equal(state.initializer.arguments[0].text, 'orders');
  const element = find(orders, (node) => ts.isJsxSelfClosingElement(node) && node.tagName.getText(orders) === 'EcommerceOverview');
  assert.ok(ts.isBinaryExpression(element.parent));
  const condition = element.parent.left;
  for (const ecommerceView of ['orders', 'stats']) {
    assert.equal(evaluate('(' + condition.getText(orders) + ')', { ecommerceView }), ecommerceView === 'stats');
  }
});

test('The E-com drawer contains only operational actions, not site configuration', () => {
  const focus = find(orders, (node) => ts.isCallExpression(node) && node.expression.getText(orders) === 'useFocusEffect' && node.arguments[0]?.getText(orders).includes("setDrawerContent('Commandes en ligne'"));
  let items;
  const callback = evaluate('(' + focus.arguments[0].arguments[0].getText(orders) + ')', {
    ecommerceOnly: true, setDrawerContent: (_title, value) => { items = value; },
    onRefresh: () => {}, t: (_key, label) => label,
  });
  callback();
  assert.equal(items.length, 1);
  assert.equal(items[0].icon, 'refresh-outline');
});

test('Android back can close the reused web order modal', () => {
  const modal = find(orders, (node) => ts.isJsxOpeningElement(node) && node.tagName.getText(orders) === 'Modal' && node.attributes.getText(orders).includes('showWebOrderDetailModal'));
  const attribute = modal.attributes.properties.find((node) => node.name?.text === 'onRequestClose');
  let open = true;
  evaluate('(' + attribute.initializer.expression.getText(orders) + ')', { setShowWebOrderDetailModal: (value) => { open = value; } })();
  assert.equal(open, false);
});
