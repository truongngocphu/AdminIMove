import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const dash = fs.readFileSync(new URL('../src/DashboardPage.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const gateway = fs.readFileSync(new URL('../server/server.js', import.meta.url), 'utf8');
const settings = fs.readFileSync(new URL('../src/SettingsPage.jsx', import.meta.url), 'utf8');

test('1.5.1 admin release identifies UI fix version', () => {
  assert.equal(pkg.version, '1.5.1');
  assert.match(gateway, /1\.5\.1/);
});

test('login is compact enterprise split layout without decorative preview blocks', () => {
  assert.match(app, /login-layout login-v151/);
  assert.doesNotMatch(app, /className="login-preview"/);
  assert.match(css, /\.login-v151\s*\.login-showcase/);
  assert.match(css, /grid-template-columns:minmax\(0,1\.12fr\) minmax\(420px,\.88fr\)/);
  assert.match(css, /\.login-v151\s*\.login-card\{[^}]*max-width:440px/s);
});

test('dashboard has compact control-center header and five-column KPI grid on desktop', () => {
  assert.match(dash, /dashboard-control-header/);
  assert.match(dash, /dashboard-kpi-strip/);
  assert.match(css, /\.dashboard-kpi-strip\{[^}]*grid-template-columns:repeat\(5,minmax\(150px,1fr\)\)/s);
});

test('settings page displays current Admin 1.5.1 runtime label', () => {
  assert.match(settings, /Admin 1\.5\.1/);
});
