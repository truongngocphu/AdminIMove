import React from 'react';
import { Activity, Award, Flame, MapPinned, Plus, RefreshCw, Star, Target, Users, X } from 'lucide-react';
import { coreApiRequest } from './coreApi.js';

const money=(v)=>new Intl.NumberFormat('vi-VN').format(Number(v||0))+' ₫';
const fmt=(v)=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d)};

export default function DriverExperiencePage(){
  const [overview,setOverview]=React.useState(null);
  const [incentives,setIncentives]=React.useState([]);
  const [zones,setZones]=React.useState([]);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState('');
  const [modal,setModal]=React.useState(null);

  const load=React.useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const [o,i,z]=await Promise.all([
        coreApiRequest('/api/v72/admin/driver-experience/overview'),
        coreApiRequest('/api/v72/admin/driver-experience/incentives'),
        coreApiRequest('/api/v72/admin/driver-experience/zones'),
      ]);
      setOverview(o);setIncentives(Array.isArray(i)?i:[]);setZones(Array.isArray(z)?z:[]);
    }catch(e){setError(e.message||String(e))}finally{setLoading(false)}
  },[]);
  React.useEffect(()=>{load()},[load]);

  async function toggleIncentive(row){
    await coreApiRequest(`/api/v72/admin/driver-experience/incentives/${row._id}`,{method:'PUT',body:JSON.stringify({status:String(row.status).toUpperCase()==='ACTIVE'?'PAUSED':'ACTIVE'})});
    await load();
  }
  async function toggleZone(row){
    await coreApiRequest(`/api/v72/admin/driver-experience/zones/${row._id}`,{method:'PUT',body:JSON.stringify({status:String(row.status).toUpperCase()==='ACTIVE'?'INACTIVE':'ACTIVE'})});
    await load();
  }

  return <div className="driver-experience-page">
    <div className="future-page-head">
      <div><span className="future-eyebrow">DRIVER EXPERIENCE V7.2</span><h1>Trải nghiệm tài xế</h1><p>Dữ liệu thật cho giao diện Driver: điểm thưởng, nhiệm vụ, khu vực nhu cầu và đánh giá.</p></div>
      <div className="future-actions"><button onClick={load}><RefreshCw size={14}/> Làm mới</button><button className="ok" onClick={()=>setModal('incentive')}><Plus size={14}/> Thêm nhiệm vụ</button><button onClick={()=>setModal('zone')}><MapPinned size={14}/> Thêm khu vực</button></div>
    </div>
    {error&&<div className="broadcast-alert error">{error}</div>}
    <div className="driver-exp-kpis">
      <Kpi icon={Users} label="Tài xế" value={overview?.driverCount||0}/>
      <Kpi icon={Star} label="Rating trung bình" value={overview?.averageRating||0}/>
      <Kpi icon={Target} label="Nhiệm vụ active" value={overview?.activeIncentives||0}/>
      <Kpi icon={Flame} label="Khu vực nhu cầu" value={overview?.activeDemandZones||0}/>
      <Kpi icon={Award} label="Ví điểm tài xế" value={overview?.rewardAccounts||0}/>
    </div>

    <section className="future-card driver-exp-section">
      <header><div><h2>Thưởng & nhiệm vụ</h2><p>Hiển thị trực tiếp trong Driver App, tiến độ lấy từ chuyến hoàn thành.</p></div><button className="button button-primary" onClick={()=>setModal('incentive')}><Plus size={14}/> Tạo mới</button></header>
      <div className="future-table-wrap"><table className="future-table"><thead><tr><th>Mã</th><th>Nhiệm vụ</th><th>Mục tiêu</th><th>Thưởng</th><th>Thời gian</th><th>Trạng thái</th><th></th></tr></thead><tbody>
        {incentives.map(row=><tr key={row._id}><td><b>{row.code}</b></td><td><b>{row.title}</b><small>{row.description}</small></td><td>{row.targetTrips||0} cuốc</td><td>{money(row.rewardAmount)}{row.rewardPoints?` + ${row.rewardPoints} điểm`:''}</td><td>{fmt(row.startsAt)}<br/><small>→ {fmt(row.endsAt)}</small></td><td><span className={`risk-badge ${String(row.status).toLowerCase()==='active'?'low':'medium'}`}>{row.status}</span></td><td><button className="driver-exp-link" onClick={()=>toggleIncentive(row)}>{String(row.status).toUpperCase()==='ACTIVE'?'Tạm dừng':'Kích hoạt'}</button></td></tr>)}
        {!incentives.length&&!loading&&<tr><td colSpan="7">Chưa có nhiệm vụ.</td></tr>}
      </tbody></table></div>
    </section>

    <section className="future-card driver-exp-section">
      <header><div><h2>Khu vực đông khách</h2><p>Driver App dùng danh sách này cho bản đồ nhu cầu và gợi ý di chuyển.</p></div><button className="button" onClick={()=>setModal('zone')}><Plus size={14}/> Thêm khu vực</button></header>
      <div className="driver-zone-grid">{zones.map(row=><article key={row._id} className="driver-zone-card"><div className="driver-zone-icon"><MapPinned size={18}/></div><div><b>{row.name}</b><span>{row.code} · {row.demandLevel}</span></div><strong>+{Number(row.incomeBoostPercent||0)}%</strong><footer><span>Nhu cầu +{Number(row.demandPercent||0)}% · bán kính {row.radiusKm||0} km</span><button onClick={()=>toggleZone(row)}>{String(row.status).toUpperCase()==='ACTIVE'?'Tắt':'Bật'}</button></footer></article>)}</div>
    </section>

    {modal&&<ExperienceModal kind={modal} onClose={()=>setModal(null)} onSaved={async()=>{setModal(null);await load()}}/>}
  </div>
}

