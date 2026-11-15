const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const React = require('react');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const compile = (file) => ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const { ecommerce, settings } = vm.runInNewContext(compile('constants/guides.ts') + '\nexports.GUIDES;', { exports: {} });
const { HELP_MODULES } = vm.runInNewContext(compile('constants/helpContent.ts') + '\nexports;', { exports: {} });
const guideFeatures = vm.runInNewContext(compile('utils/ecommerceGuideFeatures.ts') + '\nexports;', { exports: {} });

function renderGuide(user) {
  let step = 0;
  let page = { width: 0, height: 0 };
  let activeState = 0;
  let activeRef = 0;
  let closed = 0;
  const scrolls = [];
  const refs = [{ current: { scrollToIndex: (options) => scrolls.push(options.index) } }, { current: null }];
  const components = Object.fromEntries(['FlatList', 'Modal', 'ScrollView', 'Text', 'TouchableOpacity', 'View'].map((key) => [key, key]));
  const deps = {
    react: {
      ...React,
      useState: () => activeState++ === 0 ? [step, (next) => { step = next; }] : [page, (next) => { page = next(page); }],
      useRef: (initial) => { const ref = refs[activeRef++]; ref.current ??= initial; return ref; },
      useCallback: (fn) => fn,
    },
    'react-native': { ...components, StyleSheet: { create: (styles) => styles, hairlineWidth: 1 } },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    'react-i18next': { useTranslation: () => ({ t: (key) => key }) },
    '../contexts/AuthContext': { useAuth: () => ({ user }) },
    '../contexts/ThemeContext': { useTheme: () => ({ colors: {} }) },
    '../utils/ecommerceGuideFeatures': guideFeatures,
    '../constants/theme': {
      Spacing: { sm: 8, md: 16 }, BorderRadius: { sm: 8, xl: 24 }, FontSize: { xs: 12, sm: 14, md: 16, lg: 18 },
    },
  };
  const ScreenGuide = vm.runInNewContext(compile('components/ScreenGuide.tsx') + '\nexports.default;', {
    exports: {}, require: (name) => deps[name],
  });
  const modal = ScreenGuide({ ...ecommerce, visible: true, onClose: () => { closed++; } });
  const safeArea = modal.props.children.props.children;
  const card = safeArea.props.children.props.children;
  function render() {
    activeState = 0;
    activeRef = 0;
    const { props: { children: [header, , pager, footer] } } = card.type(card.props);
    return { header, pager, footer, buttons: footer.props.children, list: pager.props.children };
  }
  const measure = (width, height) => render().pager.props.onLayout({ nativeEvent: { layout: { width, height } } });
  return { modal, safeArea, render, measure, scrolls, get closed() { return closed; } };
}

test('On a short viewport, the guide measures only the area between the header and footer', () => {
  const guide = renderGuide();
  assert.equal(guide.safeArea.type, 'SafeAreaView');
  assert.equal(guide.render().footer.props.style[0].flexShrink, 0);
  assert.equal(guide.render().pager.props.style.minHeight, 0);
  guide.measure(304, 120);
  const { list, buttons } = guide.render();
  assert.equal(list.props.horizontal && list.props.pagingEnabled, true);
  const slide = list.props.renderItem({ item: ecommerce.steps[0] });
  assert.equal(slide.type, 'ScrollView');
  assert.equal(slide.props.style.height, 120);
  assert.equal(slide.props.style.width, 304);
  assert.equal(buttons[1].props.disabled, false);
});

test('Navigation follows buttons and horizontal paging and closes on the final step', () => {
  const guide = renderGuide();
  guide.measure(304, 120);
  const { buttons, list } = guide.render();
  assert.equal(buttons[0].props.disabled, true);
  assert.equal(buttons[1].props.children[0].props.children, 'screen_guide.next');
  buttons[1].props.onPress();
  guide.render().buttons[0].props.onPress();
  assert.deepEqual(guide.scrolls, [1, 0]);
  list.props.onViewableItemsChanged({ viewableItems: [{ index: list.props.data.length - 1 }] });
  guide.measure(416, 84);
  assert.equal(guide.render().list.props.initialScrollIndex, list.props.data.length - 1);
  assert.equal(guide.render().buttons[1].props.children[0].props.children, 'screen_guide.finish');
  guide.render().buttons[1].props.onPress();
  assert.equal(guide.closed, 1);
  guide.modal.props.onRequestClose();
  assert.equal(guide.closed, 2);
});

test('Guide actions do not fall back to translation keys', () => {
  for (const locale of ['fr', 'en']) {
    const { screen_guide: labels } = require('../locales/' + locale + '.json');
    for (const action of ['close', 'previous', 'next', 'finish']) {
      assert.ok(labels[action]?.trim(), locale + ': ' + action);
    }
  }
});

test('Settings guide puts Enterprise mobile modules in My account, not a separate organization step', () => {
  assert.ok(settings.steps.some((step) => step.description.includes('modules dans Mon compte')));
  assert.ok(!settings.steps.some((step) => step.title === 'Organisation et pilotage'));
});

test('E-com keeps general steps and only shows eligible services in the guide and help', () => {
  const cases = [
    [undefined, false, false],
    [{ country_code: 'FR', currency: 'EUR', ecommerce_mobile_money_available: false, ecommerce_denkma_available: false }, false, false],
    [{ country_code: 'SN', currency: 'XOF', ecommerce_mobile_money_available: true, ecommerce_denkma_available: true }, true, true],
    [{ country_code: 'SN', currency: 'XOF', ecommerce_mobile_money_available: true, ecommerce_denkma_available: false }, true, false],
  ];
  for (const [user, money, denkma] of cases) {
    const guide = renderGuide(user);
    guide.measure(304, 120);
    const steps = guide.render().list.props.data;
    const help = guideFeatures.filterGuideContent(HELP_MODULES.flatMap((module) => module.features), user);
    for (const entries of [steps, help]) {
      assert.equal(entries.some((entry) => entry.title.endsWith('.mobile_money_title')), money);
      assert.equal(entries.some((entry) => entry.title.endsWith('.denkma_title')), denkma);
    }
    assert.ok(steps.some((entry) => entry.title.endsWith('.payment_title')));
    assert.ok(steps.some((entry) => entry.title.endsWith('.delivery_title')));
  }
});

test('Each E-com guide step resolves to French and English copy', () => {
  for (const locale of ['fr', 'en']) {
    const messages = require('../locales/' + locale + '.json');
    for (const step of ecommerce.steps) {
      for (const key of [step.title, step.description]) {
        assert.ok(key.split('.').reduce((value, part) => value?.[part], messages)?.trim(), locale + ': ' + key);
      }
    }
  }
});
