import React from 'react';
import {
  UserPlus, UsersRound, ShieldCheck, Search, Pencil, LockKeyhole,
  UnlockKeyhole, KeyRound, Trash2, X, Plus, Save, CheckCircle2,
  AlertTriangle, RefreshCw
} from 'lucide-react';
import { adminApiRequest, hasPermission } from './adminApi.js';

const STATUS_LABELS={ACTIVE:'Đang hoạt động',BLOCKED:'Đã khóa',INACTIVE:'Ngừng hoạt động'};
const PERMISSION_GROUPS=[
  ['Tổng quan',[['dashboard.view','Xem tổng quan']]],
  ['Khách hàng',[['users.view','Xem khách hàng'],['users.update','Cập nhật khách hàng'],['users.block','Khóa khách hàng']]],
  ['Tài xế & KYC',[['drivers.view','Xem tài xế'],['drivers.review','Xem/kiểm tra hồ sơ'],['drivers.approve','Duyệt hồ sơ'],['drivers.suspend','Tạm ngưng tài xế'],['vehicles.view','Xem phương tiện'],['vehicles.review','Duyệt phương tiện']]],
  ['Chuyến xe',[['bookings.view','Xem chuyến xe'],['bookings.adjust','Điều chỉnh chuyến'],['bookings.cancel','Hủy chuyến']]],
  ['Matching & phát đơn',[['matching.view','Xem Matching Control Center'],['matching.manage','Chỉnh thuật toán matching'],['matching.dispatch','Phát/thu hồi đơn thủ công']]],
  ['Thông báo hệ thống',[['broadcast.view','Xem lịch sử thông báo'],['broadcast.send','Gửi thông báo xuống User/Driver']]],
  ['Trust & Safety',[['trust.view','Xem Trust & Safety'],['trust.review','Duyệt xác thực và fraud case'],['trust.manage','Quản lý rule Trust/Fraud']]],
  ['Giá cước',[['pricing.view','Xem bảng giá'],['pricing.create','Tạo bảng giá'],['pricing.activate','Kích hoạt bảng giá'],['pricing.archive','Lưu trữ bảng giá'],['fees.view','Xem phụ phí'],['fees.manage','Quản lý phụ phí']]],
  ['Khuyến mãi',[['promotions.view','Xem khuyến mãi'],['promotions.manage','Tạo/sửa/tắt khuyến mãi']]],
  ['Thanh toán',[['payments.view','Xem thanh toán'],['payments.refund','Hoàn/điều chỉnh thanh toán'],['wallets.view','Xem ví'],['wallets.adjust','Điều chỉnh ví'],['settlements.view','Xem đối soát'],['settlements.manage','Quản lý đối soát']]],
  ['CSKH',[['support.view','Xem hỗ trợ'],['support.assign','Phân công hỗ trợ'],['support.reply','Phản hồi khách hàng'],['support.close','Đóng yêu cầu']]],
  ['Cài đặt & báo cáo',[['settings.view','Xem cài đặt'],['settings.manage','Chỉnh cài đặt'],['reports.view','Xem báo cáo'],['audit.view','Xem nhật ký hệ thống']]],
  ['Quản trị nội bộ',[['admins.view','Xem tài khoản nội bộ'],['admins.manage','Tạo/sửa/khóa tài khoản'],['roles.manage','Phân quyền']]],
];

function initials(name=''){
  const words=String(name).trim().split(/\s+/).filter(Boolean);
  if(!words.length) return 'AD';
  return words.slice(-2).map(x=>x[0]).join('').toUpperCase();
}
function dateText(value){
  if(!value) return 'Chưa đăng nhập';
  const d=new Date(value);
  return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);
}
function statusClass(status){return status==='ACTIVE'?'active':'locked'}

