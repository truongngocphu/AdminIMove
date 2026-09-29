export const SETTLEMENT_STAGES=['LOYALTY_SETTLEMENT','DRIVER_EARNING','PLATFORM_LEDGER'];
export function settlementStatusLabel(status){const s=String(status||'PENDING').toUpperCase();return ({SETTLED:'Đã đối soát',POSTED:'Đã ghi ledger',PARTIAL:'Đối soát một phần',FAILED:'Đối soát lỗi',PENDING:'Đang chờ đối soát'})[s]||s;}
export function settlementTone(status){const s=String(status||'').toUpperCase();if(['SETTLED','POSTED'].includes(s))return'success';if(['FAILED'].includes(s))return'failed';return'pending';}
