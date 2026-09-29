import test from 'node:test';
import assert from 'node:assert/strict';
import { safeDisplay, classifyApiError } from '../src/uiModel.js';
test('safeDisplay never exposes invalid UI strings',()=>{
  assert.equal(safeDisplay(undefined),'—');
  assert.equal(safeDisplay({}),'—');
  assert.equal(safeDisplay({$numberDecimal:'12500.5'}),'12500.5');
  assert.equal(safeDisplay(Number.NaN),'—');
});
test('API errors classify permission auth and offline states',()=>{
  assert.equal(classifyApiError(new Error('API lỗi 403')).kind,'permission');
  assert.equal(classifyApiError(new Error('Không tìm thấy Core Backend.')).kind,'offline');
  assert.equal(classifyApiError(new Error('API lỗi 401')).kind,'auth');
});
