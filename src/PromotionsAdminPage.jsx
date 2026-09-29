import React from 'react';
import { BadgePercent, Plus, RefreshCw, Save, Pencil, Power } from 'lucide-react';
import { coreApiRequest } from './coreApi.js';
import { REQUIRED_SERVICE_CODES, SERVICE_LABELS, formatVnd } from './servicePricingModel.js';

const initial = {
  code: '', name: '', status: 'ACTIVE', discountType: 'PERCENT', discountValue: 10,
  maxDiscount: 30000, minOrderAmount: 0, serviceCodes: ['BIKE'], totalUsageLimit: 0,
  perUserLimit: 1, newCustomerOnly: false, audienceType: 'ALL', targetUsers: [], targetUsersText: '', startAt: '', endAt: '',
};

function localInputDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

function toForm(row) {
  return {
    ...initial,
    ...row,
    code: row.code || '',
    serviceCodes: Array.isArray(row.serviceCodes) ? row.serviceCodes : [],
    startAt: localInputDate(row.startAt),
    endAt: localInputDate(row.endAt),
    audienceType: row.audienceType || 'ALL',
    targetUsers: Array.isArray(row.targetUserIds) ? row.targetUserIds.map(String) : [],
    targetUsersText: Array.isArray(row.targetUserIds) ? row.targetUserIds.map(String).join('\n') : '',
  };
}

