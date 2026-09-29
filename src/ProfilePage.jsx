import React from 'react';
import {
  UserRoundCheck,
  Save,
  KeyRound,
  ShieldCheck,
  Mail,
  Phone,
  BadgeCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { adminApiRequest } from './adminApi.js';

function initials(name=''){
  const words=String(name).trim().split(/\s+/).filter(Boolean);
  if(!words.length) return 'AD';
  return words.slice(-2).map(x=>x[0]).join('').toUpperCase();
}

function roleText(access){
  const names=Array.isArray(access?.roleNames)?access.roleNames:[];
  return names.length?names.join(', '):'Quản trị viên';
}

export default function ProfilePage({access,onAccessChanged,onLogout}){
  const [profile,setProfile]=React.useState(null);
  const [form,setForm]=React.useState({fullName:'',phone:'',email:''});
  const [password,setPassword]=React.useState({currentPassword:'',newPassword:'',confirmPassword:''});
  const [loading,setLoading]=React.useState(true);
  const [saving,setSaving]=React.useState(false);
  const [changingPassword,setChangingPassword]=React.useState(false);
  const [error,setError]=React.useState('');
  const [success,setSuccess]=React.useState('');
  const [passwordError,setPasswordError]=React.useState('');

  const load=React.useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const result=await adminApiRequest('/admin-profile');
      const user=result?.user||{};
      setProfile(user);
      setForm({fullName:user.fullName||'',phone:user.phone||'',email:user.email||''});
    }catch(err){setError(err.message)}finally{setLoading(false)}
  },[]);

  React.useEffect(()=>{load()},[load]);

  async function saveProfile(e){
    e.preventDefault();setError('');setSuccess('');
    if(!form.fullName.trim()||!form.phone.trim()||!form.email.trim()){
      return setError('Vui lòng nhập đầy đủ họ tên, số điện thoại và email.');
    }
    setSaving(true);
    try{
      const result=await adminApiRequest('/admin-profile',{
        method:'PATCH',
        body:JSON.stringify({
          fullName:form.fullName.trim(),
          phone:form.phone.trim(),
          email:form.email.trim(),
        }),
      });
      setProfile(result.user);
      setForm({fullName:result.user.fullName||'',phone:result.user.phone||'',email:result.user.email||''});
      setSuccess('Đã cập nhật thông tin cá nhân trên MongoDB.');
      if(onAccessChanged){
        const me=await adminApiRequest('/admin-access/me');
        onAccessChanged(me);
      }
    }catch(err){setError(err.message)}finally{setSaving(false)}
  }

  async function changePassword(e){
    e.preventDefault();setPasswordError('');
    if(!password.currentPassword) return setPasswordError('Vui lòng nhập mật khẩu hiện tại.');
    if(password.newPassword.length<8) return setPasswordError('Mật khẩu mới phải có ít nhất 8 ký tự.');
    if(password.newPassword!==password.confirmPassword) return setPasswordError('Xác nhận mật khẩu mới không khớp.');
    if(password.currentPassword===password.newPassword) return setPasswordError('Mật khẩu mới phải khác mật khẩu hiện tại.');
    setChangingPassword(true);
    try{
      await adminApiRequest('/admin-profile/password',{
        method:'POST',
        body:JSON.stringify({currentPassword:password.currentPassword,newPassword:password.newPassword}),
      });
      setPassword({currentPassword:'',newPassword:'',confirmPassword:''});
      window.alert('Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.');
      onLogout?.();
    }catch(err){setPasswordError(err.message)}finally{setChangingPassword(false)}
  }

  if(loading) return <section className="card admin-access-loading">Đang tải thông tin tài khoản...</section>;

  const shown=profile||access?.user||{};
  return <>
    <header className="page-intro">
      <div><h1>Thông tin cá nhân</h1><p>Cập nhật thông tin của tài khoản đang đăng nhập và thay đổi mật khẩu bảo mật.</p></div>
      <div className="page-actions"><button type="button" className="button" onClick={load}><RefreshCw size={16}/> Làm mới</button></div>
    </header>

    {error&&<div className="admin-access-error"><AlertTriangle size={18}/><span>{error}</span></div>}
    {success&&<div className="profile-success"><CheckCircle2 size={18}/><span>{success}</span></div>}

    <section className="profile-page-grid">
      <aside className="card profile-summary-card">
        <div className="profile-summary-avatar">{initials(shown.fullName)}</div>
        <h2>{shown.fullName||'Quản trị viên'}</h2>
        <p>{roleText(access)}</p>
        <div className="profile-summary-list">
          <div><Mail size={17}/><span><small>Email</small><b>{shown.email||'—'}</b></span></div>
          <div><Phone size={17}/><span><small>Số điện thoại</small><b>{shown.phone||'—'}</b></span></div>
          <div><ShieldCheck size={17}/><span><small>Vai trò</small><b>{roleText(access)}</b></span></div>
          <div><BadgeCheck size={17}/><span><small>Trạng thái</small><b>{shown.status==='ACTIVE'?'Đang hoạt động':shown.status||'—'}</b></span></div>
        </div>
        <p className="profile-note">Vai trò và trạng thái tài khoản được quản lý tại mục <b>Phân quyền</b> và <b>Quản lý tài khoản</b>; người dùng không tự thay đổi tại đây.</p>
      </aside>

      <div className="profile-form-stack">
        <form className="card profile-edit-card" onSubmit={saveProfile}>
          <header className="profile-card-head"><span><UserRoundCheck size={20}/></span><div><h2>Thông tin tài khoản</h2><p>Các thay đổi được lưu trực tiếp vào MongoDB.</p></div></header>
          <div className="form-grid profile-form-grid">
            <label className="span-2">Họ và tên<input value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} autoComplete="name"/></label>
            <label>Số điện thoại<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} autoComplete="tel"/></label>
            <label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} autoComplete="email"/></label>
          </div>
          <footer className="profile-form-footer"><button className="button button-primary" disabled={saving}><Save size={16}/>{saving?'Đang lưu...':'Lưu thay đổi'}</button></footer>
        </form>

        <form className="card profile-password-card" onSubmit={changePassword}>
          <header className="profile-card-head"><span><KeyRound size={20}/></span><div><h2>Đổi mật khẩu</h2><p>Bắt buộc xác nhận đúng mật khẩu hiện tại trước khi đặt mật khẩu mới.</p></div></header>
          <div className="form-grid profile-form-grid">
            <label className="span-2">Mật khẩu hiện tại<input type="password" value={password.currentPassword} onChange={e=>setPassword({...password,currentPassword:e.target.value})} autoComplete="current-password"/></label>
            <label>Mật khẩu mới<input type="password" value={password.newPassword} onChange={e=>setPassword({...password,newPassword:e.target.value})} autoComplete="new-password" placeholder="Tối thiểu 8 ký tự"/></label>
            <label>Nhập lại mật khẩu mới<input type="password" value={password.confirmPassword} onChange={e=>setPassword({...password,confirmPassword:e.target.value})} autoComplete="new-password"/></label>
          </div>
          {passwordError&&<p className="form-error profile-password-error">{passwordError}</p>}
          <footer className="profile-form-footer"><button className="button button-primary" disabled={changingPassword}><KeyRound size={16}/>{changingPassword?'Đang đổi...':'Đổi mật khẩu'}</button></footer>
        </form>
      </div>
    </section>
  </>;
}
