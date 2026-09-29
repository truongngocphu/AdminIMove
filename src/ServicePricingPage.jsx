import React from 'react';
import {
  Bike, Car, Package, ShoppingBasket, UtensilsCrossed, BusFront, Sparkles,
  Plus, RefreshCw, Save, History, Power, Pencil, Copy, Clock3,
} from 'lucide-react';
import {coreApiRequest} from './coreApi.js';
import {
  REQUIRED_SERVICE_CODES,SERVICE_LABELS,formatVnd,currentFareFor,
  fareEditMode,fareFormFrom,nowLocalDateTimeInput,
} from './servicePricingModel.js';

function emptyFare(serviceCode='BIKE'){
  return {serviceCode,areaCode:'GLOBAL',baseFare:12000,baseDistanceKm:2,minimumFare:15000,pricePerMinute:250,pricePerKm:5000,roundingUnit:1000,status:'DRAFT',effectiveFrom:'',effectiveTo:''};
}
function farePayload(form){
  return {
    serviceCode:String(form.serviceCode||'').toUpperCase(),
    areaCode:String(form.areaCode||'GLOBAL').toUpperCase(),
    baseFare:Number(form.baseFare),
    baseDistanceKm:Number(form.baseDistanceKm),
    minimumFare:Number(form.minimumFare),
    pricePerMinute:Number(form.pricePerMinute),
    roundingUnit:Number(form.roundingUnit||1000),
    distanceTiers:[{fromKm:Number(form.baseDistanceKm),toKm:null,pricePerKm:Number(form.pricePerKm)}],
    status:String(form.status||'DRAFT').toUpperCase(),
    effectiveFrom:form.effectiveFrom?new Date(form.effectiveFrom).toISOString():null,
    effectiveTo:form.effectiveTo?new Date(form.effectiveTo).toISOString():null,
  };
}
function modeLabel(mode){return mode==='EDIT'?'Chỉnh sửa phiên bản giá':mode==='NEW_VERSION'?'Cập nhật giá cước':'Tạo phiên bản giá mới';}
function serviceIcon(code){
  const c=String(code||'').toUpperCase();
  if(c==='BIKE') return Bike;
  if(c==='DELIVERY') return Package;
  if(c==='ERRAND') return ShoppingBasket;
  if(c==='FOOD') return UtensilsCrossed;
  if(c==='MPV_7') return BusFront;
  if(c==='LUXURY_4'||c==='LUXURY_7') return Sparkles;
  return Car;
}
function serviceMeta(s,code){
  const vehicleCodes=new Set(['BIKE','CAR_4','CAR_7','MPV_7','LUXURY_4','LUXURY_7']);
  return vehicleCodes.has(code)
    ? `${code}${s?.seats?` · ${s.seats} chỗ`:''}`
    : code;
}