function AccountModal({open,onClose,roles,account,onSaved}){
  const editing=Boolean(account?._id||account?.id);
  const [form,setForm]=React.useState({fullName:'',phone:'',email:'',password:'',roleCodes:[],status:'ACTIVE'});
  const [saving,setSaving]=React.useState(false);
  const [error,setError]=React.useState('');

  React.useEffect(()=>{
    if(!open)return;
    setError('');
    setForm({
      fullName:account?.fullName||'',
      phone:account?.phone||'',
      email:account?.email||'',
      password:'',
      roleCodes:Array.isArray(account?.roleCodes)?account.roleCodes:[],
      status:account?.status||'ACTIVE',
    });
  },[open,account]);
  if(!open)return null;

  const toggleRole=(code)=>setForm(f=>({...f,roleCodes:f.roleCodes.includes(code)?f.roleCodes.filter(x=>x!==code):[...f.roleCodes,code]}));
  async function submit(e){
    e.preventDefault();setError('');
    if(!form.fullName.trim()||!form.phone.trim()||!form.email.trim()) return setError('Vui lòng nhập họ tên, số điện thoại và email.');
    if(!form.roleCodes.length) return setError('Vui lòng chọn ít nhất một vai trò.');
    if(!editing && form.password.length<8) return setError('Mật khẩu phải có ít nhất 8 ký tự.');
    setSaving(true);
    try{
      const payload={fullName:form.fullName.trim(),phone:form.phone.trim(),email:form.email.trim(),roleCodes:form.roleCodes,status:form.status};
      if(!editing) payload.password=form.password;
      if(editing) await adminApiRequest(`/admin-management/accounts/${account._id||account.id}`,{method:'PATCH',body:JSON.stringify(payload)});
      else await adminApiRequest('/admin-management/accounts',{method:'POST',body:JSON.stringify(payload)});
      await onSaved();onClose();
    }catch(err){setError(err.message)}finally{setSaving(false)}
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={()=>!saving&&onClose()}>
    <section className="modal admin-account-modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}>
      <header><div><h2>{editing?'Sửa tài khoản nội bộ':'Tạo tài khoản nội bộ'}</h2><p>Tài khoản được lưu trong MongoDB và dùng đăng nhập TH79 iMove Admin.</p></div><button type="button" className="icon-button" onClick={onClose}><X size={18}/></button></header>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label>Họ và tên<input value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} placeholder="Nguyễn Văn A"/></label>
          <label>Số điện thoại<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="09xxxxxxxx"/></label>
          <label className="span-2">Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="admin@th79.vn"/></label>
          {!editing&&<label className="span-2">Mật khẩu ban đầu<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Tối thiểu 8 ký tự" autoComplete="new-password"/></label>}
          <label>Trạng thái<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="ACTIVE">Đang hoạt động</option><option value="BLOCKED">Đã khóa</option></select></label>
          <div className="span-2 admin-role-picker"><span className="field-label">Vai trò / nhóm quyền</span><div className="role-chip-grid">{roles.filter(r=>r.status==='ACTIVE').map(role=><label key={role.code} className={form.roleCodes.includes(role.code)?'role-chip selected':'role-chip'}><input type="checkbox" checked={form.roleCodes.includes(role.code)} onChange={()=>toggleRole(role.code)}/><span><b>{role.name}</b><small>{role.code}</small></span></label>)}</div></div>
        </div>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <footer><button type="button" className="button" disabled={saving} onClick={onClose}>Hủy</button><button className="button button-primary" disabled={saving}><Save size={16}/>{saving?'Đang lưu...':'Lưu tài khoản'}</button></footer>
      </form>
    </section>
  </div>
}

function ResetPasswordModal({account,onClose,onSaved}){
  const [password,setPassword]=React.useState('');const [confirm,setConfirm]=React.useState('');const [saving,setSaving]=React.useState(false);const [error,setError]=React.useState('');
  if(!account)return null;
  async function submit(e){e.preventDefault();setError('');if(password.length<8)return setError('Mật khẩu phải có ít nhất 8 ký tự.');if(password!==confirm)return setError('Mật khẩu xác nhận không khớp.');setSaving(true);try{await adminApiRequest(`/admin-management/accounts/${account._id||account.id}/reset-password`,{method:'POST',body:JSON.stringify({password})});await onSaved();onClose()}catch(err){setError(err.message)}finally{setSaving(false)}}
  return <div className="modal-backdrop" role="presentation" onMouseDown={()=>!saving&&onClose()}><section className="modal compact-modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}><header><div><h2>Đặt lại mật khẩu</h2><p>{account.fullName}</p></div><button type="button" className="icon-button" onClick={onClose}><X size={18}/></button></header><form onSubmit={submit}><div className="form-grid"><label className="span-2">Mật khẩu mới<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/></label><label className="span-2">Nhập lại mật khẩu<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password"/></label></div>{error&&<p className="form-error">{error}</p>}<footer><button type="button" className="button" onClick={onClose}>Hủy</button><button className="button button-primary" disabled={saving}><KeyRound size={16}/>{saving?'Đang lưu...':'Đổi mật khẩu'}</button></footer></form></section></div>
}

function RoleEditor({role,onClose,onSaved}){
  const isNew=!role?._id;
  const [form,setForm]=React.useState({code:'',name:'',status:'ACTIVE',permissions:[]});const [saving,setSaving]=React.useState(false);const [error,setError]=React.useState('');
  React.useEffect(()=>{setForm({code:role?.code||'',name:role?.name||'',status:role?.status||'ACTIVE',permissions:Array.isArray(role?.permissions)?role.permissions:[]});setError('')},[role]);
  const toggle=(p)=>setForm(f=>({...f,permissions:f.permissions.includes(p)?f.permissions.filter(x=>x!==p):[...f.permissions,p]}));
  const selectGroup=(items)=>{const codes=items.map(([p])=>p);const all=codes.every(p=>form.permissions.includes(p));setForm(f=>({...f,permissions:all?f.permissions.filter(p=>!codes.includes(p)):[...new Set([...f.permissions,...codes])]}))};
  async function submit(e){e.preventDefault();setError('');const code=form.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g,'_');if(!code||!form.name.trim())return setError('Vui lòng nhập mã vai trò và tên vai trò.');setSaving(true);try{const body=JSON.stringify({code,name:form.name.trim(),status:form.status,permissions:form.permissions});if(isNew)await adminApiRequest('/admin-management/roles',{method:'POST',body});else await adminApiRequest(`/admin-management/roles/${role._id||role.id}`,{method:'PATCH',body});await onSaved();onClose()}catch(err){setError(err.message)}finally{setSaving(false)}}
  return <div className="modal-backdrop" role="presentation" onMouseDown={()=>!saving&&onClose()}><section className="modal role-editor-modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}><header><div><h2>{isNew?'Tạo nhóm quyền':'Phân quyền: '+role.name}</h2><p>Chọn chính xác chức năng nhóm tài khoản này được phép sử dụng.</p></div><button type="button" className="icon-button" onClick={onClose}><X size={18}/></button></header><form onSubmit={submit}><div className="role-editor-meta"><label>Mã vai trò<input value={form.code} disabled={!isNew||form.code==='SUPER_ADMIN'} onChange={e=>setForm({...form,code:e.target.value})} placeholder="VD: BRANCH_MANAGER"/></label><label>Tên vai trò<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Trạng thái<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="ACTIVE">Đang sử dụng</option><option value="INACTIVE">Tạm ngưng</option></select></label></div><div className="permission-groups">{PERMISSION_GROUPS.map(([group,items])=><section className="permission-group" key={group}><header><b>{group}</b><button type="button" className="text-button" onClick={()=>selectGroup(items)}>Chọn/bỏ nhóm</button></header><div>{items.map(([code,label])=><label key={code} className={form.permissions.includes(code)?'permission-item checked':'permission-item'}><input type="checkbox" checked={form.permissions.includes(code)} disabled={form.code==='SUPER_ADMIN'} onChange={()=>toggle(code)}/><span><b>{label}</b><small>{code}</small></span></label>)}</div></section>)}</div>{error&&<p className="form-error">{error}</p>}<footer><button type="button" className="button" onClick={onClose}>Hủy</button><button className="button button-primary" disabled={saving}><Save size={16}/>{saving?'Đang lưu...':'Lưu phân quyền'}</button></footer></form></section></div>
}

