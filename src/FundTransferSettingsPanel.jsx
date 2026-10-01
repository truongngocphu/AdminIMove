
import React from 'react';
import { Banknote, CheckCircle2, Copy, Image, QrCode, RefreshCw, Save, Upload, XCircle } from 'lucide-react';
import { coreApiRequest } from './coreApi.js';
import { coreUrl } from './apiRuntime.js';

const money=(v)=>new Intl.NumberFormat('vi-VN').format(Number(v||0))+' ₫';
const date=(v)=>v?new Date(v).toLocaleString('vi-VN'):'—';

export default function FundTransferSettingsPanel(){
  const [bank,setBank]=React.useState({bankName:'',accountNumber:'',accountName:'',branch:'',qrImageUrl:''});
  const [minimumAmountVnd,setMinimumAmountVnd]=React.useState(50000);
  const [requests,setRequests]=React.useState([]);
  const [actorType,setActorType]=React.useState('ALL');
  const [busy,setBusy]=React.useState('');
  const [error,setError]=React.useState('');
  const [saved,setSaved]=React.useState('');

  const load=React.useCallback(async()=>{
    setError('');
    try{
      const [cfg,rows]=await Promise.all([
        coreApiRequest('/api/v171/admin/funds/config'),
        coreApiRequest(`/api/v171/admin/funds/requests?status=ALL&actorType=${actorType}`),
      ]);
      setBank({...bank,...(cfg?.bank||{})});
      setMinimumAmountVnd(Number(cfg?.minimumAmountVnd||50000));
      setRequests(Array.isArray(rows?.requests)?rows.requests:[]);
    }catch(e){setError(e.message||String(e))}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[actorType]);

  React.useEffect(()=>{load()},[load]);

  async function saveConfig(){
    setBusy('config');setSaved('');setError('');
    try{
      const data=await coreApiRequest('/api/v171/admin/funds/config',{
        method:'PUT',
        body:JSON.stringify({...bank,minimumAmountVnd:Number(minimumAmountVnd||50000)}),
      });
      setBank(data?.bank||bank);setSaved('Đã lưu cấu hình tài khoản nhận quỹ.');
    }catch(e){setError(e.message||String(e))}
    finally{setBusy('')}
  }

  async function uploadQr(file){
    if(!file)return;
    setBusy('qr');setError('');
    try{
      const fd=new FormData();fd.append('qr',file);
      const data=await coreApiRequest('/api/v171/admin/funds/config/qr',{method:'POST',body:fd});
      setBank(v=>({...v,qrImageUrl:data?.qrImageUrl||'/api/v171/funds/qr'}));
      setSaved('Đã cập nhật mã QR.');
    }catch(e){setError(e.message||String(e))}
    finally{setBusy('')}
  }

  async function act(row,action){
    setBusy(row.id);setError('');
    try{
      let body='{}';
      if(action==='reject'){
        const reason=window.prompt('Lý do từ chối:','Không đối chiếu được giao dịch chuyển khoản.');
        if(reason===null){setBusy('');return}
        body=JSON.stringify({reason});
      }
      await coreApiRequest(`/api/v171/admin/funds/requests/${row.id}/${action}`,{method:'POST',body});
      await load();
    }catch(e){setError(e.message||String(e))}
    finally{setBusy('')}
  }

  async function viewReceipt(row){
    const token=localStorage.getItem('imove_core_admin_access_token');
    if(!token||!row?.receiptUrl)return;
    const popup=window.open('','_blank');
    try{
      const response=await fetch(coreUrl(row.receiptUrl),{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
      if(!response.ok)throw new Error('Không mở được biên lai.');
      const blob=await response.blob();const url=URL.createObjectURL(blob);
      if(popup)popup.location.href=url;else window.open(url,'_blank','noopener,noreferrer');
      window.setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(e){if(popup)popup.close();setError(e.message||String(e))}
  }

  const qrSrc=bank.qrImageUrl?coreUrl(bank.qrImageUrl):'';

  return <section className="fund-transfer-console">
    <header className="fund-transfer-head">
      <div><span className="v14-eyebrow">QR FUNDING · DRIVER & MERCHANT</span><h2>QR nhận quỹ & duyệt biên lai</h2><p>Admin cấu hình một tài khoản/QR nhận tiền. App tự sinh nội dung chuyển khoản riêng theo Driver/Merchant để dễ đối soát.</p></div>
      <button className="button" onClick={load}><RefreshCw size={14}/>Làm mới</button>
    </header>
    {error&&<div className="v73-alert">{error}</div>}
    {saved&&<div className="broadcast-alert success">{saved}</div>}
    <div className="fund-transfer-grid">
      <article className="card fund-bank-card">
        <div className="fund-bank-title"><Banknote size={18}/><b>Tài khoản nhận quỹ</b></div>
        <div className="fund-bank-form">
          <label>Ngân hàng<input value={bank.bankName||''} onChange={e=>setBank({...bank,bankName:e.target.value})}/></label>
          <label>Số tài khoản<input value={bank.accountNumber||''} onChange={e=>setBank({...bank,accountNumber:e.target.value})}/></label>
          <label>Chủ tài khoản<input value={bank.accountName||''} onChange={e=>setBank({...bank,accountName:e.target.value})}/></label>
          <label>Chi nhánh<input value={bank.branch||''} onChange={e=>setBank({...bank,branch:e.target.value})}/></label>
          <label>Số tiền nạp tối thiểu<input type="number" min="10000" value={minimumAmountVnd} onChange={e=>setMinimumAmountVnd(e.target.value)}/></label>
          <label>URL QR ngoài (không bắt buộc)<input value={bank.qrImageUrl?.startsWith('/api/')?'':bank.qrImageUrl||''} onChange={e=>setBank({...bank,qrImageUrl:e.target.value})} placeholder="https://..."/></label>
        </div>
        <div className="page-actions"><button className="button button-primary" disabled={busy==='config'} onClick={saveConfig}><Save size={14}/>{busy==='config'?'Đang lưu...':'Lưu cấu hình'}</button><label className="button fund-upload-button"><Upload size={14}/>{busy==='qr'?'Đang tải...':'Tải ảnh QR'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={busy==='qr'} onChange={e=>uploadQr(e.target.files?.[0])}/></label></div>
      </article>
      <article className="card fund-qr-preview">
        <div className="fund-bank-title"><QrCode size={18}/><b>QR đang hiển thị trên app</b></div>
        {qrSrc?<img src={qrSrc} alt="QR nhận quỹ" onError={e=>{e.currentTarget.style.display='none'}}/>:<div className="fund-qr-empty"><QrCode size={42}/><span>Chưa có QR</span></div>}
        <small>Driver/Merchant vẫn thấy STK + nội dung CK ngay cả khi chưa cấu hình ảnh QR.</small>
      </article>
    </div>

    <section className="card fund-review-card">
      <header><div><h3>Yêu cầu nạp quỹ Driver & Merchant</h3><p>Biên lai do app gửi lên để Admin kiểm tra trước khi duyệt.</p></div><select value={actorType} onChange={e=>setActorType(e.target.value)}><option value="ALL">Tất cả</option><option value="DRIVER">Driver</option><option value="MERCHANT">Merchant</option></select></header>
      <div className="v14-table-wrap"><table><thead><tr><th>Đối tượng</th><th>Nội dung CK</th><th>Số tiền</th><th>Biên lai</th><th>Trạng thái</th><th>Thời gian</th><th>Thao tác</th></tr></thead><tbody>
        {requests.map(row=><tr key={row.id}>
          <td><b>{row.actorType==='MERCHANT'?'Merchant':'Driver'} · {row.actorSnapshot?.fullName||'—'}</b><small className="v14-subline">{row.actorSnapshot?.phone||''}</small></td>
          <td><code>{row.transferContent}</code><button className="driver-exp-link" onClick={()=>navigator.clipboard?.writeText(row.transferContent||'')}><Copy size={12}/> Sao chép</button></td>
          <td><b>{money(row.amountVnd)}</b>{row.points?<small className="v14-subline">{row.points} điểm dự kiến</small>:null}</td>
          <td>{row.receiptUploaded?<button className="button button-small" onClick={()=>viewReceipt(row)}><Image size={13}/>Xem bill</button>:<span className="v14-subline">Chưa upload</span>}</td>
          <td><span className={`v14-status ${row.status==='APPROVED'?'success':row.status==='REJECTED'?'failed':'pending'}`}>{row.status}</span></td>
          <td>{date(row.createdAt)}</td>
          <td>{['PENDING_REVIEW','WAITING_TRANSFER'].includes(row.status)?<div className="page-actions"><button className="button button-small" disabled={busy===row.id} onClick={()=>act(row,'reject')}><XCircle size={13}/>Từ chối</button><button className="button button-small button-primary" disabled={busy===row.id||!row.receiptUploaded} onClick={()=>act(row,'approve')}><CheckCircle2 size={13}/>Duyệt</button></div>:'—'}</td>
        </tr>)}
      </tbody></table>{!requests.length&&<div className="v14-empty">Chưa có yêu cầu nạp quỹ.</div>}</div>
    </section>
  </section>;
}
