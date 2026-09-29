import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const s=fs.readFileSync(new URL('../src/ServicePricingPage.jsx',import.meta.url),'utf8');
test('pricing UI keeps TrackAsia versioned editing controls',()=>{for(const m of ['Cập nhật giá','Chỉnh sửa','Tạo phiên bản','Giá mở cửa','Giá/km','Giá/phút','Giá tối thiểu','Hiệu lực'])assert.match(s,new RegExp(m));assert.match(s,/method:\s*'PUT'/);assert.match(s,/method:\s*'POST'/)});
