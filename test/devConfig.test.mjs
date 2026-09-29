import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('Admin Gateway uses ADMIN_PORT only', () => {
  const runtime = read('server/runtime_config.js');
  const env = read('server/.env.example');
  assert.match(runtime, /env\.ADMIN_PORT/);
  assert.doesNotMatch(runtime, /env\.PORT/);
  assert.match(env, /^ADMIN_PORT=5060$/m);
});

test('Vercel frontend uses explicit VPS endpoints', () => {
  const env = read('.env.production.example');
  const runtime = read('src/apiRuntime.js');
  assert.match(env, /^VITE_CORE_BACKEND_URL=https:\/\/backendimove\.daututh79\.com$/m);
  assert.match(env, /^VITE_ADMIN_GATEWAY_URL=https:\/\/backendimove\.daututh79\.com\/admin-gateway$/m);
  assert.match(runtime, /backendimove\.daututh79\.com/);
});
