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
  assert.doesNotMatch(env, /^PORT=/m);
});

test('Vite proxy target comes from VITE_ADMIN_API_URL', () => {
  const vite = read('vite.config.js');
  const env = read('.env.example');
  assert.match(vite, /VITE_ADMIN_API_URL/);
  assert.match(env, /^VITE_ADMIN_API_URL=http:\/\/127\.0\.0\.1:5060$/m);
});
