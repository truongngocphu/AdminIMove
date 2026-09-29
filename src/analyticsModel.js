import { numberValue } from './uiModel.js';
export function normalizeServiceCode(row={}){const code=String(row?.serviceCode||row?.service||'').trim().toUpperCase();return code||'UNKNOWN';}
export function serviceLabel(row={}){const code=normalizeServiceCode(row);return code==='UNKNOWN'?'Không xác định':code;}
export function paymentStatusGroup(status){const s=String(status||'').toUpperCase();if(['PAID','SUCCESS','SUCCEEDED','COMPLETED'].includes(s))return 'success';if(['FAILED','CANCELLED'].includes(s))return 'failed';if(['REFUNDED','PARTIALLY_REFUNDED'].includes(s))return 'refunded';return 'pending';}
export function completionRate(rows=[]){if(!rows.length)return 0;const done=rows.filter(x=>String(x.status||'').toUpperCase()==='COMPLETED').length;return Number((done*100/rows.length).toFixed(1));}
export function money(value){return new Intl.NumberFormat('vi-VN').format(numberValue(value,0))+' ₫';}
export function isSameLocalDay(value,now=new Date()){const d=new Date(value);return !Number.isNaN(d.getTime())&&d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===now.getDate();}
