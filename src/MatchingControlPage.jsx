import React from 'react';
import {
  Activity, AlertTriangle, Ban, CheckCircle2, Clock3, Gauge, MapPin,
  RadioTower, RefreshCw, RotateCcw, Save, Scale, Send, SlidersHorizontal,
  Star, Trophy, Users, Zap, WalletCards
} from 'lucide-react';
import { coreApiRequest } from './coreApi.js';
import { hasPermission } from './adminApi.js';
import DispatchRoundSimulator from './DispatchRoundSimulator.jsx';

const money = value => new Intl.NumberFormat('vi-VN').format(Number(value || 0)) + ' ₫';
const timeText = value => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : new Intl.DateTimeFormat('vi-VN', {
    day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'
  }).format(d);
};
const pct = value => `${Number(value || 0).toFixed(0)}%`;

const PRESET_LABELS = {
  BALANCED:'Cân bằng', NEAREST:'Gần nhất', QUALITY:'Chất lượng', FAIRNESS:'Chia cuốc công bằng',
  FIVE_STAR:'Ưu tiên 5 sao', POINTS:'Ưu tiên điểm cao', CUSTOM:'Tùy chỉnh'
};

function Box({children,style={}}){
  return <section style={{background:'#fff',border:'1px solid #e7e9ed',borderRadius:20,padding:18,boxShadow:'0 10px 30px rgba(16,24,40,.04)',...style}}>{children}</section>;
}
function Metric({icon:Icon,label,value,sub}){
  return <Box style={{padding:16,minHeight:112}}><div style={{display:'flex',gap:7,alignItems:'center',fontSize:12,fontWeight:800,color:'#737985'}}><Icon size={16}/>{label}</div><div style={{fontSize:26,fontWeight:900,marginTop:10}}>{value}</div>{sub&&<div style={{fontSize:12,color:'#90959d',marginTop:3}}>{sub}</div>}</Box>;
}
function NumInput({label,value,onChange,min=0,max=100,step=1,suffix=''}){
  return <label style={{display:'grid',gap:6,fontSize:12,fontWeight:800,color:'#666d78'}}>{label}<div style={{position:'relative'}}><input type="number" min={min} max={max} step={step} value={value ?? ''} onChange={e=>onChange(Number(e.target.value))} style={{width:'100%',boxSizing:'border-box',border:'1px solid #dfe3e8',borderRadius:11,padding:'10px 36px 10px 11px',fontWeight:800}}/>{suffix&&<span style={{position:'absolute',right:10,top:10,color:'#9297a0',fontWeight:700}}>{suffix}</span>}</div></label>;
}

