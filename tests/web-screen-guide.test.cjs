const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');

const webRoot = path.resolve(__dirname, '../web-app');
const webRequire = createRequire(path.join(webRoot, 'package.json'));

test('The web guide uses a transparent overlay that is not overridden in light mode', () => {
  const guide = fs.readFileSync(path.join(webRoot, 'src/components/ScreenGuide.tsx'), 'utf8');
  const style = fs.readFileSync(path.join(webRoot, 'src/app/globals.css'), 'utf8');
  const postcss = webRequire('postcss');
  const backdropClasses = guide.match(/aria-hidden="true"\s+className="([^"]+)"/)?.[1].split(' ');
  assert.ok(backdropClasses?.includes('bg-[var(--overlay)]'));
  assert.ok(!backdropClasses.some((name) => name.startsWith('backdrop-blur')));

  const modes = new Map();
  postcss.parse(style).walkRules((rule) => {
    if (rule.selector !== ':root' && rule.selector !== '[data-theme="light"]') return;
    rule.walkDecls('--overlay', (declaration) => modes.set(rule.selector, declaration.value));
  });
  for (const selector of [':root', '[data-theme="light"]']) {
    const match = modes.get(selector)?.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/);
    assert.ok(match && Number(match[1]) > 0 && Number(match[1]) < 1, selector);
  }
});
