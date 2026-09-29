import test from 'node:test';
import assert from 'node:assert/strict';
import { HCM_CENTER, validDriverPoint, computeMapView } from '../src/operationsMapModel.js';

test('validDriverPoint rejects zero coordinates', () => {
  assert.equal(validDriverPoint({ latitude: 0, longitude: 0 }), false);
});

test('validDriverPoint requires locationValid when backend provides it', () => {
  assert.equal(validDriverPoint({ latitude: 10.78, longitude: 106.70, locationValid: false }), false);
  assert.equal(validDriverPoint({ latitude: 10.78, longitude: 106.70, locationValid: true }), true);
});

test('computeMapView falls back to Ho Chi Minh City when there are no valid points', () => {
  assert.deepEqual(computeMapView([], 1200, 360), { center: HCM_CENTER, zoom: 12 });
});

test('computeMapView keeps multiple Ho Chi Minh City drivers in view', () => {
  const view = computeMapView([
    { latitude: 10.70, longitude: 106.62, locationValid: true },
    { latitude: 10.84, longitude: 106.82, locationValid: true },
  ], 1200, 360);
  assert.ok(view.center.lat > 10.70 && view.center.lat < 10.84);
  assert.ok(view.center.lon > 106.62 && view.center.lon < 106.82);
  assert.ok(view.zoom >= 10 && view.zoom <= 13);
});
