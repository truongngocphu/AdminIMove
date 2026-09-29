import React from 'react';
import {
  History, RefreshCw, Search, UserRound, ShieldCheck, UserPlus, UserCog,
  UserX, KeyRound, Settings, Route, BadgeDollarSign, Trash2, Pencil,
  LockKeyhole, Eye, X, SlidersHorizontal, Clock3
} from 'lucide-react';
import { adminApiRequest } from './adminApi.js';

const ACTION_META = {
  ADMIN_ACCOUNT_CREATE: ['Tạo tài khoản nội bộ', 'create', UserPlus],
  ADMIN_ACCOUNT_UPDATE: ['Cập nhật tài khoản nội bộ', 'update', UserCog],
  ADMIN_ACCOUNT_DELETE: ['Xóa tài khoản nội bộ', 'delete', UserX],
  ADMIN_PASSWORD_RESET: ['Đặt lại mật khẩu tài khoản', 'security', KeyRound],
  ADMIN_PROFILE_UPDATE: ['Cập nhật thông tin cá nhân', 'update', UserRound],
  ADMIN_SELF_PASSWORD_CHANGE: ['Đổi mật khẩu cá nhân', 'security', KeyRound],
  ADMIN_ROLE_CREATE: ['Tạo nhóm quyền', 'create', ShieldCheck],
  ADMIN_ROLE_UPDATE: ['Cập nhật phân quyền', 'update', ShieldCheck],
  ADMIN_ROLE_DELETE: ['Xóa nhóm quyền', 'delete', ShieldCheck],
  CUSTOMER_UPDATE: ['Cập nhật khách hàng', 'update', Pencil],
  CUSTOMER_DELETE: ['Xóa khách hàng', 'delete', Trash2],
  BOOKING_STATUS_UPDATE: ['Đổi trạng thái chuyến xe', 'update', Route],
  SETTINGS_UPDATE: ['Cập nhật cài đặt hệ thống', 'update', Settings],
  ADMIN_DATA_SYNC: ['Cập nhật dữ liệu quản trị', 'update', Settings],
  FARE_CREATE: ['Tạo bảng giá', 'create', BadgeDollarSign],
  FARE_UPDATE: ['Cập nhật bảng giá', 'update', BadgeDollarSign],
  FARE_DELETE: ['Xóa bảng giá', 'delete', BadgeDollarSign],
  PLATFORM_FEE_CREATE: ['Tạo cấu hình phí nền tảng', 'create', BadgeDollarSign],
  PLATFORM_FEE_UPDATE: ['Cập nhật phí nền tảng', 'update', BadgeDollarSign],
  PLATFORM_FEE_DELETE: ['Xóa phí nền tảng', 'delete', BadgeDollarSign],
  SURCHARGE_CREATE: ['Tạo phụ phí', 'create', BadgeDollarSign],
  SURCHARGE_UPDATE: ['Cập nhật phụ phí', 'update', BadgeDollarSign],
  SURCHARGE_DELETE: ['Xóa phụ phí', 'delete', BadgeDollarSign],
};

const ENTITY_LABELS = {
  ADMIN_USER: 'Tài khoản nội bộ', ADMIN_ROLE: 'Nhóm quyền', CUSTOMER: 'Khách hàng',
  BOOKING: 'Chuyến xe', SETTINGS: 'Cài đặt', FARE_CONFIG: 'Bảng giá',
  PLATFORM_FEE: 'Phí nền tảng', SURCHARGE: 'Phụ phí', ADMIN_DATA: 'Dữ liệu quản trị'
};

