const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Mobile update prompt combines the store check with the version sent by the server', () => {
  const gate = read('frontend/components/AppVersionGate.tsx');
  const settings = read('backend/app_update_settings.py');

  assert.match(gate, /import\('expo-in-app-updates'\)/);
  assert.match(gate, /nativeUpdates\.checkForUpdate\(\)/);
  assert.match(gate, /storeUpdate\?\.updateAvailable === true/);
  assert.match(gate, /compareVersions\(installedVersion, announcedVersion\) < 0/);
  assert.match(gate, /if \(!announcedNewer && !storeNewer\)/);
  // Fenêtre transparente montée seulement quand elle est visible (sinon les touches peuvent rester bloquées sur iOS).
  assert.match(gate, /\{state\.suggested && \(/);
  assert.doesNotMatch(gate, /1\.0\.20|0\.0\.0/);
  assert.doesNotMatch(settings, /1\.0\.20/);
});

test('Latest version is detected automatically, with an admin announcement as a fallback', () => {
  const backend = read('backend/server.py');
  const panel = read('web-app/src/components/admin/AppUpdateNotificationsPanel.tsx');
  assert.match(backend, /APP_VERSION_MIN_DEVICES = 3/);
  assert.match(backend, /https:\/\/itunes\.apple\.com\/lookup/);
  assert.match(backend, /android_latest_version=_highest_app_version\(detected\["android"\]\["version"\], app_update\["android_latest_version"\]\)/);
  assert.match(backend, /@admin_router\.post\("\/app-updates\/announce"\)/);
  assert.match(backend, /f"app_update\.\{data\.platform\}_min_version": version if data\.required else ""/);
  assert.match(panel, /admin\.announceAppUpdate\(/);
  assert.match(panel, /required: announceRequired/);
  assert.match(panel, /async function handleSubmit/);
});
