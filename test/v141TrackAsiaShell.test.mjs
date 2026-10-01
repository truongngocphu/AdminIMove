import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('1.4.1 uses TrackAsia enterprise sidebar shell and grouped navigation', () => {
  const app = read('src/App.jsx');
  assert.match(app, /sidebar-shell/);
  assert.match(app, /imove_sidebar_collapsed/);
  assert.match(app, /const navGroups\s*=/);
  assert.match(app, /TỔNG QUAN/);
  assert.match(app, /VẬN HÀNH/);
  assert.match(app, /KINH DOANH/);
  assert.match(app, /TRUYỀN THÔNG/);
  assert.match(app, /AN TOÀN & HỆ THỐNG/);
});

test('1.4.1 preserves dedicated 1.4.0 business pages', () => {
  const app = read('src/App.jsx');
  assert.match(app, /ServicePricingPage/);
  assert.match(app, /PromotionsAdminPage/);
  assert.match(app, /PaymentsV14Page/);
  assert.match(app, /AnalyticsReportsPage/);
  assert.match(app, /page==='promotions'/);
});

test('1.4.1 loads TrackAsia GL and environment-based map config', () => {
  const html = read('index.html');
  const map = read('src/OperationsMap.jsx');
  assert.match(html, /trackasia-gl@2\.0\.1/);
  assert.match(map, /getTrackAsiaGL/);
  assert.match(map, /getTrackAsiaStyleUrl/);
  assert.ok(fs.existsSync(path.join(root, 'src/trackAsiaConfig.js')));
});

test('TrackAsia shell is carried forward into package 1.5.1', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.version, '1.5.1');
});
