import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const broadcast=fs.readFileSync(new URL('../src/BroadcastCenterPage.jsx',import.meta.url),'utf8');
test('App routes 1.4 pages for pricing promotions payments reports',()=>{
  assert.match(app,/ServicePricingPage/);assert.match(app,/PromotionsAdminPage/);assert.match(app,/PaymentsV14Page/);assert.match(app,/AnalyticsReportsPage/);assert.match(app,/\['promotions','Khuyến mãi'/);
});
test('Broadcast Center exposes all four notification levels',()=>{
  assert.match(broadcast,/Cấp 1/);assert.match(broadcast,/Cấp 2/);assert.match(broadcast,/Cấp 3/);assert.match(broadcast,/Thông báo thường/);assert.match(broadcast,/level:\s*4/);
});

test('Promotions Admin supports edit and disable via PUT',()=>{
  const source=fs.readFileSync(new URL('../src/PromotionsAdminPage.jsx',import.meta.url),'utf8');
  assert.match(source,/method:\s*(?:editingCode\s*\?\s*)?['"]PUT['"]/);
  assert.match(source,/Chỉnh sửa/);
  assert.match(source,/Tắt mã|Bật mã/);
});