export default function MatchingControlPage({access}){
  const canManage=!access||hasPermission(access,'matching.manage');
  const canDispatch=!access||hasPermission(access,'matching.dispatch');
  const [policy,setPolicy]=React.useState(null);
  const [presets,setPresets]=React.useState({});
  const [stats,setStats]=React.useState(null);
  const [queue,setQueue]=React.useState([]);
  const [selectedBookingId,setSelectedBookingId]=React.useState('');
  const [preview,setPreview]=React.useState(null);
  const [logs,setLogs]=React.useState({adminLogs:[],offers:[]});
  const [loading,setLoading]=React.useState(true);
  const [saving,setSaving]=React.useState(false);
  const [working,setWorking]=React.useState('');
  const [error,setError]=React.useState('');
  const [message,setMessage]=React.useState('');
  const [dispatchReason,setDispatchReason]=React.useState('Điều phối từ Admin');

  const load = React.useCallback(async()=>{
    setLoading(true); setError('');
    try{
      const [p,s,q,l]=await Promise.all([
        coreApiRequest('/api/v8/admin/matching/policy'),
        coreApiRequest('/api/v8/admin/matching/stats'),
        coreApiRequest('/api/v8/admin/matching/queue?limit=50'),
        coreApiRequest('/api/v8/admin/matching/logs?limit=60'),
      ]);
      setPolicy(p.policy); setPresets(p.presets||{}); setStats(s); setQueue(Array.isArray(q)?q:[]); setLogs(l||{adminLogs:[],offers:[]});
      setSelectedBookingId(current=>current && q.some(x=>x.id===current) ? current : (q[0]?.id||''));
    }catch(e){setError(e.message||String(e))}
    finally{setLoading(false)}
  },[]);

  React.useEffect(()=>{load()},[load]);

  const loadPreview=React.useCallback(async(id)=>{
    if(!id){setPreview(null);return}
    setWorking('preview');setError('');
    try{setPreview(await coreApiRequest(`/api/v8/admin/matching/candidates/${encodeURIComponent(id)}`))}
    catch(e){setPreview(null);setError(e.message||String(e))}
    finally{setWorking('')}
  },[]);

  React.useEffect(()=>{if(selectedBookingId)loadPreview(selectedBookingId)},[selectedBookingId,loadPreview]);

  function setNested(group,key,value){setPolicy(p=>({...p,[group]:{...(p?.[group]||{}),[key]:value},strategy:'CUSTOM'}))}
  function applyPreset(code){
    const preset=presets[code]; if(!preset)return;
    setPolicy(p=>({...p,strategy:code,weights:{...(preset.weights||p.weights)}}));
  }
  async function savePolicy(){
    setSaving(true);setError('');setMessage('');
    try{
      const result=await coreApiRequest('/api/v8/admin/matching/policy',{method:'PUT',body:JSON.stringify(policy)});
      setPolicy(result.policy);setMessage('Đã áp dụng chính sách Matching mới.');
      await load();
    }catch(e){setError(e.message||String(e))}
    finally{setSaving(false)}
  }
  async function dispatch(driverId=''){
    if(!selectedBookingId)return;
    const key=driverId||'algo';setWorking(key);setError('');setMessage('');
    try{
      if(driverId){
        await coreApiRequest(`/api/v69/admin/dispatch/bookings/${encodeURIComponent(selectedBookingId)}/send-to-driver`,{method:'POST',body:JSON.stringify({driverId,reason:dispatchReason})});
      }else{
        await coreApiRequest(`/api/v69/admin/dispatch/bookings/${encodeURIComponent(selectedBookingId)}/retry`,{method:'POST',body:JSON.stringify({reason:dispatchReason})});
      }
      setMessage(driverId?'Đã phát offer V6.9 trực tiếp cho tài xế.':'Đã phát lại booking bằng Dispatch Engine V6.9.');
      await load();
      if(selectedBookingId)await loadPreview(selectedBookingId).catch(()=>{});
    }catch(e){setError(e.message||String(e))}
    finally{setWorking('')}
  }
  async function cancelOffer(){
    if(!selectedBookingId)return;setWorking('cancel');setError('');setMessage('');
    try{await coreApiRequest(`/api/v69/admin/dispatch/bookings/${encodeURIComponent(selectedBookingId)}/cancel-offers`,{method:'POST',body:JSON.stringify({reason:'ADMIN_CANCELLED_FROM_MATCHING_CENTER'})});setMessage('Đã thu hồi offer V6.9 đang phát.');await load()}
    catch(e){setError(e.message||String(e))}finally{setWorking('')}
  }
  async function setPriority(driver,priority){
    setWorking(`priority-${driver.driverId}`);setError('');setMessage('');
    try{
      await coreApiRequest(`/api/v8/admin/matching/drivers/${encodeURIComponent(driver.driverId)}/priority`,{method:'POST',body:JSON.stringify({priority,minutes:priority===0?0:120,reason:priority===0?'Gỡ ưu tiên từ Admin':'Ưu tiên vận hành 2 giờ'})});
      setMessage(priority===0?'Đã gỡ ưu tiên tài xế.':`Đã đặt ưu tiên +${priority} trong 2 giờ.`);await loadPreview(selectedBookingId);
    }catch(e){setError(e.message||String(e))}finally{setWorking('')}
  }

  if(loading&&!policy)return <div style={{padding:30}}>Đang tải Matching Control Center...</div>;
  const weights=policy?.weights||{};const filters=policy?.filters||{};const fairness=policy?.fairness||{};const pointsPolicy=policy?.pointsPolicy||{blockBelow:0,warnBelow:20};
  const selectedBooking=queue.find(x=>x.id===selectedBookingId);
  const candidates=preview?.candidates||[];

  return <div>
    <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:15,flexWrap:'wrap',marginBottom:18}}>
      <div><div style={{fontSize:12,color:'#d71920',fontWeight:900,letterSpacing:'.08em'}}>V6.8 MATCHING CONTROL CENTER</div><h1 style={{fontSize:30,margin:'5px 0'}}>Matching & Phát đơn</h1><p style={{margin:0,color:'#747a84'}}>Điều chỉnh ưu tiên tài xế, xem điểm xếp hạng và can thiệp phát đơn theo thời gian thực.</p></div>
      <div style={{display:'flex',gap:8}}><button className="button" onClick={load}><RefreshCw size={16}/> Tải lại</button><button className="button button-primary" onClick={savePolicy} disabled={saving||!canManage}><Save size={16}/>{saving?'Đang lưu...':'Lưu & áp dụng'}</button></div>
    </div>
    {error&&<div style={{background:'#fff0f0',color:'#b42318',padding:13,borderRadius:13,marginBottom:12,fontWeight:700}}><AlertTriangle size={16} style={{verticalAlign:'middle',marginRight:7}}/>{error}</div>}
    {message&&<div style={{background:'#edf9f1',color:'#137a43',padding:13,borderRadius:13,marginBottom:12,fontWeight:700}}><CheckCircle2 size={16} style={{verticalAlign:'middle',marginRight:7}}/>{message}</div>}

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:10,marginBottom:16}}>
      <Metric icon={RadioTower} label="Auto Matching" value={policy?.autoDispatchEnabled?'ĐANG BẬT':'ĐANG TẮT'} sub={PRESET_LABELS[policy?.strategy]||policy?.strategy}/>
      <Metric icon={Users} label="Tài xế Online" value={stats?.onlineDrivers??0} sub={`${stats?.freshLocations??0} GPS còn mới`}/>
      <Metric icon={Activity} label="Chuyến đang tìm" value={stats?.searchingBookings??0} sub={`${stats?.activeOffers??0} offer đang phát`}/>
      <Metric icon={Gauge} label="Bán kính" value={`${Number(policy?.maxRadiusKm||0)} km`} sub={`GPS tối đa ${policy?.locationFreshSeconds||0}s`}/>
      <Metric icon={WalletCards} label="Điểm tài xế" value={`${stats?.negativePointDrivers??0} bị chặn`} sub={`${stats?.lowPointDrivers??0} tài xế sắp hết điểm`}/>
    </div>

    <DispatchRoundSimulator policy={policy} onPolicyChange={setPolicy} canManage={canManage}/>

    <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.05fr) minmax(360px,.95fr)',gap:14,alignItems:'start'}}>
      <div style={{display:'grid',gap:14}}>
        <Box>
          <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',marginBottom:14}}><div><h2 style={{margin:0,fontSize:19}}>Chiến lược ưu tiên</h2><p style={{margin:'4px 0 0',fontSize:12,color:'#858a93'}}>Trọng số được chuẩn hóa tự động, không bắt buộc tổng bằng 100.</p></div><label style={{display:'flex',gap:8,alignItems:'center',fontWeight:800}}><input type="checkbox" checked={Boolean(policy?.autoDispatchEnabled)} onChange={e=>setPolicy(p=>({...p,autoDispatchEnabled:e.target.checked}))}/> Tự động phát cuốc — không cần Admin</label></div>
          <div style={{display:'flex',gap:7,flexWrap:'wrap',marginBottom:16}}>{Object.keys(presets).map(code=><button key={code} type="button" className={policy?.strategy===code?'button button-primary':'button'} style={{padding:'8px 10px'}} onClick={()=>applyPreset(code)}>{PRESET_LABELS[code]||code}</button>)}</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10}}>
            <NumInput label="Khoảng cách" value={weights.distance} onChange={v=>setNested('weights','distance',v)} suffix="%"/><NumInput label="Đánh giá sao" value={weights.rating} onChange={v=>setNested('weights','rating',v)} suffix="%"/><NumInput label="Tỷ lệ nhận cuốc" value={weights.acceptance} onChange={v=>setNested('weights','acceptance',v)} suffix="%"/>
            <NumInput label="Ưu tiên ít cuốc" value={weights.lowTrips} onChange={v=>setNested('weights','lowTrips',v)} suffix="%"/><NumInput label="Thời gian chờ" value={weights.idleTime} onChange={v=>setNested('weights','idleTime',v)} suffix="%"/><NumInput label="Điểm tài xế" value={weights.driverPoints} onChange={v=>setNested('weights','driverPoints',v)} suffix="%"/>
          </div>
        </Box>
        <Box>
          <h2 style={{margin:'0 0 13px',fontSize:19}}>Điều kiện & phát đơn</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10}}><NumInput label="Bán kính tối đa" value={policy?.maxRadiusKm} onChange={v=>setPolicy(p=>({...p,maxRadiusKm:v}))} max={100} step={0.5} suffix="km"/><NumInput label="GPS còn mới" value={policy?.locationFreshSeconds} onChange={v=>setPolicy(p=>({...p,locationFreshSeconds:v}))} min={10} max={300} suffix="s"/><NumInput label="Thời gian nhận đơn" value={policy?.offerTimeoutSeconds} onChange={v=>setPolicy(p=>({...p,offerTimeoutSeconds:v}))} min={5} max={120} suffix="s"/><NumInput label="Thử lại sau" value={policy?.searchRetrySeconds} onChange={v=>setPolicy(p=>({...p,searchRetrySeconds:v}))} min={2} max={60} suffix="s"/></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,marginTop:10}}><NumInput label="Sao tối thiểu" value={filters.minRating} onChange={v=>setNested('filters','minRating',v)} min={0} max={5} step={0.1}/><NumInput label="Tỷ lệ nhận tối thiểu" value={filters.minAcceptanceRate} onChange={v=>setNested('filters','minAcceptanceRate',v)} suffix="%"/><NumInput label="Giới hạn cuốc gần đây" value={filters.maxTrips24h} onChange={v=>setNested('filters','maxTrips24h',v)} max={100}/><NumInput label="Cửa sổ ít cuốc" value={fairness.recentTripsWindowHours} onChange={v=>setNested('fairness','recentTripsWindowHours',v)} min={1} max={168} suffix="h"/></div>
          <div style={{marginTop:14,padding:13,border:'1px solid #ffe0e2',background:'#fff8f8',borderRadius:14}}>
            <div style={{fontWeight:900,marginBottom:8,display:'flex',alignItems:'center',gap:7}}><WalletCards size={17} color="#d71920"/> Điều kiện số dư điểm</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
              <NumInput label="Chặn phát cuốc khi dưới" value={pointsPolicy.blockBelow} onChange={v=>setNested('pointsPolicy','blockBelow',v)} min={0} max={1000000} suffix="điểm"/>
              <NumInput label="Cảnh báo nạp thêm khi ≤" value={pointsPolicy.warnBelow} onChange={v=>setNested('pointsPolicy','warnBelow',v)} min={0} max={1000000} suffix="điểm"/>
            </div>
            <div style={{fontSize:12,color:'#7b3b3f',marginTop:8}}>Mặc định: số dư âm sẽ không được phát cuốc; tài xế có ít điểm vẫn Online nhưng nhận cảnh báo nạp thêm.</div>
          </div>
          <label style={{display:'flex',gap:8,alignItems:'center',marginTop:13,fontWeight:800}}><input type="checkbox" checked={Boolean(policy?.allowNoGpsFallback)} onChange={e=>setPolicy(p=>({...p,allowNoGpsFallback:e.target.checked}))}/> Cho phép tự động phát cho tài xế không có GPS khi không còn ứng viên GPS</label>
        </Box>
      </div>

      <Box>
        <h2 style={{margin:'0 0 5px',fontSize:19}}>Hàng đợi & phát đơn</h2><p style={{fontSize:12,color:'#858a93',margin:'0 0 12px'}}>Chọn chuyến đang tìm hoặc NO_DRIVER để xem tài xế gần nhất và phát lại.</p>
        <select value={selectedBookingId} onChange={e=>setSelectedBookingId(e.target.value)} style={{width:'100%',padding:11,border:'1px solid #dfe3e8',borderRadius:11,fontWeight:700}}><option value="">Chọn chuyến...</option>{queue.map(b=><option key={b.id} value={b.id}>{b.code} · {b.status} · {b.pickup||'Điểm đón'}</option>)}</select>
        {selectedBooking&&<div style={{background:'#f7f8fa',borderRadius:13,padding:12,marginTop:10,fontSize:13}}><b>{selectedBooking.code}</b><span style={{marginLeft:8,fontSize:11,fontWeight:900,color:selectedBooking.status==='NO_DRIVER'?'#c62828':'#137a43'}}>{selectedBooking.status}</span><div style={{marginTop:4}}>● {selectedBooking.pickup||'—'}</div><div>→ {selectedBooking.destination||'—'}</div><div style={{marginTop:5,fontWeight:800}}>{money(selectedBooking.customerTotal)}</div></div>}
        {selectedBookingId&&<div style={{marginTop:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}><b>Tài xế gần điểm đón</b><span style={{fontSize:11,color:'#8b9098'}}>{candidates.length} ứng viên</span></div>
          <div style={{display:'grid',gap:7,maxHeight:260,overflowY:'auto'}}>
            {candidates.slice().sort((a,b)=>(a.distanceKm??999)-(b.distanceKm??999)).slice(0,6).map(c=><div key={`near-${c.driverId}`} style={{border:'1px solid #eceef1',borderRadius:12,padding:9,display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'center',background:c.pointsBlocked?'#fff2f2':'#fff'}}>
              <div><div style={{fontWeight:900}}>{c.fullName}</div><div style={{fontSize:11,color:'#7c828c'}}>{c.distanceKm==null?'Chưa có GPS':`${c.distanceKm.toFixed(2)} km`} · {Number(c.rating||0).toFixed(1)}★ · <b style={{color:c.pointsBlocked?'#c62828':c.pointsLow?'#a46600':'#137a43'}}>{c.pointBalance??0} điểm</b></div>{c.pointWarning&&<div style={{fontSize:10,color:c.pointsBlocked?'#c62828':'#9a6500',marginTop:2}}>{c.pointWarning}</div>}</div>
              <button className="button button-primary" style={{padding:'7px 9px'}} disabled={!canDispatch||c.pointsBlocked||working===c.driverId} onClick={()=>dispatch(c.driverId)}><Send size={13}/>{c.pointsBlocked?'Bị chặn':'Phát'}</button>
            </div>)}
            {!candidates.length&&<div style={{fontSize:12,color:'#8c9199'}}>Chưa có tài xế gần điểm đón. Kiểm tra GPS, Online, KYC và loại xe.</div>}
          </div>
        </div>}
        <label style={{display:'grid',gap:5,marginTop:10,fontSize:12,fontWeight:800,color:'#666'}}>Lý do can thiệp<input value={dispatchReason} onChange={e=>setDispatchReason(e.target.value)} style={{border:'1px solid #dfe3e8',borderRadius:10,padding:10}}/></label>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:10}}><button className="button button-primary" disabled={!canDispatch||!selectedBookingId||working==='algo'} onClick={()=>dispatch('')}><RotateCcw size={15}/>{working==='algo'?'Đang phát...':'Phát lại theo thuật toán'}</button><button className="button" disabled={!canDispatch||!selectedBookingId||working==='cancel'} onClick={cancelOffer}><Ban size={15}/> Thu hồi offer</button></div>
      </Box>
    </div>

    <Box style={{marginTop:14,padding:0,overflow:'hidden'}}>
      <div style={{padding:16,borderBottom:'1px solid #eceef1',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><h2 style={{margin:0,fontSize:19}}>Xếp hạng ứng viên</h2><p style={{margin:'4px 0 0',fontSize:12,color:'#858a93'}}>{preview?.booking?.code||'Chọn chuyến'} · {candidates.length} tài xế đủ điều kiện</p></div><button className="button" disabled={!selectedBookingId||working==='preview'} onClick={()=>loadPreview(selectedBookingId)}><RefreshCw size={15}/> Chấm điểm lại</button></div>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:1180}}><thead><tr style={{background:'#fafbfc',textAlign:'left'}}>{['#','Tài xế','Điểm xếp hạng','Khoảng cách','Sao','Nhận cuốc','Cuốc gần đây','Số dư điểm','Nguồn','Ưu tiên','Phát đơn'].map(h=><th key={h} style={{padding:'11px 12px',fontSize:12,color:'#737983'}}>{h}</th>)}</tr></thead><tbody>
        {candidates.map(c=><tr key={c.driverId} style={{borderTop:'1px solid #eff1f3'}}><td style={{padding:12,fontWeight:900}}>#{c.rank}</td><td style={{padding:12}}><b>{c.fullName}</b><div style={{fontSize:12,color:'#888'}}>{c.phone} · {c.plateNumber||'Chưa có biển số'}</div></td><td style={{padding:12}}><span style={{display:'inline-flex',alignItems:'center',gap:5,borderRadius:999,padding:'5px 9px',background:c.score>=80?'#e9f8ef':c.score>=60?'#fff5df':'#f3f4f6',color:c.score>=80?'#117a43':c.score>=60?'#9b6500':'#555',fontWeight:900}}><Trophy size={14}/>{c.score.toFixed(1)}</span><div style={{fontSize:10,color:'#999',marginTop:4}}>KC {c.breakdown?.distance??0} · Sao {c.breakdown?.rating??0} · Ít cuốc {c.breakdown?.lowTrips??0}</div></td><td style={{padding:12}}>{c.distanceKm==null?'—':`${c.distanceKm.toFixed(2)} km`}</td><td style={{padding:12}}><Star size={14} style={{verticalAlign:'-2px',marginRight:4}}/>{Number(c.rating||0).toFixed(2)}</td><td style={{padding:12}}>{pct(c.acceptanceRate)}</td><td style={{padding:12,fontWeight:800}}>{c.recentTrips}</td><td style={{padding:12,fontWeight:800}}><span style={{color:c.pointsBlocked?'#c62828':c.pointsLow?'#a46600':'#137a43'}}>{c.pointBalance??0}</span><div style={{fontSize:10,color:'#999'}}>Xếp hạng: {c.driverPoints}</div>{c.pointsBlocked&&<small style={{color:'#c62828',fontWeight:900}}>ÂM ĐIỂM · KHÔNG PHÁT</small>}{!c.pointsBlocked&&c.pointsLow&&<small style={{color:'#a46600',fontWeight:900}}>SẮP HẾT ĐIỂM</small>}</td><td style={{padding:12,fontSize:12}}>{c.source}</td><td style={{padding:12}}><div style={{display:'flex',gap:5}}><button className="button" style={{padding:'6px 8px'}} disabled={!canDispatch||working===`priority-${c.driverId}`} onClick={()=>setPriority(c,5)}>+5</button><button className="button" style={{padding:'6px 8px'}} disabled={!canDispatch||working===`priority-${c.driverId}`} onClick={()=>setPriority(c,0)}>Reset</button></div>{c.priority!==0&&<small style={{color:'#d71920',fontWeight:800}}>Đang +{c.priority}</small>}</td><td style={{padding:12}}><button className="button button-primary" style={{padding:'7px 10px'}} disabled={!canDispatch||c.pointsBlocked||working===c.driverId} onClick={()=>dispatch(c.driverId)}><Send size={14}/>{working===c.driverId?'Đang gửi...':'Phát đơn'}</button></td></tr>)}
        {!candidates.length&&<tr><td colSpan="11" style={{padding:32,textAlign:'center',color:'#8c9199'}}>Chưa có ứng viên. Kiểm tra Driver Online, GPS, KYC và phương tiện.</td></tr>}
      </tbody></table></div>
    </Box>

    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:14}}>
      <Box><h2 style={{fontSize:18,marginTop:0}}>Offer gần nhất</h2>{(logs.offers||[]).slice(0,12).map(x=><div key={x.id} style={{padding:'9px 0',borderTop:'1px solid #f0f1f3',display:'grid',gridTemplateColumns:'1fr auto',gap:8}}><div><b>{x.status} · {x.source||'AUTO'}</b><div style={{fontSize:11,color:'#888'}}>Booking {x.bookingId?.slice(-8)} · Driver {x.driverId?.slice(-8)} · score {x.score??'—'} · rank {x.rank??'—'}</div></div><small>{timeText(x.sentAt)}</small></div>)}</Box>
      <Box><h2 style={{fontSize:18,marginTop:0}}>Nhật ký Admin</h2>{(logs.adminLogs||[]).slice(0,12).map(x=><div key={x.id} style={{padding:'9px 0',borderTop:'1px solid #f0f1f3',display:'grid',gridTemplateColumns:'1fr auto',gap:8}}><div><b>{x.action}</b><div style={{fontSize:11,color:'#888'}}>{x.adminName||'Admin'} · {x.targetType} {x.targetId?.slice(-8)||''}</div></div><small>{timeText(x.createdAt)}</small></div>)}</Box>
    </div>
  </div>;
}
