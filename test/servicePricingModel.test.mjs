import test from 'node:test';import assert from 'node:assert/strict';
import {REQUIRED_SERVICE_CODES,formatVnd,currentFareFor} from '../src/servicePricingModel.js';
test('pricing model exposes nine service codes',()=>assert.deepEqual(REQUIRED_SERVICE_CODES,['BIKE','DELIVERY','ERRAND','FOOD','CAR_4','CAR_7','MPV_7','LUXURY_4','LUXURY_7']));
test('formatVnd handles numeric strings',()=>assert.equal(formatVnd('12000'),'12.000 ₫'));

test('currentFareFor ignores ACTIVE versions that are not effective yet',()=>{
  const fares=[
    {serviceCode:'CAR_4',status:'ACTIVE',version:2,effectiveFrom:'2026-09-01T00:00:00.000Z',baseFare:20000},
    {serviceCode:'CAR_4',status:'ACTIVE',version:3,effectiveFrom:'2026-10-01T00:00:00.000Z',baseFare:25000},
  ];
  const current=currentFareFor(fares,'CAR_4',new Date('2026-09-19T00:00:00.000Z'));
  assert.equal(current.version,2);
});