export default function ServicePricingPage(){
  const [services,setServices]=React.useState([]);
  const [fares,setFares]=React.useState([]);
  const [form,setForm]=React.useState(()=>emptyFare());
  const [open,setOpen]=React.useState(false);
  const [mode,setMode]=React.useState('CREATE');
  const [editingId,setEditingId]=React.useState(null);
  const [sourceFare,setSourceFare]=React.useState(null);
  const [saving,setSaving]=React.useState(false);
  const [error,setError]=React.useState('');
  const [success,setSuccess]=React.useState('');

  const load=React.useCallback(async()=>{
    try{
      const [s,f]=await Promise.all([
        coreApiRequest('/api/v14/admin/services'),
        coreApiRequest('/api/v14/admin/pricing/fares'),
      ]);
      setServices(s.services||[]);
      setFares(f.fares||[]);
      setError('');
    }catch(e){setError(e.message)}
  },[]);
  React.useEffect(()=>{load()},[load]);

  function openCreate(serviceCode='BIKE'){
    setMode('CREATE');
    setEditingId(null);
    setSourceFare(null);
    setForm(emptyFare(serviceCode));
    setOpen(true);
    setSuccess('');
  }

  function openFareEditor(fare){
    if(!fare)return openCreate();
    const editMode=fareEditMode(fare);
    const next=fareFormFrom(fare);
    setMode(editMode);
    setSourceFare(fare);
    setEditingId(editMode==='EDIT'?fare._id:null);
    setForm(editMode==='NEW_VERSION'?{
      ...next,
      status:'ACTIVE',
      effectiveFrom:nowLocalDateTimeInput(),
      effectiveTo:'',
    }:next);
    setOpen(true);
    setSuccess('');
  }

  async function save(e){
    e.preventDefault();
    setSaving(true);setError('');setSuccess('');
    try{
      const payload=farePayload(form);
      if(mode==='EDIT'&&editingId){
        await coreApiRequest(`/api/v14/admin/pricing/fares/${editingId}`,{method:'PUT',body:JSON.stringify(payload)});
        setSuccess('Đã cập nhật phiên bản giá chưa hiệu lực.');
      }else{
        await coreApiRequest('/api/v14/admin/pricing/fares',{method:'POST',body:JSON.stringify(payload)});
        setSuccess(mode==='NEW_VERSION'?'Đã tạo phiên bản giá mới từ giá hiện tại.':'Đã tạo phiên bản giá mới.');
      }
      setOpen(false);
      await load();
    }catch(err){setError(err.message)}finally{setSaving(false)}
  }

  async function toggleService(s){
    try{
      await coreApiRequest(`/api/v14/admin/services/${s.code}`,{method:'PUT',body:JSON.stringify({...s,status:s.status==='ACTIVE'?'INACTIVE':'ACTIVE'})});
      await load();
    }catch(e){setError(e.message)}
  }

  return <section className="v14-page">
    <header className="v14-page-head"><div><span className="v14-eyebrow">SERVICE CATALOG · VERSIONED PRICING</span><h1>Dịch vụ & Giá cước</h1><p>Cập nhật giá độc lập cho từng danh mục xe. Giá đang áp dụng không bị ghi đè; hệ thống tạo version mới để giữ lịch sử chuyến cũ.</p></div><div className="page-actions"><button className="button" onClick={load}><RefreshCw size={15}/>Làm mới</button><button className="button button-primary" onClick={()=>openCreate()}><Plus size={15}/>Tạo bảng giá</button></div></header>
    {error&&<div className="v73-alert">{error}</div>}
    {success&&<div className="v14-success">{success}</div>}

    <div className="v14-pricing-policy"><Clock3 size={17}/><div><b>Quy tắc chỉnh sửa an toàn</b><span>DRAFT hoặc bảng giá chưa tới thời điểm hiệu lực có thể sửa trực tiếp. Bảng giá ACTIVE đang dùng sẽ được nhân bản thành phiên bản mới khi bạn bấm “Cập nhật giá”.</span></div></div>

    <div className="v14-service-cards">{REQUIRED_SERVICE_CODES.map(code=>{
      const s=services.find(x=>x.code===code)||{code,name:SERVICE_LABELS[code],status:'INACTIVE'};
      const fare=currentFareFor(fares,code);
      const ServiceIcon=serviceIcon(code);
      return <article key={code} className="card v14-service-card">
        <header><span className="v14-service-icon"><ServiceIcon size={20}/></span><div><b>{s.name||SERVICE_LABELS[code]}</b><small>{serviceMeta(s,code)}</small></div><button className={`v14-power ${s.status==='ACTIVE'?'on':''}`} onClick={()=>toggleService(s)} title="Bật/tắt dịch vụ"><Power size={15}/></button></header>
        <div className="v14-price-grid"><span>Giá mở cửa<b>{fare?formatVnd(fare.baseFare):'Chưa có'}</b></span><span>Giá/km<b>{fare?formatVnd(fare.distanceTiers?.[0]?.pricePerKm):'—'}</b></span><span>Giá/phút<b>{fare?formatVnd(fare.pricePerMinute):'—'}</b></span><span>Tối thiểu<b>{fare?formatVnd(fare.minimumFare):'—'}</b></span></div>
        <footer className="v14-service-footer"><div><span className={`v14-status ${s.status==='ACTIVE'?'success':'pending'}`}>{s.status}</span><small><History size={13}/>v{fare?.version||0}</small></div><button className="button button-small v14-edit-price" onClick={()=>fare?openFareEditor(fare):openCreate(code)}>{fare?<><Pencil size={13}/>Cập nhật giá</>:<><Plus size={13}/>Tạo bảng giá</>}</button></footer>
      </article>})}
    </div>

    <section className="card v14-panel"><div className="v14-section-head"><div><h2>Lịch sử phiên bản giá</h2><p>Chỉnh sửa trực tiếp chỉ áp dụng cho DRAFT/bảng giá chưa hiệu lực.</p></div></div><div className="v14-table-wrap"><table><thead><tr><th>Dịch vụ</th><th>Version</th><th>Trạng thái</th><th>Mở cửa</th><th>Giá/km</th><th>Giá/phút</th><th>Hiệu lực</th><th>Thao tác</th></tr></thead><tbody>{fares.map(x=>{const action=fareEditMode(x);return <tr key={x._id}><td><b>{x.serviceCode}</b><small className="v14-subline">{SERVICE_LABELS[x.serviceCode]||x.serviceCode}</small></td><td>v{x.version}</td><td><span className={`v14-status ${x.status==='ACTIVE'?'success':'pending'}`}>{x.status}</span></td><td>{formatVnd(x.baseFare)}</td><td>{formatVnd(x.distanceTiers?.[0]?.pricePerKm)}</td><td>{formatVnd(x.pricePerMinute)}</td><td>{x.effectiveFrom?new Date(x.effectiveFrom).toLocaleString('vi-VN'):'Ngay khi ACTIVE'}</td><td><button className="button button-small" onClick={()=>openFareEditor(x)}>{action==='EDIT'?<><Pencil size={13}/>Chỉnh sửa</>:<><Copy size={13}/>Tạo phiên bản</>}</button></td></tr>})}</tbody></table></div></section>

    {open&&<div className="v14-modal-backdrop" onMouseDown={()=>!saving&&setOpen(false)}><form className="v14-modal" onMouseDown={e=>e.stopPropagation()} onSubmit={save}><header><div><h2>{modeLabel(mode)}</h2><p>{mode==='EDIT'?'Phiên bản này chưa có hiệu lực nên có thể cập nhật trực tiếp.':mode==='NEW_VERSION'?`Tạo phiên bản mới từ giá hiện tại v${sourceFare?.version||0}; chuyến cũ vẫn giữ fareSnapshot.`:'Tạo bảng giá versioned cho từng loại xe.'}</p></div><button type="button" disabled={saving} onClick={()=>setOpen(false)}>×</button></header>
      <div className="v14-form-grid">
        <label>Dịch vụ<select value={form.serviceCode} disabled={mode!=='CREATE'} onChange={e=>setForm({...form,serviceCode:e.target.value})}>{REQUIRED_SERVICE_CODES.map(x=><option key={x} value={x}>{SERVICE_LABELS[x]}</option>)}</select></label>
        <label>Khu vực<input value={form.areaCode} disabled={mode!=='CREATE'} onChange={e=>setForm({...form,areaCode:e.target.value.toUpperCase()})}/></label>
        <label>Trạng thái<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>DRAFT</option><option>ACTIVE</option><option>INACTIVE</option></select></label>
        <label>Đơn vị làm tròn<input type="number" min="1" value={form.roundingUnit} onChange={e=>setForm({...form,roundingUnit:e.target.value})}/></label>
        <label>Giá mở cửa<input required type="number" min="0" value={form.baseFare} onChange={e=>setForm({...form,baseFare:e.target.value})}/></label>
        <label>Km mở cửa<input required type="number" min="0" step="0.1" value={form.baseDistanceKm} onChange={e=>setForm({...form,baseDistanceKm:e.target.value})}/></label>
        <label>Giá/km<input required type="number" min="0" value={form.pricePerKm} onChange={e=>setForm({...form,pricePerKm:e.target.value})}/></label>
        <label>Giá/phút<input required type="number" min="0" value={form.pricePerMinute} onChange={e=>setForm({...form,pricePerMinute:e.target.value})}/></label>
        <label>Giá tối thiểu<input required type="number" min="0" value={form.minimumFare} onChange={e=>setForm({...form,minimumFare:e.target.value})}/></label>
        <label>Hiệu lực từ<input type="datetime-local" value={form.effectiveFrom} onChange={e=>setForm({...form,effectiveFrom:e.target.value})}/></label>
        <label className="span-2">Kết thúc hiệu lực (không bắt buộc)<input type="datetime-local" value={form.effectiveTo} onChange={e=>setForm({...form,effectiveTo:e.target.value})}/></label>
      </div>
      {mode==='NEW_VERSION'&&<div className="v14-version-note"><Copy size={16}/><span><b>Tạo phiên bản mới từ giá hiện tại.</b> Không sửa document ACTIVE đang dùng; Backend sẽ chọn version ACTIVE mới nhất theo từng loại xe.</span></div>}
      <footer><button type="button" className="button" disabled={saving} onClick={()=>setOpen(false)}>Hủy</button><button className="button button-primary" disabled={saving}><Save size={15}/>{saving?'Đang lưu...':mode==='EDIT'?'Lưu chỉnh sửa':'Lưu phiên bản'}</button></footer>
    </form></div>}
  </section>;
}
