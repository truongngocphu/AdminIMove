import test from 'node:test';import assert from 'node:assert/strict';
import {serviceLabel,paymentStatusGroup,completionRate} from '../src/analyticsModel.js';
test('service label never renders undefined',()=>assert.equal(serviceLabel({serviceCode:null}),'Không xác định'));
test('PAID is success',()=>assert.equal(paymentStatusGroup('PAID'),'success'));
test('completion rate counts canonical COMPLETED',()=>assert.equal(completionRate([{status:'COMPLETED'},{status:'CANCELLED'}]),50));
