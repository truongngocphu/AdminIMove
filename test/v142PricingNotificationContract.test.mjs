import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fareEditMode, fareFormFrom } from '../src/servicePricingModel.js';

const pricing = fs.readFileSync(new URL('../src/ServicePricingPage.jsx', import.meta.url), 'utf8');
const broadcast = fs.readFileSync(new URL('../src/BroadcastCenterPage.jsx', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('effective ACTIVE fare must create a new version instead of in-place edit', () => {
  const fare = { status: 'ACTIVE', effectiveFrom: '2026-09-01T00:00:00.000Z' };
  assert.equal(fareEditMode(fare, new Date('2026-09-19T00:00:00.000Z')), 'NEW_VERSION');
});

test('DRAFT or future fare can be edited in place', () => {
  assert.equal(fareEditMode({ status: 'DRAFT' }, new Date('2026-09-19T00:00:00.000Z')), 'EDIT');
  assert.equal(fareEditMode({ status: 'ACTIVE', effectiveFrom: '2026-10-01T00:00:00.000Z' }, new Date('2026-09-19T00:00:00.000Z')), 'EDIT');
});

test('fareFormFrom pre-fills editable pricing fields', () => {
  const form = fareFormFrom({
    serviceCode: 'CAR_4', areaCode: 'GLOBAL', baseFare: 20000, baseDistanceKm: 2,
    minimumFare: 25000, pricePerMinute: 450, roundingUnit: 1000,
    distanceTiers: [{ fromKm: 2, toKm: null, pricePerKm: 12000 }], status: 'ACTIVE',
    effectiveFrom: '2026-09-20T08:30:00.000Z',
  });
  assert.equal(form.serviceCode, 'CAR_4');
  assert.equal(form.pricePerKm, 12000);
  assert.equal(form.baseFare, 20000);
});

test('pricing UI exposes update/edit actions and PUT support', () => {
  assert.match(pricing, /Cập nhật giá/);
  assert.match(pricing, /Chỉnh sửa/);
  assert.match(pricing, /method:\s*['"]PUT['"]/);
  assert.match(pricing, /Tạo phiên bản mới từ giá hiện tại/);
});

test('notification center visually distinguishes all four levels', () => {
  assert.match(broadcast, /Cấp 1 · Khẩn cấp/);
  assert.match(broadcast, /Cấp 2 · Ưu tiên cao/);
  assert.match(broadcast, /Cấp 3 · Quan trọng/);
  assert.match(broadcast, /Thông báo thường/);
  assert.match(styles, /\.level-card\.high/);
  assert.match(styles, /\.level-card\.medium/);
  assert.match(styles, /\.broadcast-level\.high/);
  assert.match(styles, /\.broadcast-level\.medium/);
  assert.match(styles, /\.preview-banner\.level-2/);
  assert.match(styles, /\.preview-banner\.level-3/);
  assert.match(styles, /\.preview-banner\.level-4/);
});

test('all previously approved 1.4 admin feature pages remain in navigation', () => {
  for (const label of ['Dịch vụ & Giá cước','Khuyến mãi','Thanh toán','Báo cáo','Thông báo hệ thống','Trust & Safety','Security Test Mode','Matching & Phát đơn','Driver Experience']) {
    assert.match(app, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
