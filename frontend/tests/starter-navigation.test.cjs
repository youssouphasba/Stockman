const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');

const root = path.resolve(__dirname, '..');
const modules = new Map();

function loadUtility(relativePath) {
  const filename = path.join(root, relativePath);
  if (modules.has(filename)) return modules.get(filename);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const requireUtility = (specifier) => loadUtility(path.relative(root, path.resolve(path.dirname(filename), `${specifier}.ts`)));
  vm.runInNewContext('(function(require, module, exports) {' + compiled + '\n})')(requireUtility, module, module.exports);
  modules.set(filename, module.exports);
  return module.exports;
}

const routing = loadUtility('utils/accountRouting.ts');
const starter = { user_id: 'starter', role: 'shopkeeper', subscription_plan: 'starter', effective_plan: 'starter' };

function readSource(relativePath) {
  return ts.createSourceFile(relativePath, fs.readFileSync(path.join(root, relativePath), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function findNode(source, predicate) {
  let result;
  function visit(node) {
    if (result) return;
    if (predicate(node)) result = node;
    else ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(result, 'Expected source node was not found');
  return result;
}

function evaluate(source, scope) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  return vm.runInNewContext(compiled, scope);
}

test('Starter enters Products and cannot remain on Home when stock management is disabled', () => {
  assert.equal(routing.getDefaultRouteForUser(starter), '/(tabs)/products');
  assert.equal(routing.getStarterNavigationRedirect(starter, 'index'), '/(tabs)/products');
  const options = { modules: { stock_management: false } };
  assert.equal(routing.getStarterNavigationRedirect(starter, 'index', undefined, options), '/(tabs)/pos');
  assert.equal(routing.getStarterNavigationRedirect(starter, 'products', undefined, options), '/(tabs)/pos');
  assert.equal(routing.getStarterNavigationRedirect(starter, 'pos', undefined, options), null);
});

test('Fallback observes operational permissions and accounting preferences', () => {
  const accountingOnly = { role: 'staff', effective_permissions: { accounting: 'read' } };
  assert.equal(routing.getStarterRoute(accountingOnly), '/(tabs)/accounting');
  assert.equal(routing.getStarterRoute(accountingOnly, { modules: { accounting: false } }), '/(tabs)/settings');
  assert.equal(routing.getStarterRoute({ role: 'staff', effective_permissions: {} }), '/(tabs)/settings');
  assert.equal(routing.getStarterRoute(starter, { modules: { stock_management: false }, isRestaurant: true }), '/(tabs)/products');
});

test('Subscribed Pro and Enterprise plans are preserved despite a restricted effective plan', () => {
  for (const plan of ['pro', 'enterprise']) {
    const user = { ...starter, subscription_plan: plan, subscription_status: 'expired' };
    assert.equal(routing.isStarterShopkeeper(user), false);
    assert.equal(routing.getDefaultRouteForUser(user), '/(tabs)');
    assert.equal(routing.getStarterNavigationRedirect(user, 'index'), null);
  }
  assert.equal(routing.getCommercialPlan({ ...starter, subscribed_plan: 'enterprise' }), 'enterprise');
});

test('Supplier, superadmin, staff and demo navigation do not inherit the Starter interface', () => {
  for (const role of ['supplier', 'superadmin', 'staff']) {
    assert.equal(routing.isStarterShopkeeper({ ...starter, role }), false);
  }
  assert.equal(routing.getDefaultRouteForUser({ ...starter, role: 'supplier' }), '/(supplier-tabs)');
  assert.equal(routing.getDefaultRouteForUser({ ...starter, role: 'superadmin' }), '/(admin)');
  assert.equal(routing.getDefaultRouteForUser({ ...starter, is_demo: true }), '/(tabs)');
  assert.equal(routing.getDefaultRouteForUser(null), '/(auth)');
});

test('Switching Starter, Pro and Enterprise accounts recalculates the destination each time', () => {
  for (const plan of ['starter', 'pro', 'starter', 'enterprise', 'starter']) {
    assert.equal(routing.getDefaultRouteForUser({ ...starter, subscription_plan: plan }), plan === 'starter' ? '/(tabs)/products' : '/(tabs)');
  }
});

const dashboard = readSource('app/(tabs)/index.tsx');
const closeHandler = findNode(dashboard, (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'closeDashboardModal');

for (const modal of ['history', 'statistics']) {
  test(`${modal} stays open, closes through its actual handler, and can be opened again`, () => {
    const state = { history: true, statistics: true, params: { openModal: modal } };
    const close = evaluate(closeHandler.getText(dashboard) + '\ncloseDashboardModal;', {
      user: starter,
      openModal: modal,
      isStarterShopkeeper: routing.isStarterShopkeeper,
      setShowHistoryModal: (value) => { state.history = value; },
      setShowStatsModal: (value) => { state.statistics = value; },
      router: { setParams: (params) => { Object.assign(state.params, params); } },
    });
    assert.equal(routing.getStarterNavigationRedirect(starter, 'index', modal), null);
    close(modal);
    assert.equal(state[modal], false);
    assert.equal(state.params.openModal, undefined);
    assert.equal(routing.getStarterNavigationRedirect(starter, 'index', state.params.openModal), '/(tabs)/products');
    assert.equal(routing.getStarterNavigationRedirect(starter, 'index', modal), null);
    assert.equal(routing.getStarterNavigationRedirect(starter, 'index', undefined, { modules: { stock_management: false } }), '/(tabs)/pos');
  });
}

test('Closing a Pro dashboard modal leaves the dashboard route unchanged', () => {
  let changedParams = false;
  const close = evaluate(closeHandler.getText(dashboard) + '\ncloseDashboardModal;', {
    user: { ...starter, subscription_plan: 'pro' },
    openModal: 'history',
    isStarterShopkeeper: routing.isStarterShopkeeper,
    setShowHistoryModal: () => {},
    setShowStatsModal: () => {},
    router: { setParams: () => { changedParams = true; } },
  });
  close('history');
  assert.equal(changedParams, false);
});

test('The Settings orders action works with an active or disabled public site', () => {
  const settings = readSource('app/(tabs)/settings.tsx');
  const link = findNode(settings, (node) => ts.isJsxElement(node) && node.openingElement.tagName.getText(settings) === 'TouchableOpacity' && node.getText(settings).includes('>Commandes en ligne</Text>'));
  let parent = link.parent;
  while (parent && !(ts.isJsxExpression(parent) && parent.expression && ts.isBinaryExpression(parent.expression) && parent.expression.left.getText(settings).includes('isOrgAdmin'))) parent = parent.parent;
  assert.ok(parent);
  for (const enabled of [true, false]) {
    assert.ok(evaluate('(' + parent.expression.left.getText(settings) + ')', { isOrgAdmin: true, isStarterSettings: true, currentStore: {}, ecommerceSite: { enabled } }));
    let destination;
    const element = evaluate('(' + link.getText(settings) + ')', {
      React, TouchableOpacity: 'button', Ionicons: 'icon', Text: 'span',
      styles: {}, Spacing: { md: 16, sm: 8 }, colors: {},
      router: { push: (route) => { destination = route; } },
    });
    element.props.onPress();
    assert.equal(destination.pathname, '/(tabs)/orders');
    assert.equal(destination.params.tab, 'web');
    assert.equal(destination.params.source, 'ecommerce');
    assert.equal(routing.getStarterNavigationRedirect(starter, 'orders', undefined), null);
  }
});

test('Android back uses the authorized initial tab without returning to hidden Home', async () => {
  const { TabRouter, TabActions, CommonActions } = await import('@react-navigation/routers');
  const layout = readSource('app/(tabs)/_layout.tsx');
  const tabs = findNode(layout, (node) => ts.isJsxOpeningElement(node) && node.tagName.getText(layout) === 'Tabs');
  function option(name, scope) {
    const attribute = tabs.attributes.properties.find((attribute) => attribute.name?.text === name);
    assert.ok(attribute);
    return evaluate('(' + attribute.initializer.expression.getText(layout) + ')', scope);
  }
  for (const modules of [{}, { stock_management: false }]) {
    const scope = { isStarterShopkeeper: true, user: starter, modules, isRestaurant: false, getStarterRoute: routing.getStarterRoute };
    const initialRouteName = option('initialRouteName', scope);
    const router = TabRouter({ initialRouteName, backBehavior: option('backBehavior', scope) });
    const config = { routeNames: ['index', 'products', 'pos', 'accounting', 'settings', 'orders'], routeParamList: {}, routeGetIdList: {} };
    let state = router.getInitialState(config);
    assert.equal(state.routes[state.index].name, initialRouteName);
    for (const name of ['index', 'orders']) {
      state = router.getStateForAction(state, TabActions.jumpTo(name, name === 'index' ? { openModal: 'history' } : { tab: 'web' }), config);
      state = router.getStateForAction(state, CommonActions.goBack(), config);
      assert.equal(state.routes[state.index].name, initialRouteName);
      assert.equal(router.getStateForAction(state, CommonActions.goBack(), config), null);
    }
  }
  assert.equal(option('initialRouteName', { isStarterShopkeeper: false }), undefined);
  assert.equal(option('backBehavior', { isStarterShopkeeper: false }), undefined);
});

test('Starter keeps four main tabs and Pro and Enterprise retain their existing tabs', () => {
  const layout = readSource('app/(tabs)/_layout.tsx');
  const screens = [];
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(layout) === 'Tabs.Screen') screens.push(node);
    ts.forEachChild(node, visit);
  }
  visit(layout);
  function visibleTabs(starterMode) {
    return screens.filter((screen) => {
      const options = screen.attributes.properties.find((attribute) => attribute.name?.text === 'options');
      const value = evaluate('(' + options.initializer.expression.getText(layout) + ')', {
        isStarterShopkeeper: starterMode, billingOnly: false, hideDashboard: false,
        hideStock: false, hidePos: false, hideAccounting: false, hideSuppliers: false,
        hideCrm: false, hideOrders: false, isRestaurant: false, hasOperationalAccess: true,
        isSuperAdmin: false, productsTabTitle: 'Produits', productsTabIcon: 'cube-outline',
        t: (key) => key, renderTabLabel: (label) => label,
      });
      return value.href !== null;
    }).map((screen) => screen.attributes.properties.find((attribute) => attribute.name?.text === 'name').initializer.text);
  }
  assert.deepEqual(visibleTabs(true), ['products', 'pos', 'accounting', 'settings']);
  assert.deepEqual(visibleTabs(false), ['index', 'products', 'pos', 'accounting', 'suppliers', 'crm', 'orders', 'settings']);
});

test('Late settings from a previous account and outdated loads cannot overwrite current preferences', async () => {
  const layout = readSource('app/(tabs)/_layout.tsx');
  const effect = findNode(layout, (node) => ts.isCallExpression(node) && node.expression.getText(layout) === 'useEffect' && node.arguments[0]?.getText(layout).includes('settings:navigation-changed'));
  const pending = [];
  const listeners = new Set();
  const state = {};
  function start(userId) {
    return evaluate('(' + effect.arguments[0].getText(layout) + ')', {
      user: { user_id: userId },
      setUserSettings: (settings) => { state.settings = settings; },
      setSettingsUserId: (id) => { state.userId = id; },
      settingsApi: { get: () => new Promise((resolve) => pending.push(resolve)) },
      DeviceEventEmitter: { addListener: (_name, callback) => {
        listeners.add(callback);
        return { remove: () => listeners.delete(callback) };
      } },
    })();
  }
  const stopPrevious = start('previous');
  stopPrevious();
  const stopCurrent = start('current');
  pending[0]({ user_id: 'previous', modules: { stock_management: false } });
  await Promise.resolve();
  assert.equal(state.userId, null);
  for (const listener of listeners) listener({ user_id: 'previous', modules: {} });
  assert.equal(state.userId, null);
  for (const listener of listeners) listener({ user_id: 'current', modules: { stock_management: false } });
  pending[1]({ user_id: 'current', modules: { stock_management: true } });
  await Promise.resolve();
  assert.equal(state.userId, 'current');
  assert.equal(state.settings.modules.stock_management, false);
  stopCurrent();
  assert.equal(listeners.size, 0);
});

test('Starter E-com loads its orders without depending on procurement permissions', async () => {
  const orders = readSource('app/(tabs)/orders.tsx');
  const focus = findNode(orders, (node) => ts.isCallExpression(node) && node.expression.getText(orders) === 'useFocusEffect' && node.arguments[0]?.getText(orders).includes('loadSuppliers();'));
  const callback = focus.arguments[0].arguments[0];
  for (const ecommerceOnly of [true, false]) {
    const calls = [];
    const run = evaluate('(' + callback.getText(orders) + ')', {
      ecommerceOnly, lastLoadedAtRef: { current: 0 }, FOCUS_TTL_MS: 60000,
      setAccessDenied: (value) => { assert.equal(value, false); },
      setLoading: () => {}, setRefreshing: () => {},
      loadWebOrders: async () => { calls.push('web'); },
      loadData: () => { calls.push('procurement'); },
      loadSuppliers: () => { calls.push('suppliers'); },
      loadReturns: () => { calls.push('returns'); },
    });
    run();
    await Promise.resolve();
    assert.deepEqual(calls, ecommerceOnly ? ['web'] : ['procurement', 'suppliers', 'returns', 'web']);
  }
});

test('E-com route parameters open the list or the notification order detail', () => {
  const orders = readSource('app/(tabs)/orders.tsx');
  const effect = findNode(orders, (node) => ts.isCallExpression(node) && node.expression.getText(orders) === 'useEffect' && node.arguments[0]?.getText(orders).includes('const reminderKey ='));
  for (const orderIdParam of [undefined, 'order-from-notification']) {
    const calls = [];
    const run = evaluate('(' + effect.arguments[0].getText(orders) + ')', {
      orderIdParam, tabParam: 'web', sourceParam: 'ecommerce', productIdParam: undefined,
      reminderTypeParam: undefined, handledReminderRef: { current: null },
      setActiveTab: (tab) => { calls.push(tab); },
      loadWebOrders: async () => { calls.push('list'); },
      openWebOrderDetail: (id) => { calls.push(id); },
      openDetailModal: () => { assert.fail('Procurement detail must not open'); },
    });
    run();
    assert.deepEqual(calls, orderIdParam ? [orderIdParam] : ['web', 'list']);
  }
});
