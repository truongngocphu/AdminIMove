import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const gateway=fs.readFileSync(new URL('../server/server.js',import.meta.url),'utf8');
test('1.5.0 uses TrackAsia master shell and full grouped navigation',()=>{
  assert.equal(pkg.version,'1.5.1');
  for(const marker of ['app-shell','sidebar','topbar','content-area']) assert.match(app+css,new RegExp(marker));
  for(const group of ['TỔNG QUAN','VẬN HÀNH','NGƯỜI DÙNG','KINH DOANH','TRUYỀN THÔNG','AN TOÀN & HỆ THỐNG']) assert.match(app,new RegExp(group));
  for(const item of ['Settlement / Đối soát','Tài khoản nội bộ','Phân quyền','Lịch sử thao tác','Thông tin cá nhân','Cài đặt hệ thống']) assert.match(app,new RegExp(item));
  assert.match(gateway,/1\.5\.1/);
});