export default function PromotionsAdminPage() {
  const [rows, setRows] = React.useState([]);
  const [form, setForm] = React.useState(initial);
  const [open, setOpen] = React.useState(false);
  const [editingCode, setEditingCode] = React.useState(null);
  const [error, setError] = React.useState('');
  const [saveError, setSaveError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await coreApiRequest('/api/v14/admin/promotions');
      setRows(data.promotions || []);
      setError('');
    } catch (e) { setError(e.message); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  function createNew() {
    setEditingCode(null);
    setForm(initial);
    setSaveError('');
    setOpen(true);
  }

  function edit(row) {
    setEditingCode(row.code);
    setForm(toForm(row));
    setSaveError('');
    setOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      const path = editingCode
        ? `/api/v14/admin/promotions/${encodeURIComponent(editingCode)}`
        : '/api/v14/admin/promotions';
      const payload = {
        ...form,
        targetUsers: form.audienceType === 'USERS'
          ? String(form.targetUsersText || '').split(/[\n,;]+/).map(x => x.trim()).filter(Boolean)
          : [],
      };
      delete payload.targetUsersText;
      await coreApiRequest(path, {
        method: editingCode ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      setOpen(false);
      setEditingCode(null);
      setForm(initial);
      await load();
    } catch (err) {
      setSaveError(err.message);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(row) {
    try {
      await coreApiRequest(`/api/v14/admin/promotions/${encodeURIComponent(row.code)}`, {
        method: 'PUT',
        body: JSON.stringify({ ...row, status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
      });
      await load();
    } catch (err) { setError(err.message); }
  }

  return <section className="v14-page">
    <header className="v14-page-head">
      <div>
        <span className="v14-eyebrow">PROMOTION ENGINE</span>
        <h1>Khuyến mãi & Mã giảm giá</h1>
        <p>Mã được Backend kiểm tra lại khi tạo booking; app không tự quyết định số tiền giảm.</p>
      </div>
      <div className="page-actions">
        <button className="button" onClick={load}><RefreshCw size={15}/>Làm mới</button>
        <button className="button button-primary" onClick={createNew}><Plus size={15}/>Tạo mã</button>
      </div>
    </header>
    {error && <div className="v73-alert">{error}</div>}
    <section className="card v14-panel">
      <div className="v14-table-wrap"><table>
        <thead><tr><th>Mã</th><th>Chương trình</th><th>Phạm vi</th><th>Giảm</th><th>Đơn tối thiểu</th><th>Dịch vụ</th><th>Giới hạn/User</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row._id || row.code}>
          <td><code>{row.code}</code></td><td><b>{row.name}</b></td>
          <td><b>{row.audienceType === 'USERS' ? `Riêng ${row.targetUserIds?.length || 0} User` : 'Toàn hệ thống'}</b></td>
          <td>{row.discountType === 'PERCENT' ? `${row.discountValue}% (tối đa ${formatVnd(row.maxDiscount)})` : formatVnd(row.discountValue)}</td>
          <td>{formatVnd(row.minOrderAmount)}</td>
          <td>{(row.serviceCodes || []).join(', ') || 'Tất cả'}</td>
          <td>{row.perUserLimit || '∞'}</td>
          <td><span className={`v14-status ${row.status === 'ACTIVE' ? 'success' : 'pending'}`}>{row.status}</span></td>
          <td><div className="page-actions">
            <button className="button" onClick={() => edit(row)}><Pencil size={14}/>Chỉnh sửa</button>
            <button className="button" onClick={() => toggleStatus(row)}><Power size={14}/>{row.status === 'ACTIVE' ? 'Tắt mã' : 'Bật mã'}</button>
          </div></td>
        </tr>)}</tbody>
      </table></div>
    </section>

    {open && <div className="v14-modal-backdrop" onMouseDown={() => setOpen(false)}>
      <form className="v14-modal wide" onMouseDown={e => e.stopPropagation()} onSubmit={save}>
        <header><div><h2>{editingCode ? 'Chỉnh sửa khuyến mãi' : 'Tạo mã khuyến mãi'}</h2><p>Thiết lập phạm vi áp dụng và giới hạn sử dụng.</p></div><button type="button" onClick={() => setOpen(false)}>×</button></header>
        <div className="v14-form-grid">
          <label>Mã<input required disabled={Boolean(editingCode)} value={form.code} onChange={e => setForm({...form, code:e.target.value.toUpperCase()})}/></label>
          <label>Tên<input required value={form.name} onChange={e => setForm({...form, name:e.target.value})}/></label>
          <label>Trạng thái<select value={form.status} onChange={e => setForm({...form, status:e.target.value})}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></label>
          <label>Kiểu giảm<select value={form.discountType} onChange={e => setForm({...form, discountType:e.target.value})}><option value="PERCENT">Phần trăm</option><option value="FIXED">Số tiền</option></select></label>
          <label>Giá trị<input type="number" min="0" value={form.discountValue} onChange={e => setForm({...form, discountValue:Number(e.target.value)})}/></label>
          <label>Giảm tối đa<input type="number" min="0" value={form.maxDiscount} onChange={e => setForm({...form, maxDiscount:Number(e.target.value)})}/></label>
          <label>Đơn tối thiểu<input type="number" min="0" value={form.minOrderAmount} onChange={e => setForm({...form, minOrderAmount:Number(e.target.value)})}/></label>
          <label>Lượt toàn hệ thống<input type="number" min="0" value={form.totalUsageLimit} onChange={e => setForm({...form, totalUsageLimit:Number(e.target.value)})}/></label>
          <label>Lượt mỗi User<input type="number" min="0" value={form.perUserLimit} onChange={e => setForm({...form, perUserLimit:Number(e.target.value)})}/></label>
          <label>Bắt đầu<input type="datetime-local" value={form.startAt} onChange={e => setForm({...form, startAt:e.target.value})}/></label>
          <label>Kết thúc<input type="datetime-local" value={form.endAt} onChange={e => setForm({...form, endAt:e.target.value})}/></label>
        </div>
        <div className="v163-audience-box">
          <label>Phạm vi cấp mã<select value={form.audienceType} onChange={e => setForm({...form,audienceType:e.target.value})}><option value="ALL">Toàn hệ thống</option><option value="USERS">Chỉ User được chọn</option></select></label>
          {form.audienceType === 'USERS' && <label>User ID hoặc số điện thoại<textarea rows="4" placeholder="Mỗi dòng 1 User ID hoặc SĐT" value={form.targetUsersText} onChange={e => setForm({...form,targetUsersText:e.target.value})}/><small>Có thể nhập nhiều User, cách nhau bằng xuống dòng, dấu phẩy hoặc dấu chấm phẩy.</small></label>}
        </div>
        <fieldset className="v14-service-checks"><legend>Dịch vụ áp dụng</legend>{REQUIRED_SERVICE_CODES.map(code => <label key={code}><input type="checkbox" checked={form.serviceCodes.includes(code)} onChange={e => setForm({...form, serviceCodes:e.target.checked ? [...new Set([...form.serviceCodes,code])] : form.serviceCodes.filter(x => x !== code)})}/>{SERVICE_LABELS[code]}</label>)}</fieldset>
        <label className="v14-check"><input type="checkbox" checked={form.newCustomerOnly} onChange={e => setForm({...form, newCustomerOnly:e.target.checked})}/>Chỉ khách hàng mới</label>
        {saveError && <div className="v73-alert">{saveError}</div>}
        <footer><button className="button button-primary" disabled={saving}><Save size={15}/>{saving ? 'Đang lưu...' : (editingCode ? 'Lưu thay đổi' : 'Lưu mã')}</button></footer>
      </form>
    </div>}
  </section>;
}
