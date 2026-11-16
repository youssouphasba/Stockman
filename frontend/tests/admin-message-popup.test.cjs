const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('la fenêtre des messages admin repart de zéro à chaque changement de compte', () => {
  const layout = read('app/(tabs)/_layout.tsx');
  assert.match(layout, /<AdminMessagePopup key=\{user\?\.user_id \|\| 'signed-out'\}/);
  const popup = read('components/AdminMessagePopup.tsx');
  assert.match(popup, /if \(!enabled\) \{[\s\S]*?setQueue\(\[\]\);/);
});

test('la fenêtre des messages admin attend la fin des transitions et n’anime pas son voile', () => {
  const popup = read('components/AdminMessagePopup.tsx');
  assert.match(popup, /InteractionManager\.runAfterInteractions/);
  assert.match(popup, /AppState\.currentState === 'active'/);
  assert.doesNotMatch(popup, /Animated\./);
  assert.match(popup, /animationType="fade"/);
});
