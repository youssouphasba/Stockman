const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

const root = path.resolve(__dirname, '../..');
const filename = 'app/(tabs)/settings.tsx';
const source = fs.readFileSync(path.join(root, filename), 'utf8');
const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const stateNames = [];
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(ast) === 'useState') {
    stateNames.push(node.name.elements[0].getText(ast));
  }
  ts.forEachChild(node, visit);
}
visit(ast);

function createHarness(overrides = {}) {
  const effects = [];
  const focusEffects = [];
  const calls = [];
  const refs = [];
  let stateIndex = 0;
  const user = overrides.user || { user_id: 'owner', role: 'shopkeeper', subscription_plan: 'starter', active_store_id: 'store', subscription_status: 'active' };
  const store = { store_id: 'store', name: '', address: '' };
  const values = {
    loading: false, loadedSettingsContext: `${user.user_id}:${user.active_store_id || ''}`,
    settingsData: { modules: {}, push_notifications: true, tax_enabled: true, tax_rate: 18, tax_mode: 'ttc' },
    currentStore: store, storeList: [store],
    ...overrides.states,
  };
  const hooks = {
    ...React,
    useState: (initial) => {
      const name = stateNames[stateIndex++];
      if (!(name in values)) values[name] = typeof initial === 'function' ? initial() : initial;
      return [values[name], (next) => { values[name] = typeof next === 'function' ? next(values[name]) : next; }];
    },
    useEffect: (callback) => { effects.push(callback); },
    useCallback: (callback) => callback,
    useMemo: (factory) => factory(),
    useRef: (initial) => { const ref = { current: initial }; refs.push(ref); return ref; },
  };
  const events = new Map();
  const router = { push: (route) => calls.push(['navigate', route]), replace: (route) => calls.push(['replace', route]) };
  const record = (name, response) => {
    const handler = async (...args) => { calls.push([name, ...args]); return response; };
    Object.defineProperty(handler, 'name', { value: name });
    return handler;
  };
  const services = {
    settings: { get: record('settings.get', values.settingsData), update: record('settings.update', values.settingsData) },
    stores: { list: record('stores.list', values.storeList), update: record('stores.update', store) },
    ecommerce: { getSite: record('ecommerce.getSite', values.ecommerceSite || null), updateSite: record('ecommerce.updateSite', values.ecommerceSite), verifyDomain: record('ecommerce.verifyDomain', values.ecommerceSite) },
    subscription: { getDetails: record('subscription.getDetails', null) },
    userFeatures: { get: record('features.get', {}) },
    notifications: { sendTestPush: record('testPush', {}) },
    profile: { exportData: record('exportData', {}) }, disputes: { create: record('dispute', {}) },
    ...overrides.services,
  };
  const colors = new Proxy({}, { get: (_object, key) => key === 'text' ? '#111827' : '#047857' });
  const theme = { colors, glassStyle: {}, isDark: false, setTheme: (mode) => calls.push(['theme', mode]) };
  const natives = new Proxy({
    Platform: { OS: overrides.platform || 'android' },
    StyleSheet: { create: (styles) => styles },
    Alert: { alert: (...args) => calls.push(['alert', ...args]) },
    DeviceEventEmitter: {
      addListener: (event, callback) => { events.set(event, callback); return { remove: () => events.delete(event) }; },
      emit: (...args) => calls.push(['emit', ...args]),
    },
    BackHandler: { addEventListener: (_name, callback) => { events.set('back', callback); return { remove: () => events.delete('back') }; } },
    Linking: { openURL: record('openURL') },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  }, { get: (object, key) => key in object ? object[key] : String(key) });
  const cache = new Map();
  function load(relativePath) {
    if (cache.has(relativePath)) return cache.get(relativePath);
    const compiled = ts.transpileModule(fs.readFileSync(path.join(root, relativePath), 'utf8'), {
      fileName: relativePath, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
    }).outputText;
    const module = { exports: {} };
    function requireModule(specifier) {
      if (specifier === 'react') return hooks;
      if (specifier === 'react-native') return natives;
      if (specifier === 'expo-router') return { Link: 'Link', useRouter: () => router, useLocalSearchParams: () => overrides.params || {}, useFocusEffect: (callback) => focusEffects.push(callback) };
      if (specifier === 'react-i18next') return { useTranslation: () => ({ t: (key, fallback) => typeof fallback === 'string' ? fallback : key, i18n: { language: 'fr' } }) };
      if (specifier === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) };
      if (specifier === '@expo/vector-icons') return { Ionicons: 'Icon' };
      if (specifier === 'expo-linear-gradient') return { LinearGradient: 'Gradient' };
      if (specifier.endsWith('/contexts/AuthContext')) return { useAuth: () => ({ user, isOrgAdmin: true, isBillingAdmin: true, hasPermission: () => true, logout: record('logout'), togglePin: record('pin'), toggleBiometrics: record('biometrics'), ...overrides.auth }) };
      if (specifier.endsWith('/contexts/ThemeContext')) return { useTheme: () => theme };
      if (specifier.endsWith('/contexts/SyncContext')) return { useSync: () => ({ isOnline: true, pendingCount: 0, lastSyncLabel: '', processQueue: record('processQueue'), prefetchData: record('prefetchData'), ...overrides.sync }) };
      if (specifier.endsWith('/services/api')) return services;
      if (specifier.endsWith('/constants/theme')) return { Spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40 }, BorderRadius: { md: 8 }, FontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22 } };
      if (specifier.endsWith('/constants/guides')) return { GUIDES: {} };
      if (specifier.endsWith('/utils/starterSettings') || specifier.endsWith('/utils/accountRouting') || specifier.endsWith('/utils/access') || specifier === './access') {
        return load(path.relative(root, path.resolve(root, path.dirname(relativePath), `${specifier}.ts`)));
      }
      if (specifier.endsWith('/components/StarterSettingsLayout')) return load('components/StarterSettingsLayout.tsx');
      return { __esModule: true, default: path.basename(specifier), documentDirectory: 'test:', writeAsStringAsync: record('writeFile'), isAvailableAsync: async () => true, shareAsync: record('share') };
    }
    vm.runInNewContext('(function(require, module, exports) {' + compiled + '\n})', { setTimeout, clearTimeout, console })(requireModule, module, module.exports);
    cache.set(relativePath, module.exports);
    return module.exports;
  }
  const Screen = load(filename).default;
  const layout = load('components/StarterSettingsLayout.tsx');
  const tree = Screen();
  function nodes(node = tree, list = []) {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) return;
      list.push(child);
      if (child.props.children !== undefined) nodes(child.props.children, list);
    });
    return list;
  }
  function renderedNodes(node = tree, list = []) {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) return;
      if (typeof child.type === 'function') renderedNodes(child.type(child.props), list);
      else {
        list.push(child);
        if (child.props.children !== undefined) renderedNodes(child.props.children, list);
      }
    });
    return list;
  }
  return { tree, values, effects, focusEffects, calls, events, refs, layout, nodes, renderedNodes, user, services, load };
}

module.exports = { createHarness, ast };
