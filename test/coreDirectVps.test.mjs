import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('../src/apiRuntime.js', import.meta.url), 'utf8');
const adminApi = fs.readFileSync(new URL('../src/adminApi.js', import.meta.url), 'utf8');
const env = fs.readFileSync(new URL('../.env.production.example', import.meta.url), 'utf8');
const vercel = fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');

test('Admin Core Direct uses one VPS API origin', () => {
  assert.match(runtime, /backendimove\.daututh79\.com/);
  assert.match(runtime, /ADMIN_API_URL = CORE_BACKEND_URL/);
  assert.doesNotMatch(runtime, /\/admin-gateway/);
  assert.match(adminApi, /gatewayUrl\(`\/api\$\{path\}`\)/);
  assert.match(env, /^VITE_API_URL=https:\/\/backendimove\.daututh79\.com$/m);
  assert.doesNotMatch(env, /VITE_ADMIN_GATEWAY_URL/);
});

test('Vercel config is SPA-only and does not proxy API', () => {
  assert.doesNotMatch(vercel, /admin-gateway/);
  assert.doesNotMatch(vercel, /backendimove\.daututh79\.com/);
});
