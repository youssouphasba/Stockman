const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Authenticated mobile sessions report the installed version by platform', () => {
  const layout = read('frontend/app/_layout.tsx');
  const api = read('frontend/services/api.ts');
  const backend = read('backend/server.py');

  assert.match(layout, /isAuthenticated\s*\|\|\s*!user\?\.user_id/);
  assert.match(layout, /Constants\s+as\s+any\)\.nativeAppVersion\s*\|\|\s*Constants\.expoConfig\?\.version/);
  assert.match(layout, /appVersionApi\.reportInstalled\(\{\s*platform:\s*Platform\.OS,\s*version:/);
  assert.match(api, /request<\{ message: string; reported_at: string \}>\('\/app-version\/report'/);
  assert.match(backend, /@api_router\.post\("\/app-version\/report"\)/);
  assert.match(backend, /f"app_versions\.{data\.platform}\.version"/);
});

test('Admin user data exposes platform versions and legacy push installation reports', () => {
  const backend = read('backend/server.py');
  const admin = read('web-app/src/components/AdminDashboard.tsx');

  assert.match(backend, /async def attach_admin_app_versions\(user_docs: List\[dict\]\)/);
  assert.match(backend, /"last_user_id": \{"\$in": list\(users_by_id\)\}/);
  assert.match(backend, /user_doc\["app_versions"\]\[platform\] = \{/);
  assert.match(backend, /len\(linked_user_ids\) > 1/);
  assert.match(admin, /<th className="px-6 py-4">Version mobile<\/th>/);
  assert.match(admin, /android_app_version_reported_at/);
  assert.match(admin, /Versions de l’application mobile/);
});
