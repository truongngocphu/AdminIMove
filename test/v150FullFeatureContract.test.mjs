import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const pricingModel = fs.readFileSync(new URL('../src/servicePricingModel.js', import.meta.url), 'utf8');
const driverAdmin = fs.readFileSync(new URL('../src/DriverManagement.jsx', import.meta.url), 'utf8');
const gateway = fs.readFileSync(new URL('../server/server.js', import.meta.url), 'utf8');
const productionPages = [
  '../src/DashboardPage.jsx',
  '../src/TripsPage.jsx',
  '../src/CustomersPage.jsx',
  '../src/ServicePricingPage.jsx',
  '../src/PromotionsAdminPage.jsx',
  '../src/BroadcastCenterPage.jsx',
  '../src/PaymentsPage.jsx',
  '../src/SettlementPage.jsx',
  '../src/ReportsPage.jsx',
  '../src/TrustSafetyPage.jsx',
].map((p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8')).join('\n');

const requiredLabels = [
  'Dashboard','Bản đồ vận hành','Chuyến xe','Live Dispatch','Matching & Phát đơn','Driver Experience',
  'Khách hàng','Tài xế','Hồ sơ / KYC tài xế','Dịch vụ & Giá cước','Khuyến mãi','Thanh toán',
  'Settlement / Đối soát','Báo cáo','Thông báo hệ thống','Trust & Safety','Security Test Mode',
  'Tài khoản nội bộ','Phân quyền','Lịch sử thao tác','Thông tin cá nhân','Cài đặt hệ thống',
];

test('navigation exposes every approved 1.5.0 module', () => {
  for (const label of requiredLabels) assert.match(app, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('pricing contract includes all six approved services', () => {
  for (const code of ['BIKE','CAR_4','CAR_7','MPV_7','LUXURY_4','LUXURY_7']) assert.match(pricingModel, new RegExp(code));
});

test('driver runtime online state stays read-only in Admin UI', () => {
  assert.doesNotMatch(driverAdmin, /(toggleOnline|setOnline|updateOnlineStatus|onlineStatus[^\n]{0,80}(PUT|PATCH))/i);
});

test('production pages do not ship mock or demo business data', () => {
  assert.doesNotMatch(productionPages, /\b(mockData|demoData)\b/);
});

test('Gateway RBAC includes four-level broadcast permissions', () => {
  assert.match(gateway, /broadcast\.view/);
  assert.match(gateway, /broadcast\.send/);
});
