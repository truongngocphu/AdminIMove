export const REQUIRED_SERVICE_CODES=['BIKE','DELIVERY','ERRAND','FOOD','CAR_4','CAR_7','MPV_7','LUXURY_4','LUXURY_7'];
export const SERVICE_LABELS={BIKE:'Xe máy',DELIVERY:'Giao hàng',ERRAND:'Mua hộ',FOOD:'Đặt đồ ăn',CAR_4:'Ô tô 4 chỗ',CAR_7:'Ô tô 7 chỗ',MPV_7:'MPV 7 chỗ',LUXURY_4:'Luxury 4 chỗ',LUXURY_7:'Luxury 7 chỗ'};

export function formatVnd(value){return new Intl.NumberFormat('vi-VN').format(Number(value||0))+' ₫';}

export function currentFareFor(fares=[],serviceCode,now=new Date()){
  const at=now instanceof Date?now:new Date(now);
  return fares
    .filter(x=>{
      if(x.serviceCode!==serviceCode||String(x.status||'').toUpperCase()!=='ACTIVE')return false;
      const from=x.effectiveFrom?new Date(x.effectiveFrom):null;
      const to=x.effectiveTo?new Date(x.effectiveTo):null;
      if(from&&!Number.isNaN(from.getTime())&&from>at)return false;
      if(to&&!Number.isNaN(to.getTime())&&to<=at)return false;
      return true;
    })
    .sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0]||null;
}

export function localDateTimeInput(value){
  if(!value)return'';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return'';
  const shifted=new Date(date.getTime()-date.getTimezoneOffset()*60000);
  return shifted.toISOString().slice(0,16);
}

export function nowLocalDateTimeInput(now=new Date()){
  return localDateTimeInput(now);
}

export function fareEditMode(fare,now=new Date()){
  if(!fare)return'CREATE';
  const status=String(fare.status||'DRAFT').toUpperCase();
  if(status!=='ACTIVE')return'EDIT';
  if(!fare.effectiveFrom)return'NEW_VERSION';
  const effectiveFrom=new Date(fare.effectiveFrom);
  if(Number.isNaN(effectiveFrom.getTime()))return'NEW_VERSION';
  return effectiveFrom>now?'EDIT':'NEW_VERSION';
}

export function fareFormFrom(fare={}){
  return {
    serviceCode:String(fare.serviceCode||'BIKE').toUpperCase(),
    areaCode:String(fare.areaCode||'GLOBAL').toUpperCase(),
    baseFare:Number(fare.baseFare||0),
    baseDistanceKm:Number(fare.baseDistanceKm||0),
    minimumFare:Number(fare.minimumFare||0),
    pricePerMinute:Number(fare.pricePerMinute||0),
    pricePerKm:Number(fare.distanceTiers?.[0]?.pricePerKm||0),
    roundingUnit:Number(fare.roundingUnit||1000),
    status:String(fare.status||'DRAFT').toUpperCase(),
    effectiveFrom:localDateTimeInput(fare.effectiveFrom),
    effectiveTo:localDateTimeInput(fare.effectiveTo),
  };
}
