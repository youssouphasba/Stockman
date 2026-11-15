const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Mobile update prompt is driven by the installed platform store', () => {
  const gate = read('frontend/components/AppVersionGate.tsx');
  const settings = read('backend/app_update_settings.py');

  assert.match(gate, /import\('expo-in-app-updates'\)/);
  assert.match(gate, /nativeUpdates\.checkForUpdate\(\)/);
  assert.match(gate, /storeUpdate\.updateAvailable === true/);
  assert.doesNotMatch(gate, /android_latest_version|ios_latest_version|1\.0\.20|0\.0\.0/);
  assert.doesNotMatch(settings, /android_latest_version|ios_latest_version|LATEST_VERSION/);
});

test('Update help copy is translated in French and English', () => {
  for (const language of ['fr', 'en']) {
    const locale = JSON.parse(read(`frontend/locales/${language}.json`));
    assert.ok(locale.help.modules.settings.f10.t);
    assert.ok(locale.help.modules.settings.f10.d);
  }
});
