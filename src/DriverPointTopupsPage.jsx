import React from 'react';
import {
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  RefreshCw,
  XCircle,
  Banknote,
  Users,
  Search,
  Copy,
  Zap,
  Plus,
  Minus,
  X,
  Save,
  History,
} from 'lucide-react';
import { coreApiRequest } from './coreApi.js';
import FundTransferSettingsPanel from './FundTransferSettingsPanel.jsx';

const money=(v)=>new Intl.NumberFormat('vi-VN').format(Number(v||0))+' ₫';
const num=(v)=>new Intl.NumberFormat('vi-VN').format(Number(v||0));
const date=(v)=>v?new Date(v).toLocaleString('vi-VN'):'—';
const uuid=()=>globalThis.crypto?.randomUUID?.()||`admin-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function DriverPointTopupsPage(){
  const [status,setStatus]=React.useState('PENDING_REVIEW');
  const [keyword,setKeyword]=React.useState('');
  const [rows,setRows]=React.useState([]);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState('');
  const [busy,setBusy]=React.useState('');
  const [adjustOpen,setAdjustOpen]=React.useState(false);
  const [drivers,setDrivers]=React.useState([]);
  const [adjustments,setAdjustments]=React.useState([]);
  const [driverQuery,setDriverQuery]=React.useState('');
  const [adjustBusy,setAdjustBusy]=React.useState(false);
  const [adjustForm,setAdjustForm]=React.useState({driverId:'',direction:'CREDIT',points:'',reason:'',reference:''});

  const load=React.useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const params=new URLSearchParams();
      if(status&&status!=='ALL')params.set('status',status);
      if(keyword.trim())params.set('q',keyword.trim());
      const q=params.toString()?`?${params.toString()}`:'';
      const data=await coreApiRequest(`/api/v72/admin/driver-experience/point-topups${q}`);
      setRows(Array.isArray(data?.topups)?data.topups:[]);
    }catch(e){setError(e.message||String(e))}
    finally{setLoading(false)}
  },[status,keyword]);

  React.useEffect(()=>{
    const t=setTimeout(load,keyword.trim()?280:0);
    return()=>clearTimeout(t);
  },[load,keyword]);

  async function approve(row){
    const content=row.transferContent||row.transferCode;
    if(!window.confirm(`Đã kiểm tra tài khoản công ty và xác nhận nhận ${money(row.amountVnd)}?\n\nNội dung CK: ${content}`))return;
    setBusy(row.id);setError('');
    try{
      await coreApiRequest(`/api/v72/admin/driver-experience/point-topups/${row.id}/approve`,{method:'POST',body:'{}'});
      await load();
    }catch(e){setError(e.message||String(e))}
    finally{setBusy('')}
  }

  async function reject(row){
    const reason=window.prompt('Lý do từ chối yêu cầu nạp điểm:','Không tìm thấy giao dịch chuyển khoản phù hợp.');
    if(reason===null)return;
    setBusy(row.id);setError('');
    try{
      await coreApiRequest(`/api/v72/admin/driver-experience/point-topups/${row.id}/reject`,{method:'POST',body:JSON.stringify({reason})});
      await load();
    }catch(e){setError(e.message||String(e))}
    finally{setBusy('')}
  }

  async function copy(text){
    try{await navigator.clipboard.writeText(String(text||''))}catch(_){/* no-op */}
  }

  async function openAdjustment(){
    setAdjustOpen(true);setError('');setAdjustBusy(true);
    try{
      const [accounts,history]=await Promise.all([
        coreApiRequest('/api/v72/admin/driver-experience/point-accounts?limit=500'),
        coreApiRequest('/api/v72/admin/driver-experience/point-adjustments?limit=50'),
      ]);
      const list=Array.isArray(accounts?.drivers)?accounts.drivers:[];
      setDrivers(list);
      setAdjustments(Array.isArray(history?.adjustments)?history.adjustments:[]);
      setAdjustForm(v=>({...v,driverId:v.driverId||list[0]?.driverId||''}));
    }catch(e){setError(e.message||String(e))}
    finally{setAdjustBusy(false)}
  }

  async function saveAdjustment(e){
    e.preventDefault();setError('');
    const points=Math.trunc(Number(adjustForm.points||0));
    if(!adjustForm.driverId){setError('Vui lòng chọn tài xế.');return}
    if(!points){setError('Số điểm phải lớn hơn 0.');return}
    if(String(adjustForm.reason||'').trim().length<3){setError('Vui lòng nhập lý do điều chỉnh.');return}
    setAdjustBusy(true);
    try{
      const key=uuid();
      const result=await coreApiRequest('/api/v72/admin/driver-experience/point-adjustments',{
        method:'POST',
        headers:{'Idempotency-Key':key},
        body:JSON.stringify({...adjustForm,points:Math.abs(points),idempotencyKey:key}),
      });
      const accounts=await coreApiRequest('/api/v72/admin/driver-experience/point-accounts?limit=500');
      const history=await coreApiRequest('/api/v72/admin/driver-experience/point-adjustments?limit=50');
      setDrivers(Array.isArray(accounts?.drivers)?accounts.drivers:[]);
      setAdjustments(Array.isArray(history?.adjustments)?history.adjustments:[]);
      setAdjustForm(v=>({...v,points:'',reason:'',reference:''}));
      window.alert(`Đã ${adjustForm.direction==='DEBIT'?'trừ':'cộng'} điểm. Số dư mới: ${num(result?.balance||0)} điểm.`);
    }catch(e){setError(e.message||String(e))}
    finally{setAdjustBusy(false)}
  }

  const filteredDrivers=drivers.filter(d=>`${d.fullName||''} ${d.phone||''} ${d.driverId||''}`.toLowerCase().includes(driverQuery.trim().toLowerCase()));
  const selectedDriver=drivers.find(d=>d.driverId===adjustForm.driverId);
  const pointValue=Number(selectedDriver?.pointValueVnd||1000);
  const all=rows.length;
  const pending=rows.filter(x=>x.status==='PENDING_REVIEW').length;
  const approved=rows.filter(x=>x.status==='APPROVED');
  const points=approved.reduce((s,x)=>s+Number(x.points||0),0);

  return <section className="v14-page">
    <header className="v14-page-head">
      <div>
        <span className="v14-eyebrow">DRIVER POINTS · COMPANY FUND</span>
        <h1>Nạp & điều chỉnh điểm tài xế</h1>
        <p>Đối chiếu chuyển khoản và tạo giao dịch cộng/trừ điểm có kiểm soát, ghi audit log đầy đủ.</p>
      </div>
      <div className="page-actions">
        <button className="button button-primary" onClick={openAdjustment}><Plus size={15}/>Tạo giao dịch điểm</button>
        <label className="enterprise-search" style={{minWidth:280}}><Search size={15}/><input value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="Tên, SĐT, mã CK..."/></label>
        <select value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="PENDING_REVIEW">Chờ duyệt</option><option value="APPROVED">Đã duyệt</option><option value="AMOUNT_MISMATCH">Sai số tiền</option><option value="REJECTED">Đã từ chối</option><option value="ALL">Tất cả</option>
        </select>
        <button className="button" onClick={load}><RefreshCw size={15}/>Làm mới</button>
      </div>
    </header>

    {error&&<div className="v73-alert">{error}</div>}

    <FundTransferSettingsPanel/>

    <div className="v14-kpis">
      <article><Clock3/><span>Đang chờ</span><b>{pending}</b><small>Cần đối chiếu ngân hàng</small></article>
      <article><CheckCircle2/><span>Đã duyệt</span><b>{approved.length}</b><small>Đã cộng điểm</small></article>
      <article><BadgeDollarSign/><span>Điểm đã cộng</span><b>{num(points)}</b><small>Qua chuyển khoản</small></article>
      <article><Users/><span>Bản ghi đang xem</span><b>{all}</b><small>{status==='ALL'?'Tất cả trạng thái':status}</small></article>
    </div>

    <div className="v14-pricing-policy">
      <Banknote size={17}/><div><b>Tiền mặt không tạo ví rút tiền</b><span>Khách trả tiền mặt trực tiếp cho tài xế. Admin chỉ cộng/trừ quỹ điểm tài xế; phí nền tảng tiếp tục trừ từ điểm.</span></div>
    </div>

    <section className="card v14-panel"><div className="v14-table-wrap"><table>
      <thead><tr><th>Tài xế</th><th>Mã / Nội dung chuyển khoản</th><th>Số tiền</th><th>Điểm</th><th>Đối chiếu</th><th>Trạng thái</th><th>Thời gian</th><th>Thao tác</th></tr></thead>
      <tbody>{rows.map(row=>{const content=row.transferContent||row.transferCode||'';const automatic=row.confirmedVia==='BANK_WEBHOOK';return <tr key={row.id}>
        <td><b>{row.driver?.fullName||'Tài xế'}</b><small className="v14-subline">{row.driver?.phone||row.driverId}</small></td>
        <td><div style={{display:'grid',gap:5,minWidth:260}}><code>{row.transferCode}</code><span style={{fontSize:12,fontWeight:700}}>{content}</span><button className="button button-small" style={{justifySelf:'start'}} onClick={()=>copy(content)}><Copy size={12}/>Sao chép</button></div></td>
        <td><b>{money(row.amountVnd)}</b>{row.receivedAmountVnd!=null&&Number(row.receivedAmountVnd)!==Number(row.amountVnd)?<small className="v14-subline">Nhận: {money(row.receivedAmountVnd)}</small>:null}</td>
        <td>{num(row.points)} điểm</td>
        <td>{automatic?<span className="v14-status success"><Zap size={12}/>Tự động</span>:row.bankTransactionId?<code>{row.bankTransactionId}</code>:<span className="v14-subline">Thủ công</span>}</td>
        <td><span className={`v14-status ${row.status==='APPROVED'?'success':row.status==='REJECTED'||row.status==='AMOUNT_MISMATCH'?'failed':'pending'}`}>{row.status}</span></td>
        <td>{date(row.createdAt)}</td>
        <td>{row.status==='PENDING_REVIEW'||row.status==='AMOUNT_MISMATCH'?<div className="page-actions"><button className="button button-small" disabled={busy===row.id} onClick={()=>reject(row)}><XCircle size={13}/>Từ chối</button><button className="button button-small button-primary" disabled={busy===row.id} onClick={()=>approve(row)}><CheckCircle2 size={13}/>Duyệt</button></div>:'—'}</td>
      </tr>})}</tbody>
    </table>{!loading&&!rows.length&&<div className="v14-empty">Chưa có yêu cầu nạp điểm phù hợp.</div>}{loading&&<div className="v14-empty">Đang tải yêu cầu...</div>}</div></section>

    {adjustOpen&&<div className="modal-backdrop" role="presentation" onMouseDown={()=>!adjustBusy&&setAdjustOpen(false)}>
      <section className="modal driver-point-adjust-modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}>
        <header><div><h2>Tạo giao dịch điểm tài xế</h2><p>Cộng/trừ trực tiếp quỹ điểm, không thay đổi tiền mặt thu từ khách.</p></div><button type="button" className="icon-button" onClick={()=>!adjustBusy&&setAdjustOpen(false)}><X size={18}/></button></header>
        <form onSubmit={saveAdjustment}>
          <div className="form-grid">
            <label className="span-2">Tìm tài xế<input value={driverQuery} onChange={e=>setDriverQuery(e.target.value)} placeholder="Tên, SĐT hoặc Driver ID"/></label>
            <label className="span-2">Tài xế<select value={adjustForm.driverId} onChange={e=>setAdjustForm({...adjustForm,driverId:e.target.value})}>{filteredDrivers.map(d=><option key={d.driverId} value={d.driverId}>{d.fullName} · {d.phone} · {num(d.balance)} điểm</option>)}</select></label>
            <label>Loại giao dịch<select value={adjustForm.direction} onChange={e=>setAdjustForm({...adjustForm,direction:e.target.value})}><option value="CREDIT">Cộng điểm</option><option value="DEBIT">Trừ điểm</option></select></label>
            <label>Số điểm<input type="number" min="1" step="1" value={adjustForm.points} onChange={e=>setAdjustForm({...adjustForm,points:e.target.value})} placeholder="VD: 100"/></label>
            <label className="span-2">Lý do<input value={adjustForm.reason} onChange={e=>setAdjustForm({...adjustForm,reason:e.target.value})} placeholder="VD: Bổ sung điểm sau đối soát"/></label>
            <label className="span-2">Mã tham chiếu / ghi chú<input value={adjustForm.reference} onChange={e=>setAdjustForm({...adjustForm,reference:e.target.value})} placeholder="Không bắt buộc"/></label>
          </div>
          <div className="driver-point-adjust-summary">
            <span>Số dư hiện tại <b>{num(selectedDriver?.balance||0)} điểm</b></span>
            <span>Quy đổi tham chiếu <b>{money(Math.abs(Number(adjustForm.points||0))*pointValue)}</b></span>
            <span>Số dư dự kiến <b>{num(Number(selectedDriver?.balance||0)+(adjustForm.direction==='DEBIT'?-1:1)*Math.abs(Number(adjustForm.points||0)))} điểm</b></span>
          </div>
          <footer><button type="button" className="button" onClick={()=>setAdjustOpen(false)} disabled={adjustBusy}>Hủy</button><button className="button button-primary" disabled={adjustBusy}><Save size={15}/>{adjustBusy?'Đang ghi giao dịch...':'Xác nhận giao dịch'}</button></footer>
        </form>
        <section className="driver-point-adjust-history"><header><History size={15}/><b>Điều chỉnh gần nhất</b></header>{adjustments.slice(0,8).map(a=><div key={a.id}><span>{a.direction==='DEBIT'?<Minus size={13}/>:<Plus size={13}/>}<b>{a.points>0?'+':''}{num(a.points)} điểm</b></span><small>{a.reason||a.reference||'Điều chỉnh bởi Admin'} · {date(a.createdAt)}</small></div>)}</section>
      </section>
    </div>}
  </section>;
}
