const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Switching account checks the target session before leaving the current account', () => {
  const auth = read('contexts/AuthContext.tsx');
  const start = auth.indexOf('async function switchAccountInner');
  const body = auth.slice(start, auth.indexOf('async function removeStoredAccount', start));
  const checkAt = body.indexOf('checkAccountSession(targetSession.access_token, targetSession.refresh_token)');
  const setTokenAt = body.indexOf('await setToken(nextAccess)');
  assert.ok(checkAt > 0 && setTokenAt > checkAt, 'session checked before switching tokens');
  assert.match(body, /check\.status === 'expired'[\s\S]*removeStoredAccountSession\(userId\)[\s\S]*throw new Error/);
  assert.match(body, /updateStoredAccountTokens\(user\.user_id, currentAccess/);
});

test('Logging out stops notifications for that account and forgets it on the device', () => {
  const auth = read('contexts/AuthContext.tsx');
  const start = auth.indexOf('async function logout()');
  const body = auth.slice(start, auth.indexOf('async function switchAccount', start));
  assert.ok(body.indexOf('unregisterDeviceForAccount') < body.indexOf('authApi.logout()'));
  assert.match(body, /removeStoredAccountSession\(loggedOutUserId\)/);
});

test('A request sent with another account session never closes the active session', () => {
  const api = read('services/api.ts');
  assert.match(api, /if \(currentToken && currentToken !== token\) \{\s*throw new AuthError/);
  assert.match(api, /if \(\(await getRefreshToken\(\)\) === storedRefresh\) await removeToken\(\);/);
  assert.match(api, /updateStoredAccountTokens\(activeAccountId, newToken/);
});

test('Tapping a notification of another remembered account switches to it first', () => {
  const hook = read('hooks/useNotifications.ts');
  assert.match(hook, /targetUserId !== userIdRef\.current[\s\S]*switchRef\.current\(targetUserId\)/);
});
