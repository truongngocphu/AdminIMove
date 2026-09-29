import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {normalizeServiceCode,paymentStatusGroup} from '../src/analyticsModel.js';
const page=fs.readFileSync(new URL('../src/DashboardPage.jsx',import.meta.url),'utf8');
test('dashboard normalizes legacy/missing values',()=>{assert.equal(normalizeServiceCode({serviceCode:'CAR_4'}),'CAR_4');assert.equal(normalizeServiceCode({service:'BIKE'}),'BIKE');assert.equal(normalizeServiceCode({}),'UNKNOWN');assert.equal(paymentStatusGroup('PAID'),'success')});
test('dashboard contains required real-data KPI blocks',()=>{for(const label of ['Tổng chuyến hôm nay','Tài xế Online','Doanh thu hôm nay','Settlement backlog','Điểm phát sinh hôm nay'])assert.match(page,new RegExp(label));assert.doesNotMatch(page,/mockData|demoData/)});
