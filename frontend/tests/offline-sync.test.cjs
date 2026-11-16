const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// Le service est exécuté avec un cache en mémoire : seule la logique d'envoi de la file est testée.
function loadSyncService(processAction) {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'services', 'sync.ts'), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const store = new Map();
  const cache = {
    get: async (key) => store.get(key) ?? null,
    set: async (key, value) => { store.set(key, value); },
    setLastSyncTime: async () => {},
  };
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module, exports: module.exports, console,
    require: (name) => (name === './cache' ? { cache, KEYS: { SYNC_QUEUE: 'queue' } } : {}),
  });
  const { syncService, isTransientSyncError } = module.exports;
  syncService.processAction = processAction;
  return { syncService, isTransientSyncError, store };
}

test('Network and server errors keep queued actions without spending retries', async () => {
  const sent = [];
  const { syncService, store } = loadSyncService(async (action) => {
    if (action.id === 'b') throw Object.assign(new Error('Serveur indisponible'), { status: 503 });
    sent.push(action.id);
  });
  store.set('queue', [{ id: 'a', retries: 0 }, { id: 'b', retries: 1 }, { id: 'c', retries: 0 }]);
  const result = await syncService.processQueueInternal();
  assert.deepEqual(sent, ['a']);
  assert.equal(result.processed, 1);
  // L'ordre est conservé et aucun essai n'est consommé : « c » attend derrière « b ».
  assert.deepEqual(JSON.parse(JSON.stringify(store.get('queue'))), [{ id: 'b', retries: 1 }, { id: 'c', retries: 0 }]);
});

test('Rejected data still spends a retry', async () => {
  const { syncService, store, isTransientSyncError } = loadSyncService(async () => {
    throw Object.assign(new Error('Données invalides'), { status: 422 });
  });
  store.set('queue', [{ id: 'a', retries: 0 }]);
  await syncService.processQueueInternal();
  assert.equal(store.get('queue')[0].retries, 1);
  assert.equal(isTransientSyncError(new TypeError('Network request failed')), true);
  assert.equal(isTransientSyncError({ status: 429 }), true);
  assert.equal(isTransientSyncError({ status: 404 }), false);
});
