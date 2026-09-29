import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Route, Search, Server, ShieldCheck, Users, WalletCards, X } from 'lucide-react';
import { coreApiRequest, getCoreConnection } from './coreApi.js';
import OperationsMap from './OperationsMap.jsx';

const money = value => new Intl.NumberFormat('vi-VN').format(Number(value || 0)) + ' ₫';
const when = value => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : new Intl.DateTimeFormat('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(d);
};
const statusLabel = status => ({
  SEARCHING:'Đang tìm tài xế', DRIVER_ASSIGNED:'Đã có tài xế', DRIVER_ARRIVING:'Tài xế đang đến', DRIVER_ARRIVED:'Đã đến điểm đón', IN_PROGRESS:'Đang chạy', COMPLETED:'Hoàn thành', CANCELLED:'Đã hủy', CANCELLED_BY_USER:'Khách hủy', CANCELLED_BY_DRIVER:'Tài xế hủy', EXPIRED:'Hết thời gian',
})[String(status||'').toUpperCase()] || status || '—';

function Metric({icon:Icon,label,value,sub}){
  return <div style={{background:'#fff',border:'1px solid #e8eaee',borderRadius:18,padding:18,minHeight:122,boxShadow:'0 10px 35px rgba(18,22,33,.05)'}}>
    <div style={{display:'flex',alignItems:'center',gap:8,color:'#6f7480',fontWeight:700,fontSize:13}}><Icon size={17}/>{label}</div>
    <div style={{fontSize:29,fontWeight:900,marginTop:13,letterSpacing:'-.7px'}}>{value}</div>
    {sub&&<div style={{color:'#8a8f98',fontSize:12,marginTop:4}}>{sub}</div>}
  </div>;
}

