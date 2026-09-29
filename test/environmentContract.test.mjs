import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(adminRoot, '..');

function read(rel) {
  return fs.readFileSync(path.join(projectRoot, rel), 'utf8');
}

const hasFullWorkspace = ['imove_backend/.env.example','imove_customer/.env.example','imove_driver/.env.example'].every(rel => fs.existsSync(path.join(projectRoot, rel)));

test('development port contract is explicit and non-overlapping', { skip: !hasFullWorkspace }, () => {
  const backendEnv = read('imove_backend/.env.example');
  const adminServerEnv = read('imove_admin/server/.env.example');
  const adminWebEnv = read('imove_admin/.env.example');

  assert.match(backendEnv, /^PORT=5050$/m);
  assert.match(adminServerEnv, /^ADMIN_PORT=5060$/m);
  assert.doesNotMatch(adminServerEnv, /^PORT=/m);
  assert.match(adminServerEnv, /^CORE_HTTP_PORT=5050$/m);
  assert.match(adminServerEnv, /^CORE_BACKEND_URL=http:\/\/127\.0\.0\.1:5050$/m);
  assert.match(adminWebEnv, /^VITE_ADMIN_API_URL=http:\/\/127\.0\.0\.1:5060$/m);
});

test('mobile apps ship env files for dart-define-from-file', { skip: !hasFullWorkspace }, () => {
  for (const app of ['imove_customer', 'imove_driver']) {
    const env = read(`${app}/.env.example`);
    assert.match(env, /^IMOVE_ENV=development$/m);
    assert.match(env, /^IMOVE_API_URL_WEB=http:\/\/127\.0\.0\.1:5050$/m);
    assert.match(env, /^IMOVE_API_URL_ANDROID=http:\/\/10\.0\.2\.2:5050$/m);
    assert.match(env, /^TRACKASIA_API_KEY=$/m);
    assert.match(env, /^TRACKASIA_STYLE_URL=$/m);
    assert.match(env, /^TRACKASIA_API_BASE_URL=https:\/\/maps\.track-asia\.com$/m);
    assert.match(env, /^TRACKASIA_DETAIL_LEVEL=enhanced$/m);
    assert.doesNotMatch(env, /^OSM_TILE_URL=/m);
  }
});

test('mobile ApiConfig supports platform-specific URLs', { skip: !hasFullWorkspace }, () => {
  for (const app of ['imove_customer', 'imove_driver']) {
    const source = read(`${app}/lib/config/api_config.dart`);
    assert.match(source, /IMOVE_API_URL_WEB/);
    assert.match(source, /IMOVE_API_URL_ANDROID/);
    assert.match(source, /IMOVE_API_URL_DESKTOP/);
  }
});

test('core connection status endpoint is observational and does not return 5xx when disconnected', () => {
  const server = fs.readFileSync(path.join(adminRoot, 'server/server.js'), 'utf8');
  const start = server.indexOf("app.get('/api/core-connection'");
  const end = server.indexOf("app.use('/core-api'", start);
  assert.ok(start >= 0 && end > start);
  const route = server.slice(start, end);
  assert.doesNotMatch(route, /res\.status\((?:500|502|503)\)/);
});

test('admin runtime uses ADMIN_PORT and does not consume generic PORT', () => {
  const runtime = fs.readFileSync(path.join(adminRoot, 'server/runtime_config.js'), 'utf8');
  assert.match(runtime, /env\.ADMIN_PORT/);
  assert.doesNotMatch(runtime, /env\.PORT/);
});