function dateTime(value){
  if(!value) return '—';
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN',{
    day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'
  }).format(d);
}
function initials(name=''){
  const words=String(name).trim().split(/\s+/).filter(Boolean);
  return words.length ? words.slice(-2).map(x=>x[0]).join('').toUpperCase() : 'AD';
}
function actionMeta(action){
  return ACTION_META[action] || [String(action||'Thao tác hệ thống').replaceAll('_',' '),'neutral',History];
}
function entityName(row){
  const source = row?.after || row?.before || {};
  return source.fullName || source.name || source.code || source.bookingCode || source.id || row.entityId || '—';
}
function changedFields(row){
  const before=row?.before, after=row?.after;
  if(!before || !after || typeof before!=='object' || typeof after!=='object') return '';
  const ignored=new Set(['updatedAt','createdAt','lastLoginAt']);
  const keys=[...new Set([...Object.keys(before),...Object.keys(after)])]
    .filter(k=>!ignored.has(k) && JSON.stringify(before[k])!==JSON.stringify(after[k]));
  const labels={fullName:'họ tên',phone:'SĐT',email:'email',status:'trạng thái',roleCodes:'vai trò',adminRoleCodes:'vai trò',permissions:'quyền',name:'tên',code:'mã',onlineStatus:'online',baseFare:'giá mở cửa',minimumFare:'giá tối thiểu'};
  return keys.slice(0,4).map(k=>labels[k]||k).join(', ')+(keys.length>4?` +${keys.length-4}`:'');
}
function summary(row){
  const [label]=actionMeta(row.action);
  const name=entityName(row);
  const changed=changedFields(row);
  if(row.action==='ADMIN_ACCOUNT_CREATE') return `Đã tạo tài khoản ${name}.`;
  if(row.action==='ADMIN_ACCOUNT_DELETE') return `Đã xóa tài khoản ${name}.`;
  if(row.action==='ADMIN_PASSWORD_RESET') return `Đã đặt lại mật khẩu cho ${name}.`;
  if(row.action==='ADMIN_ROLE_CREATE') return `Đã tạo nhóm quyền ${name}.`;
  if(row.action==='ADMIN_ROLE_DELETE') return `Đã xóa nhóm quyền ${name}.`;
  if(row.action==='CUSTOMER_DELETE') return `Đã xóa khách hàng ${name}.`;
  if(row.action==='BOOKING_STATUS_UPDATE') return `Đã thay đổi trạng thái chuyến ${name}.`;
  if(changed) return `${label}: ${changed}.`;
  return `${label}${name && name!=='—' ? ` — ${name}` : ''}.`;
}

function DetailModal({row,onClose}){
  if(!row) return null;
  const [label,tone,Icon]=actionMeta(row.action);
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="modal audit-detail-modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}>
      <header><div><h2>Chi tiết thao tác</h2><p>Thông tin được ghi tự động vào MongoDB audit_logs.</p></div><button type="button" className="icon-button" onClick={onClose}><X size={18}/></button></header>
      <div className="audit-detail-body">
        <div className="audit-detail-summary">
          <span className={`audit-action-icon ${tone}`}><Icon size={18}/></span>
          <div><b>{label}</b><p>{summary(row)}</p></div>
        </div>
        <dl className="audit-detail-meta">
          <div><dt>Người thực hiện</dt><dd>{row.actor?.fullName||'Tài khoản không xác định'}</dd></div>
          <div><dt>Thời gian</dt><dd>{dateTime(row.createdAt)}</dd></div>
          <div><dt>Đối tượng</dt><dd>{ENTITY_LABELS[row.entityType]||row.entityType||'—'} · {entityName(row)}</dd></div>
          <div><dt>Địa chỉ IP</dt><dd>{row.ip||'—'}</dd></div>
        </dl>
        <div className="audit-snapshot-grid">
          <section><h3>Dữ liệu trước thao tác</h3><pre>{row.before ? JSON.stringify(row.before,null,2) : 'Không có dữ liệu trước thao tác.'}</pre></section>
          <section><h3>Dữ liệu sau thao tác</h3><pre>{row.after ? JSON.stringify(row.after,null,2) : 'Không có dữ liệu sau thao tác.'}</pre></section>
        </div>
      </div>
      <footer><button type="button" className="button button-primary" onClick={onClose}>Đóng</button></footer>
    </section>
  </div>;
}

