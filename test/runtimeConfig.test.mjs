import test from 'node:test';
import assert from 'node:assert/strict';
import { localCoreCandidate, resolveAdminPort, resolveAdminProxyTarget, resolveRuntimeConfig } from '../server/runtime_config.js';

test('Admin defaults to 5060 and Core public VPS URL', () => {
  const config = resolveRuntimeConfig({});
  assert.equal(config.adminPort, 5060);
  assert.equal(config.corePort, 5050);
  assert.equal(config.coreBackendUrl, 'https://backendimove.daututh79.com');
});

test('Admin rejects a port that collides with Core', () => {
  assert.throws(() => resolveAdminPort({ adminPort: '5050', corePort: '5050' }), /phải dùng hai cổng khác nhau/);
});

test('generic PORT is ignored by runtime config', () => {
  const config = resolveRuntimeConfig({ PORT: '5050', CORE_HTTP_PORT: '5050' });
  assert.equal(config.adminPort, 5060);
});

test('legacy local candidate remains available only for explicit dev tooling', () => {
  assert.equal(localCoreCandidate(5050), 'http://127.0.0.1:5050');
});

test('legacy Vite proxy helper remains backward compatible', () => {
  assert.equal(resolveAdminProxyTarget({ explicitUrl: '' }), 'http://127.0.0.1:5060');
});
