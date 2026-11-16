const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadHook({ focused = true } = {}) {
  const listeners = new Map();
  const effects = [];
  const navigation = {
    addListener: (event, callback) => { listeners.set(event, callback); return () => listeners.delete(event); },
    isFocused: () => focused,
  };
  const react = {
    useRef: (value) => ({ current: value }),
    useCallback: (callback) => callback,
    useEffect: (callback) => effects.push(callback),
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'hooks', 'useTabReselect.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((name) => {
    if (name === 'react') return react;
    if (name === 'expo-router') return { useNavigation: () => navigation };
    return {};
  }, module, module.exports);
  return { useTabReselect: module.exports.useTabReselect, listeners, effects };
}

test('Pressing the active tab at the top reloads the screen', () => {
  const { useTabReselect, listeners, effects } = loadHook();
  let refreshed = 0;
  const calls = [];
  useTabReselect({ current: { scrollTo: (options) => calls.push(options) } }, () => { refreshed += 1; });
  effects.forEach((effect) => effect());
  listeners.get('tabPress')();
  assert.equal(refreshed, 1);
  assert.equal(calls.length, 0);
});

test('Pressing the active tab lower in the screen scrolls to the top without reloading', () => {
  const { useTabReselect, listeners, effects } = loadHook();
  let refreshed = 0;
  const calls = [];
  const trackScroll = useTabReselect({ current: { scrollToOffset: (options) => calls.push(options) } }, () => { refreshed += 1; });
  effects.forEach((effect) => effect());
  trackScroll({ nativeEvent: { contentOffset: { y: 420 } } });
  listeners.get('tabPress')();
  assert.deepEqual(calls, [{ offset: 0, animated: true }]);
  assert.equal(refreshed, 0);
  listeners.get('tabPress')();
  assert.equal(refreshed, 1);
});

test('Pressing another tab does nothing on the current screen', () => {
  const { useTabReselect, listeners, effects } = loadHook({ focused: false });
  let refreshed = 0;
  useTabReselect({ current: {} }, () => { refreshed += 1; });
  effects.forEach((effect) => effect());
  listeners.get('tabPress')();
  assert.equal(refreshed, 0);
});
