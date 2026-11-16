const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('un renouvellement de session refusé prévient l’application', () => {
  const api = read('services/api.ts');
  assert.match(api, /export const SESSION_EXPIRED_EVENT = 'auth:session-expired';/);
  assert.match(api, /await removeToken\(\);\s*DeviceEventEmitter\.emit\(SESSION_EXPIRED_EVENT\);\s*throw new AuthError/);
});

test('l’application se déconnecte sur session refusée, sauf pendant une restauration ou un changement de compte', () => {
  const auth = read('contexts/AuthContext.tsx');
  assert.match(auth, /DeviceEventEmitter\.addListener\(SESSION_EXPIRED_EVENT/);
  assert.match(auth, /if \(authTransitionRef\.current > 0 \|\| sessionExpiredHandlingRef\.current \|\| !user\) return;/);
  assert.match(auth, /cache\.clear\(\{ preserveSyncQueue: true, preserveLastSync: true \}\)/);
  assert.match(auth, /removeStoredAccountSession\(expiredUserId\)/);
  assert.match(auth, /return await restoreSessionInner\(/);
  assert.match(auth, /return await switchAccountInner\(userId\)/);
});