export default function CoreOperationsPage(){
  const [overview,setOverview]=React.useState(null);
  const [integrity,setIntegrity]=React.useState(null);
  const [connection,setConnection]=React.useState(null);
  const [trips,setTrips]=React.useState([]);
  const [liveDrivers,setLiveDrivers]=React.useState([]);
  const [query,setQuery]=React.useState('');
  const [status,setStatus]=React.useState('ALL');
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState('');
  const [selected,setSelected]=React.useState(null);
  const [detailLoading,setDetailLoading]=React.useState(false);

  const load = React.useCallback(async(refreshConnection=false)=>{
    setLoading(true); setError('');
    try{
      const c = await getCoreConnection(refreshConnection).catch(()=>null);
      const params = new URLSearchParams({limit:'100'});
      if(query.trim()) params.set('q',query.trim());
      if(status!=='ALL') params.set('status',status);
      const [o,i,b,d] = await Promise.all([
        coreApiRequest('/api/v7/admin/overview'),
        coreApiRequest('/api/v7/admin/integrity'),
        coreApiRequest(`/api/v7/admin/bookings?${params.toString()}`),
        coreApiRequest('/api/v7/admin/drivers/live?limit=200'),
      ]);
      setConnection(c); setOverview(o); setIntegrity(i); setTrips(Array.isArray(b)?b:[]); setLiveDrivers(Array.isArray(d)?d:[]);
    }catch(e){setError(e.message||String(e))}
    finally{setLoading(false)}
  },[query,status]);

  React.useEffect(()=>{load(false)},[load]);

  async function openTrip(row){
    setDetailLoading(true); setSelected({loading:true,row});
    try{
      const data=await coreApiRequest(`/api/v7/admin/bookings/${encodeURIComponent(row.id)}`);
      setSelected({loading:false,row,data});
    }catch(e){setSelected({loading:false,row,error:e.message})}
    finally{setDetailLoading(false)}
  }

  const issues=integrity?.issues||{};
  const issueTotal=Object.values(issues).reduce((sum,v)=>sum+Number(v||0),0);

  return <div>
    <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16,marginBottom:20,flexWrap:'wrap'}}>
      <div><p style={{margin:0,color:'#d71920',fontWeight:900,fontSize:12,letterSpacing:'.08em'}}>iMOVE 1.4.0 LIVE OPERATIONS</p><h1 style={{margin:'5px 0 3px',fontSize:30}}>Trung tâm vận hành realtime</h1><p style={{margin:0,color:'#7a7f89'}}>Đọc trực tiếp Core Backend, booking_events và ledger MongoDB.</p></div>
      <button className="button button-primary" onClick={()=>load(true)} disabled={loading}><RefreshCw size={16}/>{loading?'Đang đồng bộ...':'Đồng bộ Core'}</button>
    </div>

    {error&&<div style={{padding:14,borderRadius:14,background:'#fff0f0',color:'#b42318',marginBottom:16,fontWeight:700}}><AlertTriangle size={16} style={{verticalAlign:'middle',marginRight:7}}/>{error}</div>}

    <div style={{padding:14,borderRadius:16,background:'#fff',border:'1px solid #e8eaee',marginBottom:16,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
      <Server size={18}/><strong>Core:</strong><span>{connection?.baseUrl||'Đang xác định...'}</span><span style={{padding:'4px 9px',borderRadius:999,background:'#eef8f1',color:'#15803d',fontSize:12,fontWeight:800}}>{connection?.source||'AUTO'}</span>
      <span style={{marginLeft:'auto',display:'inline-flex',gap:6,alignItems:'center',fontWeight:800,color:integrity?.ok?'#15803d':'#b42318'}}>{integrity?.ok?<CheckCircle2 size={17}/>:<AlertTriangle size={17}/>} {integrity?.ok?'Dữ liệu toàn vẹn':`${issueTotal} cảnh báo dữ liệu`}</span>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:18}}>
      <Metric icon={Users} label="Khách hàng" value={overview?.customers??'—'} />
      <Metric icon={Activity} label="Tài xế online" value={`${overview?.onlineDrivers??'—'} / ${overview?.drivers??'—'}`} />
      <Metric icon={Route} label="Chuyến đang hoạt động" value={overview?.activeTrips??'—'} sub={`Hoàn thành hôm nay: ${overview?.completedToday??0}`} />
      <Metric icon={WalletCards} label="Doanh thu hôm nay" value={money(overview?.todayRevenue)} sub={`Hoa hồng: ${money(overview?.todayCommission)}`} />
      <Metric icon={ShieldCheck} label="Yêu cầu rút tiền" value={overview?.pendingWithdrawals??'—'} sub="Đang chờ xử lý" />
    </div>

    <OperationsMap drivers={liveDrivers} />

    <div style={{background:'#fff',border:'1px solid #e8eaee',borderRadius:20,overflow:'hidden'}}>
      <div style={{padding:16,borderBottom:'1px solid #edf0f3',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:'1 1 280px'}}><Search size={17} style={{position:'absolute',left:12,top:12,color:'#878c95'}}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load(false)} placeholder="Mã chuyến, điểm đón, điểm đến..." style={{width:'100%',padding:'11px 12px 11px 38px',border:'1px solid #dfe3e8',borderRadius:12}}/></div>
        <select value={status} onChange={e=>setStatus(e.target.value)} style={{padding:'11px 12px',border:'1px solid #dfe3e8',borderRadius:12}}><option value="ALL">Tất cả trạng thái</option><option value="SEARCHING">Đang tìm</option><option value="IN_PROGRESS">Đang chạy</option><option value="COMPLETED">Hoàn thành</option><option value="CANCELLED">Đã hủy</option></select>
        <button className="button" onClick={()=>load(false)}><Search size={15}/> Tìm</button>
      </div>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}><thead><tr style={{background:'#fafbfc',textAlign:'left'}}>{['Mã chuyến','Trạng thái','Điểm đón → Điểm đến','Khách trả','Tài xế nhận','Thanh toán','Thời gian'].map(x=><th key={x} style={{padding:'12px 14px',fontSize:12,color:'#777d87'}}>{x}</th>)}</tr></thead><tbody>
        {trips.map(row=><tr key={row.id} onClick={()=>openTrip(row)} style={{borderTop:'1px solid #f0f1f3',cursor:'pointer'}}><td style={{padding:14,fontWeight:900}}>{row.code}</td><td style={{padding:14}}>{statusLabel(row.status)}</td><td style={{padding:14,maxWidth:330}}><div style={{fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{row.pickup||'—'}</div><div style={{color:'#858a93',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>→ {row.destination||'—'}</div></td><td style={{padding:14,fontWeight:800}}>{money(row.customerTotal)}</td><td style={{padding:14,color:'#15803d',fontWeight:800}}>{money(row.driverNetAmount)}</td><td style={{padding:14}}>{row.paymentStatus||'—'}</td><td style={{padding:14,color:'#777d87'}}>{when(row.createdAt)}</td></tr>)}
        {!trips.length&&!loading&&<tr><td colSpan="7" style={{padding:40,textAlign:'center',color:'#8b9098'}}>Không có chuyến phù hợp.</td></tr>}
      </tbody></table></div>
    </div>

    {selected&&<div style={{position:'fixed',inset:0,background:'rgba(15,18,24,.55)',zIndex:1000,display:'flex',justifyContent:'flex-end'}} onMouseDown={e=>e.target===e.currentTarget&&setSelected(null)}>
      <div style={{width:'min(620px,100%)',height:'100%',background:'#f7f8fa',overflowY:'auto',padding:20,boxShadow:'-20px 0 60px rgba(0,0,0,.18)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}><button className="icon-button" onClick={()=>setSelected(null)}><X size={20}/></button><div><strong style={{fontSize:20}}>{selected.row.code}</strong><div style={{color:'#7c818b'}}>{statusLabel(selected.row.status)}</div></div></div>
        {(selected.loading||detailLoading)&&<div style={{padding:30,textAlign:'center'}}>Đang tải chi tiết...</div>}
        {selected.error&&<div style={{padding:14,background:'#fff0f0',color:'#b42318',borderRadius:14}}>{selected.error}</div>}
        {selected.data&&<>
          <section style={{background:'#fff',border:'1px solid #e8eaee',borderRadius:18,padding:16,marginBottom:12}}><h3 style={{marginTop:0}}>Thông tin chuyến</h3><p><b>Khách:</b> {selected.data.customer?.fullName||'—'} · {selected.data.customer?.phone||'—'}</p><p><b>Tài xế:</b> {selected.data.driver?.fullName||'—'} · {selected.data.driver?.phone||'—'}</p><p><b>Xe:</b> {[selected.data.vehicle?.brand,selected.data.vehicle?.model,selected.data.vehicle?.plateNumber].filter(Boolean).join(' · ')||'—'}</p></section>
          <section style={{background:'#fff',border:'1px solid #e8eaee',borderRadius:18,padding:16,marginBottom:12}}><h3 style={{marginTop:0}}>Timeline booking_events</h3>{(selected.data.events||[]).map(e=><div key={e.id} style={{display:'grid',gridTemplateColumns:'14px 1fr',gap:9,marginBottom:12}}><span style={{width:9,height:9,borderRadius:'50%',background:'#d71920',marginTop:5}}></span><div><b>{e.type}</b><div style={{fontSize:12,color:'#7f848c'}}>{when(e.createdAt)}</div></div></div>)}{!selected.data.events?.length&&<p style={{color:'#888'}}>Chưa có event.</p>}</section>
          <section style={{background:'#fff',border:'1px solid #e8eaee',borderRadius:18,padding:16}}><h3 style={{marginTop:0}}>Ledger tài chính</h3>{(selected.data.financials||[]).map(t=><div key={t.id} style={{display:'flex',justifyContent:'space-between',gap:12,borderBottom:'1px solid #f0f1f3',padding:'9px 0'}}><div><b>{t.title||t.type}</b><div style={{fontSize:12,color:'#888'}}>{when(t.createdAt)}</div></div><b style={{color:Number(t.amount)>=0?'#15803d':'#b42318'}}>{money(t.amount)}</b></div>)}{!selected.data.financials?.length&&<p style={{color:'#888'}}>Chưa có giao dịch ledger.</p>}</section>
        </>}
      </div>
    </div>}
  </div>;
}