export default function AuditLogPage(){
  const [rows,setRows]=React.useState([]);
  const [actors,setActors]=React.useState([]);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState('');
  const [selected,setSelected]=React.useState(null);
  const [filters,setFilters]=React.useState({q:'',actorId:'',action:'',from:'',to:''});

  const load=React.useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const params=new URLSearchParams({limit:'250'});
      if(filters.q.trim())params.set('q',filters.q.trim());
      if(filters.actorId)params.set('actorId',filters.actorId);
      if(filters.action)params.set('action',filters.action);
      if(filters.from)params.set('from',filters.from);
      if(filters.to)params.set('to',filters.to);
      const result=await adminApiRequest(`/admin-audit?${params.toString()}`);
      setRows(Array.isArray(result.logs)?result.logs:[]);
      setActors(Array.isArray(result.actors)?result.actors:[]);
    }catch(err){setError(err.message)}finally{setLoading(false)}
  },[filters]);

  React.useEffect(()=>{const id=setTimeout(load,180);return()=>clearTimeout(id)},[load]);
  const actions=[...new Set(rows.map(x=>x.action).filter(Boolean))].sort();

  return <div className="audit-page">
    <header className="page-intro"><div><h1>Lịch sử thao tác</h1><p>Theo dõi các thay đổi do tài khoản nội bộ thực hiện. Nhật ký được lưu trực tiếp trong MongoDB và chỉ người có quyền mới xem được.</p></div><div className="page-actions"><button type="button" className="button" onClick={load}><RefreshCw size={16}/> Làm mới</button></div></header>

    <section className="card audit-filter-card">
      <div className="audit-filter-title"><SlidersHorizontal size={18}/><div><b>Bộ lọc nhật ký</b><small>Tìm theo tài khoản, thao tác, đối tượng hoặc thời gian.</small></div></div>
      <div className="audit-filter-grid">
        <label className="audit-search"><Search size={16}/><input value={filters.q} onChange={e=>setFilters({...filters,q:e.target.value})} placeholder="Tên người thao tác, đối tượng, IP..."/></label>
        <select aria-label="Tài khoản thực hiện" value={filters.actorId} onChange={e=>setFilters({...filters,actorId:e.target.value})}><option value="">Tất cả tài khoản</option>{actors.map(a=><option value={a.id} key={a.id}>{a.fullName} {a.phone?`· ${a.phone}`:''}</option>)}</select>
        <select aria-label="Loại thao tác" value={filters.action} onChange={e=>setFilters({...filters,action:e.target.value})}><option value="">Tất cả thao tác</option>{actions.map(a=><option value={a} key={a}>{actionMeta(a)[0]}</option>)}</select>
        <label className="audit-date"><span>Từ ngày</span><input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/></label>
        <label className="audit-date"><span>Đến ngày</span><input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></label>
      </div>
    </section>

    {error&&<section className="card form-error">{error}</section>}
    <section className="card data-card audit-log-card">
      <header className="card-heading"><div><h2>Nhật ký hệ thống</h2><p>{loading?'Đang tải...':`${rows.length} thao tác gần nhất phù hợp bộ lọc`}</p></div><span className="audit-live-note"><span></span> MongoDB audit_logs</span></header>
      <div className="table-scroll"><table className="audit-table"><thead><tr><th>Thời gian</th><th>Tài khoản thực hiện</th><th>Thao tác</th><th>Đối tượng</th><th>Nội dung</th><th>IP</th><th></th></tr></thead>
        <tbody>{loading?<tr><td colSpan="7" className="empty-table">Đang tải lịch sử thao tác...</td></tr>:rows.map(row=>{
          const [label,tone,Icon]=actionMeta(row.action);
          return <tr key={row._id||row.id}><td><span className="audit-time"><Clock3 size={14}/>{dateTime(row.createdAt)}</span></td><td><div className="person compact"><span className="person-avatar">{initials(row.actor?.fullName)}</span><span><b>{row.actor?.fullName||'Không xác định'}</b><small>{row.actor?.phone||row.actor?.email||'Tài khoản cũ/đã xóa'}</small></span></div></td><td><span className={`audit-action ${tone}`}><Icon size={14}/>{label}</span></td><td><b className="audit-entity">{ENTITY_LABELS[row.entityType]||row.entityType||'—'}</b><small className="audit-entity-id">{entityName(row)}</small></td><td><span className="audit-summary">{summary(row)}</span></td><td><code className="audit-ip">{row.ip||'—'}</code></td><td><button type="button" className="icon-button" title="Xem chi tiết" onClick={()=>setSelected(row)}><Eye size={16}/></button></td></tr>
        })}{!loading&&!rows.length&&<tr><td colSpan="7" className="empty-table">Chưa có lịch sử thao tác phù hợp.</td></tr>}</tbody></table></div>
    </section>
    <DetailModal row={selected} onClose={()=>setSelected(null)}/>
  </div>;
}
