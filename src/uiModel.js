export function safeDisplay(value,fallback='—'){
  if(value===null||value===undefined||value==='') return fallback;
  if(typeof value==='number') return Number.isFinite(value)?String(value):fallback;
  if(typeof value==='string'||typeof value==='boolean') return String(value);
  if(typeof value==='object'){
    for(const key of ['$numberDecimal','$numberLong','$numberInt']) if(key in value) return String(value[key]);
    if(value.address) return String(value.address);
    if(value.addressText) return String(value.addressText);
    if(value.name) return String(value.name);
    if(value.code) return String(value.code);
  }
  return fallback;
}

export function numberValue(value,fallback=0){
  if(value===null||value===undefined||value==='') return fallback;
  if(typeof value==='object'){
    for(const key of ['$numberDecimal','$numberLong','$numberInt']) if(key in value){
      const n=Number(value[key]); return Number.isFinite(n)?n:fallback;
    }
  }
  const n=Number(value);
  return Number.isFinite(n)?n:fallback;
}

export function classifyApiError(error){
  const message=String(error?.message||error||'Có lỗi xảy ra');
  if(/403|không có quyền|permission/i.test(message)) return {kind:'permission',message};
  if(/401|đăng nhập|token|unauthor/i.test(message)) return {kind:'auth',message};
  if(/core backend|network|fetch|connection|refused|failed to fetch/i.test(message)) return {kind:'offline',message};
  return {kind:'error',message};
}