export default function AdminAccess({mode='accounts',access,onAccessChanged}){
  const tab=mode==='roles'?'roles':'accounts';
  const [data,setData]=React.useState({accounts:[],roles:[]});
  const [loading,setLoading]=React.useState(true);const [error,setError]=React.useState('');const [query,setQuery]=React.useState('');
  const [accountModal,setAccountModal]=React.useState(null);const [resetAccount,setResetAccount]=React.useState(null);const [roleEditor,setRoleEditor]=React.useState(undefined);
  const canManage=hasPermission(access,'admins.manage');const canRoles=hasPermission(access,'roles.manage');

  const load=React.useCallback(async()=>{setLoading(true);setError('');try{const result=await adminApiRequest('/admin-management/bootstrap');setData({accounts:result.accounts||[],roles:result.roles||[]});if(onAccessChanged){const me=await adminApiRequest('/admin-access/me');onAccessChanged(me)}}catch(err){setError(err.message)}finally{setLoading(false)}},[onAccessChanged]);
  React.useEffect(()=>{load()},[load]);

  const roleName=(codes=[])=>codes.map(code=>data.roles.find(r=>r.code===code)?.name||code).join(', ')||'Chưa phân quyền';
  const filtered=data.accounts.filter(a=>`${a.fullName||''} ${a.phone||''} ${a.email||''}`.toLowerCase().includes(query.toLowerCase()));
  async function toggleAccount(a){try{await adminApiRequest(`/admin-management/accounts/${a._id||a.id}`,{method:'PATCH',body:JSON.stringify({status:a.status==='ACTIVE'?'BLOCKED':'ACTIVE'})});await load()}catch(err){window.alert(err.message)}}
  async function removeAccount(a){if(!window.confirm(`Xóa tài khoản nội bộ "${a.fullName}"?`))return;try{await adminApiRequest(`/admin-management/accounts/${a._id||a.id}`,{method:'DELETE'});await load()}catch(err){window.alert(err.message)}}
  async function removeRole(r){if(!window.confirm(`Xóa nhóm quyền "${r.name}"?`))return;try{await adminApiRequest(`/admin-management/roles/${r._id||r.id}`,{method:'DELETE'});await load()}catch(err){window.alert(err.message)}}

  const pageTitle=tab==='accounts'?'Quản lý tài khoản nội bộ':'Phân quyền';
  const pageDescription=tab==='accounts'
    ?'Tạo, cập nhật, khóa và quản lý các tài khoản nhân sự nội bộ dùng hệ thống TH79 iMove Admin.'
    :'Quản lý riêng các vai trò và quyền truy cập của tài khoản nội bộ.';

  return <>
    <header className="page-intro"><div><h1>{pageTitle}</h1><p>{pageDescription}</p></div><div className="page-actions"><button type="button" className="button" onClick={load}><RefreshCw size={16}/> Làm mới</button>{tab==='accounts'&&canManage&&<button type="button" className="button button-primary" onClick={()=>setAccountModal({})}><UserPlus size={16}/> Tạo tài khoản</button>}{tab==='roles'&&canRoles&&<button type="button" className="button button-primary" onClick={()=>setRoleEditor(null)}><Plus size={16}/> Tạo nhóm quyền</button>}</div></header>
    {error&&<div className="admin-access-error"><AlertTriangle size={18}/><span>{error}</span></div>}
    {loading?<section className="card admin-access-loading">Đang tải dữ liệu MongoDB...</section>:tab==='accounts'?<section className="card data-card admin-accounts-card"><header className="card-heading"><div><h2>Danh sách tài khoản</h2><p>{data.accounts.length} tài khoản ADMIN trong collection users</p></div><label className="search-field"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tên, SĐT, email..."/></label></header><div className="table-scroll"><table><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Đăng nhập gần nhất</th><th>Thao tác</th></tr></thead><tbody>{filtered.map(a=><tr key={a._id||a.id}><td><div className="person"><span className="person-avatar">{initials(a.fullName)}</span><span><b>{a.fullName}</b><small>{a.phone||'—'} · {a.email||'—'}</small></span></div></td><td><span className="admin-role-text">{roleName(a.roleCodes)}</span></td><td><span className={`status status-${statusClass(a.status)}`}>{STATUS_LABELS[a.status]||a.status}</span></td><td>{dateText(a.lastLoginAt)}</td><td><div className="row-actions">{canManage&&<><button type="button" className="icon-button" title="Sửa tài khoản" onClick={()=>setAccountModal(a)}><Pencil size={16}/></button><button type="button" className="icon-button" title="Đặt lại mật khẩu" onClick={()=>setResetAccount(a)}><KeyRound size={16}/></button><button type="button" className="icon-button" title={a.status==='ACTIVE'?'Khóa tài khoản':'Mở khóa'} onClick={()=>toggleAccount(a)}>{a.status==='ACTIVE'?<LockKeyhole size={16}/>:<UnlockKeyhole size={16}/>}</button><button type="button" className="icon-button danger" title="Xóa tài khoản" onClick={()=>removeAccount(a)}><Trash2 size={16}/></button></>}</div></td></tr>)}{!filtered.length&&<tr><td colSpan="5" className="empty-table">Không có tài khoản phù hợp.</td></tr>}</tbody></table></div></section>:<section className="role-grid">{data.roles.map(role=><article className="card role-card" key={role._id||role.code}><header><div className="role-icon"><ShieldCheck size={20}/></div><div><h2>{role.name}</h2><code>{role.code}</code></div><span className={`status status-${role.status==='ACTIVE'?'active':'locked'}`}>{role.status==='ACTIVE'?'Đang dùng':'Tạm ngưng'}</span></header><p>{role.permissions?.length||0} quyền được cấp</p><div className="role-permission-preview">{(role.permissions||[]).slice(0,6).map(p=><span key={p}><CheckCircle2 size={13}/>{p}</span>)}{(role.permissions?.length||0)>6&&<span>+{role.permissions.length-6} quyền</span>}</div>{canRoles&&<footer><button type="button" className="button button-small" onClick={()=>setRoleEditor(role)}><Pencil size={15}/> Chỉnh quyền</button>{role.code!=='SUPER_ADMIN'&&<button type="button" className="button button-small danger-outline" onClick={()=>removeRole(role)}><Trash2 size={15}/> Xóa</button>}</footer>}</article>)}</section>}
    <AccountModal open={accountModal!==null} account={accountModal&&accountModal._id?accountModal:null} roles={data.roles} onClose={()=>setAccountModal(null)} onSaved={load}/>
    <ResetPasswordModal account={resetAccount} onClose={()=>setResetAccount(null)} onSaved={load}/>
    {roleEditor!==undefined&&<RoleEditor role={roleEditor} onClose={()=>setRoleEditor(undefined)} onSaved={load}/>} 
  </>
}