function Kpi({icon:Icon,label,value}){return <article className="driver-exp-kpi"><span><Icon size={18}/></span><div><b>{value}</b><small>{label}</small></div></article>}

function ExperienceModal({kind,onClose,onSaved}){
  const isInc=kind==='incentive';
  const [form,setForm]=React.useState(isInc?{title:'',description:'',targetTrips:5,rewardAmount:70000,rewardPoints:0,serviceCode:'ALL',startsAt:'',endsAt:''}:{name:'',code:'',demandLevel:'HIGH',demandPercent:20,incomeBoostPercent:10,radiusKm:2,priority:10,lat:'',lng:''});
  const [busy,setBusy]=React.useState(false);const [error,setError]=React.useState('');const [locating,setLocating]=React.useState(false);const [coordinateText,setCoordinateText]=React.useState('');
  const change=(k,v)=>setForm(x=>({...x,[k]:v}));
  function applyCoordinateText(){
    const raw=String(coordinateText||'').trim();
    const direct=raw.match(/(-?\d{1,2}(?:\.\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:\.\d+)?)/);
    const maps=raw.match(/@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
    const match=maps||direct;
    if(!match){setError('Không đọc được tọa độ. Hãy dán dạng 10.7769, 106.7009 hoặc link bản đồ có @Latitude,Longitude.');return}
    const lat=Number(match[1]),lng=Number(match[2]);
    if(!Number.isFinite(lat)||lat<-90||lat>90||!Number.isFinite(lng)||lng<-180||lng>180){setError('Tọa độ không hợp lệ.');return}
    change('lat',String(lat));change('lng',String(lng));setError('');
  }
  function useCurrentLocation(){
    if(!navigator.geolocation){setError('Trình duyệt này không hỗ trợ lấy vị trí.');return}
    setLocating(true);setError('');
    navigator.geolocation.getCurrentPosition(
      pos=>{change('lat',pos.coords.latitude.toFixed(6));change('lng',pos.coords.longitude.toFixed(6));setLocating(false)},
      err=>{setError(err.code===1?'Bạn chưa cho phép trình duyệt truy cập vị trí.':'Không lấy được vị trí hiện tại.');setLocating(false)},
      {enableHighAccuracy:true,timeout:12000,maximumAge:15000},
    );
  }
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{
    if(!isInc){const lat=Number(form.lat),lng=Number(form.lng);if(!Number.isFinite(lat)||lat<-90||lat>90||!Number.isFinite(lng)||lng<-180||lng>180)throw new Error('Tọa độ khu vực không hợp lệ. Latitude -90..90, Longitude -180..180.');if(Number(form.radiusKm)<=0)throw new Error('Bán kính phải lớn hơn 0 km.');}
    const payload=isInc?{...form,targetTrips:Number(form.targetTrips),rewardAmount:Number(form.rewardAmount),rewardPoints:Number(form.rewardPoints),startsAt:form.startsAt||undefined,endsAt:form.endsAt||undefined,status:'ACTIVE'}:{...form,demandPercent:Number(form.demandPercent),incomeBoostPercent:Number(form.incomeBoostPercent),radiusKm:Number(form.radiusKm),priority:Number(form.priority),center:form.lat&&form.lng?{lat:Number(form.lat),lng:Number(form.lng)}:undefined,status:'ACTIVE'};
    await coreApiRequest(`/api/v72/admin/driver-experience/${isInc?'incentives':'zones'}`,{method:'POST',body:JSON.stringify(payload)});await onSaved();
  }catch(e){setError(e.message||String(e))}finally{setBusy(false)}}
  return <div className="broadcast-detail-backdrop"><form className="broadcast-detail driver-exp-modal" onSubmit={submit}><header><div><span className="future-eyebrow">V7.2</span><h2>{isInc?'Tạo nhiệm vụ tài xế':'Tạo khu vực nhu cầu'}</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={17}/></button></header>{error&&<div className="broadcast-alert error">{error}</div>}
    {isInc?<div className="driver-exp-form"><Field label="Tên nhiệm vụ" value={form.title} onChange={v=>change('title',v)} required/><Field label="Mô tả" value={form.description} onChange={v=>change('description',v)}/><Field label="Số cuốc mục tiêu" type="number" value={form.targetTrips} onChange={v=>change('targetTrips',v)}/><Field label="Tiền thưởng" type="number" value={form.rewardAmount} onChange={v=>change('rewardAmount',v)}/><Field label="Điểm thưởng" type="number" value={form.rewardPoints} onChange={v=>change('rewardPoints',v)}/><Field label="Dịch vụ" value={form.serviceCode} onChange={v=>change('serviceCode',v)}/><Field label="Bắt đầu" type="datetime-local" value={form.startsAt} onChange={v=>change('startsAt',v)}/><Field label="Kết thúc" type="datetime-local" value={form.endsAt} onChange={v=>change('endsAt',v)}/></div>:<div className="driver-exp-form"><Field label="Tên khu vực" value={form.name} onChange={v=>change('name',v)} required/><Field label="Mã khu vực" value={form.code} onChange={v=>change('code',v)}/><label className="broadcast-field"><span>Mức nhu cầu</span><select value={form.demandLevel} onChange={e=>change('demandLevel',e.target.value)}><option value="NORMAL">Bình thường</option><option value="HIGH">Cao</option><option value="VERY_HIGH">Rất cao</option></select></label><Field label="Tăng nhu cầu %" type="number" value={form.demandPercent} onChange={v=>change('demandPercent',v)}/><Field label="Thu nhập dự kiến +%" type="number" value={form.incomeBoostPercent} onChange={v=>change('incomeBoostPercent',v)}/><Field label="Bán kính km" type="number" value={form.radiusKm} onChange={v=>change('radiusKm',v)}/><Field label="Latitude" type="number" value={form.lat} onChange={v=>change('lat',v)}/><Field label="Longitude" type="number" value={form.lng} onChange={v=>change('lng',v)}/><div className="driver-zone-help coordinate-helper"><b>Lấy tọa độ dễ hơn</b><span>Không cần tự tìm Latitude/Longitude. Có thể lấy vị trí máy hiện tại hoặc dán tọa độ/link Google Maps/TrackAsia.</span><div className="coordinate-helper-row"><button type="button" className="button" onClick={useCurrentLocation} disabled={locating}><MapPinned size={14}/>{locating?'Đang lấy vị trí...':'Lấy vị trí hiện tại'}</button></div><div className="coordinate-paste"><input value={coordinateText} onChange={e=>setCoordinateText(e.target.value)} placeholder="VD: 10.7769, 106.7009 hoặc link có @10.7769,106.7009"/><button type="button" className="button" onClick={applyCoordinateText}>Điền tọa độ</button></div><small>Hệ thống vẫn kiểm tra Latitude -90..90, Longitude -180..180 trước khi lưu.</small></div></div>}
    <div className="broadcast-send-row"><button type="button" className="button" onClick={onClose}>Hủy</button><button disabled={busy} className="button button-primary" type="submit">{busy?'Đang lưu...':'Lưu & áp dụng'}</button></div>
  </form></div>
}
function Field({label,value,onChange,type='text',required=false}){return <label className="broadcast-field"><span>{label}</span><input required={required} type={type} value={value} onChange={e=>onChange(e.target.value)}/></label>}
