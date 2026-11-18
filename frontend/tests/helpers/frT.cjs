const fs = require('node:fs');
const path = require('node:path');

// Resolves translation keys with the French locale, the source language of the app.
const fr = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../locales/fr.json'), 'utf8').replace(/^\uFEFF/, ''));

function lookup(key) {
  return key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), fr);
}

function frT(key, fallback, vars) {
  const options = fallback && typeof fallback === 'object' ? fallback : vars || {};
  let value;
  if (typeof options.count === 'number') value = lookup(`${key}_${options.count === 1 ? 'one' : 'other'}`);
  if (typeof value !== 'string') value = lookup(key);
  if (typeof value !== 'string') value = typeof fallback === 'string' ? fallback : options.defaultValue ?? key;
  return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name) => (options[name] ?? ''));
}

module.exports = { frT, frText: lookup };
