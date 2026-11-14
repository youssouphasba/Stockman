const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'services/firebasePhoneAuth.ts'), 'utf8');
const moduleCode = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const phone = '+15550100123';

function loadVerification() {
  let now = 0;
  const native = {
    requests: [],
    confirms: [],
    signInWithPhoneNumber(number, resend) {
      return new Promise((resolve, reject) => native.requests.push({ number, resend, resolve, reject }));
    },
    signOut() { return Promise.resolve(); },
  };
  const confirmation = {
    async confirm(code) {
      native.confirms.push(code);
      return { user: { async getIdToken() { return 'test-proof'; } } };
    },
  };
  const service = vm.runInNewContext(moduleCode + '\nexports;', {
    exports: {},
    require: (id) => id === './i18n' ? { t: (key) => key } : () => native,
    Date: { now: () => now },
    setTimeout,
    clearTimeout,
  });
  return { service, native, confirmation, advance: (ms) => { now += ms; } };
}

test('Repeated automatic sends share one native request and reuse the code after a screen remount', async () => {
  const { service, native, confirmation } = loadVerification();
  const pending = service.sendPhoneVerification(phone, 'stockman');
  const reopened = service.sendPhoneVerification('00' + phone.slice(1), 'stockman');
  await Promise.resolve();
  assert.equal(native.requests.length, 1);
  native.requests[0].resolve(confirmation);
  assert.equal(await pending, await reopened);
  assert.equal(await service.sendPhoneVerification(phone, 'stockman'), 0);
  assert.equal(native.requests.length, 1);
  assert.equal(await service.confirmPhoneCode('123456', phone, 'stockman'), 'test-proof');
});

test('A resend respects the cooldown and forces a new native challenge once allowed', async () => {
  const { service, native, confirmation, advance } = loadVerification();
  const pending = service.sendPhoneVerification(phone, 'stockman');
  await Promise.resolve();
  native.requests[0].resolve(confirmation);
  await pending;
  await service.sendPhoneVerification(phone, 'stockman', true);
  assert.equal(native.requests.length, 1);
  advance(service.PHONE_RESEND_COOLDOWN_MS);
  const resend = service.sendPhoneVerification(phone, 'stockman', true);
  await Promise.resolve();
  assert.equal(native.requests[1].resend, true);
  native.requests[1].resolve(confirmation);
  assert.equal(await resend, service.PHONE_RESEND_COOLDOWN_MS);
});

test('A replaced account cannot recover or confirm a later Denkma challenge', async () => {
  const { service, native, confirmation } = loadVerification();
  const pending = service.sendPhoneVerification(phone, 'stockman');
  const invalidated = assert.rejects(pending, /sendError/);
  await Promise.resolve();
  service.clearPhoneVerificationState('stockman');
  const denkma = service.sendPhoneVerification(phone, 'denkma');
  assert.equal(native.requests.length, 1);
  native.requests[0].resolve(confirmation);
  await invalidated;
  assert.equal(native.requests.length, 2);
  native.requests[1].resolve(confirmation);
  await denkma;
  service.clearPhoneVerificationState('stockman');
  await assert.rejects(service.confirmPhoneCode('123456', phone, 'stockman'), /errorIncorrect/);
  assert.equal(native.confirms.length, 0);
  assert.equal(await service.confirmPhoneCode('123456', phone, 'denkma'), 'test-proof');
});

test('A genuine native send failure is shared and releases the request', async () => {
  const { service, native, confirmation } = loadVerification();
  const first = service.sendPhoneVerification(phone, 'stockman');
  const second = service.sendPhoneVerification(phone, 'stockman');
  const failure = new Error('auth/quota-exceeded');
  await Promise.resolve();
  native.requests[0].reject(failure);
  const results = await Promise.allSettled([first, second]);
  assert.ok(results.every((result) => result.status === 'rejected' && result.reason === failure));
  const newRequest = service.sendPhoneVerification(phone, 'stockman');
  await Promise.resolve();
  native.requests[1].resolve(confirmation);
  await newRequest;
  assert.equal(native.requests.length, 2);
});
