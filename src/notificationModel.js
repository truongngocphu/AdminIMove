const LEVELS={1:{key:'critical',label:'Cấp 1 · Khẩn cấp',requiresAck:true,presentation:'MODAL'},2:{key:'high',label:'Cấp 2 · Ưu tiên cao',requiresAck:false,presentation:'OVERLAY'},3:{key:'important',label:'Cấp 3 · Quan trọng',requiresAck:false,presentation:'PUSH_CENTER'},4:{key:'normal',label:'Thông báo thường',requiresAck:false,presentation:'IN_APP'}};
export function notificationLevelMeta(level){return LEVELS[Number(level)]||LEVELS[4];}
export function notificationLevels(){return Object.entries(LEVELS).map(([level,meta])=>({level:Number(level),...meta}));}
