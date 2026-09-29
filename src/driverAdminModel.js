import { REQUIRED_SERVICE_CODES } from './servicePricingModel.js';
const ALLOWED=new Set(REQUIRED_SERVICE_CODES);
export function normalizeAllowedServices(values=[]){return [...new Set((Array.isArray(values)?values:[]).map(x=>String(x||'').trim().toUpperCase()).filter(x=>ALLOWED.has(x)))];}
export function driverRuntimeStatus(row={}){const s=String(row.onlineStatus||'OFFLINE').toUpperCase();return ['ONLINE','BUSY','OFFLINE'].includes(s)?s:'OFFLINE';}
