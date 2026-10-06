import React from 'react';
import {
  Activity,
  AlertTriangle,
  Car,
  CheckCircle2,
  CircleDollarSign,
  Headphones,
  RefreshCw,
  Route,
  Star,
  Users,
  WalletCards,
} from 'lucide-react';
import { coreApiRequest } from './coreApi.js';
import { hasPermission } from './adminApi.js';
import { money, normalizeServiceCode, paymentStatusGroup, isSameLocalDay } from './analyticsModel.js';
import { PageEmpty } from './AdminPageState.jsx';

const STATUS_LABEL = {
  COMPLETED: 'Hoàn thành',
  IN_PROGRESS: 'Đang chạy',
  DRIVER_ASSIGNED: 'Đã gán tài xế',
  SEARCHING: 'Đang tìm',
  CANCELLED: 'Đã hủy',
};

function Kpi({ icon: Icon, label, value, sub, tone = '' }) {
  return <article className={`enterprise-kpi ${tone}`}>
    <span className="enterprise-kpi-icon"><Icon size={20}/></span>
    <div><span>{label}</span><b>{value}</b>{sub && <small>{sub}</small>}</div>
  </article>;
}

function roleLabel(access) {
  const names = Array.isArray(access?.roleNames) ? access.roleNames.filter(Boolean) : [];
  return names.length ? names.join(' · ') : 'Quản trị viên';
}

export default function DashboardPage({ access }) {
  const [data, setData] = React.useState(null);
  const [live, setLive] = React.useState([]);
  const [support, setSupport] = React.useState(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState('');

  const canBookings = hasPermission(access, 'bookings.view');
  const canDrivers = hasPermission(access, 'drivers.view');
  const canUsers = hasPermission(access, 'users.view');
  const canReports = hasPermission(access, 'reports.view');
  const canPayments = hasPermission(access, 'payments.view');
  const canSettlement = hasPermission(access, 'settlements.view');
  const canSupport = hasPermission(access, 'support.view');
  const canPricing = hasPermission(access, 'pricing.view');

  const load = React.useCallback(async ({ silent = false } = {}) => {
    if (!silent) setRefreshing(true);
    if (!silent) setError('');

    const tasks = [];
    const needAnalytics = canReports || canPayments || canSettlement;

    // Analytics is relatively expensive. Load it on first/manual refresh only;
    // the 30-second silent poll is reserved for live/support data.
    if (needAnalytics && !silent) {
      tasks.push(
        coreApiRequest('/api/v14/admin/analytics?days=14', { timeoutMs: 120000 })
          .then((value) => ({ key: 'analytics', value }))
      );
    } else if (canBookings && (!needAnalytics || !data)) {
      tasks.push(
        coreApiRequest('/api/v7/admin/bookings?limit=80')
          .then((value) => ({ key: 'bookings', value }))
      );
    }

    if (canDrivers) {
      tasks.push(
        coreApiRequest('/api/v7/admin/drivers/live?limit=300')
          .then((value) => ({ key: 'live', value }))
      );
    }

    if (canSupport) {
      tasks.push(
        coreApiRequest('/api/admin-support/summary')
          .then((value) => ({ key: 'support', value }))
      );
    }

    if (!tasks.length) {
      if (!silent) setRefreshing(false);
      return;
    }

    const results = await Promise.allSettled(tasks);
    const failures = [];

    for (const item of results) {
      if (item.status === 'rejected') {
        failures.push(item.reason?.message || String(item.reason));
        continue;
      }
      if (item.value.key === 'analytics') setData(item.value.value || {});
      if (item.value.key === 'bookings') setData({ trips: Array.isArray(item.value.value) ? item.value.value : [] });
      if (item.value.key === 'live') setLive(Array.isArray(item.value.value) ? item.value.value : []);
      if (item.value.key === 'support') setSupport(item.value.value || {});
    }

    if (failures.length && !silent) setError(failures[0]);
    if (!silent) setRefreshing(false);
  }, [canBookings, canDrivers, canPayments, canReports, canSettlement, canSupport, data]);

  React.useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load({ silent: true });
    }, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const trips = data?.trips || [];
  const today = trips.filter((x) => isSameLocalDay(x.completedAt || x.createdAt));
  const completedToday = today.filter((x) => String(x.status).toUpperCase() === 'COMPLETED');
  const grossToday = completedToday.reduce((sum, x) => sum + Number(x.customerTotal || 0), 0);
  const todayPoints = completedToday.reduce((sum, x) => sum + Number(x.pointsAwarded || x.loyaltyPoints || 0), 0);
  const online = live.filter((x) => ['ONLINE', 'BUSY'].includes(String(x.onlineStatus || '').toUpperCase())).length;
  const k = data?.kpis || {};
  const days = data?.byDay || [];
  const max = Math.max(1, ...days.map((x) => Number(x.gross || 0)));
  const recent = [...trips].reverse().slice(0, 7);

  const cards = [];
  if (canBookings) cards.push(<Kpi key="trips" icon={Route} label="Tổng chuyến hôm nay" value={data ? today.length : '—'} sub={`${completedToday.length} hoàn thành`}/>);
  if (canDrivers) cards.push(<Kpi key="drivers" icon={Activity} label="Tài xế Online" value={live.length || data ? online : '—'} sub={`${live.length} bản ghi live`}/>);
  if (canPayments || canSettlement || canReports) cards.push(<Kpi key="revenue" icon={WalletCards} label="Doanh thu hôm nay" value={data ? money(grossToday) : '—'} sub="Chuyến COMPLETED"/>);
  if (canSettlement) cards.push(<Kpi key="settlement" icon={CircleDollarSign} label="Settlement backlog" value={data ? Number(k.settlementBacklog || 0) : '—'} tone={Number(k.settlementBacklog || 0) > 0 ? 'warn' : ''}/>);
  if (canDrivers) cards.push(<Kpi key="points" icon={Star} label="Điểm phát sinh hôm nay" value={data ? todayPoints : '—'} sub="Theo dữ liệu booking hiện có"/>);
  if (canSupport) cards.push(<Kpi key="support" icon={Headphones} label="Chat Support đang mở" value={support ? Number(support.open || 0) : '—'} sub={`${Number(support?.unread || 0)} tin chưa đọc`} tone={Number(support?.unread || 0) > 0 ? 'warn' : ''}/>);
  if (canUsers && cards.length < 5) cards.push(<Kpi key="users" icon={Users} label="Khách hàng" value="Được cấp quyền" sub="Theo vai trò tài khoản"/>);
  if (canPricing && cards.length < 5) cards.push(<Kpi key="pricing" icon={Star} label="Giá cước" value="Được cấp quyền" sub="Dịch vụ & chính sách"/>);
  if (!cards.length) cards.push(<Kpi key="default" icon={CheckCircle2} label="Hệ thống" value="Sẵn sàng" sub="Theo quyền tài khoản"/>);

  return <section className="enterprise-page dashboard-enterprise">
    <header className="enterprise-page-head dashboard-control-header">
      <div>
        <span className="enterprise-eyebrow">TH79 iMOVE · ROLE DASHBOARD</span>
        <h1>Tổng quan · {roleLabel(access)}</h1>
        <p>Chỉ hiển thị chỉ số phù hợp với quyền của tài khoản đang đăng nhập.</p>
      </div>
      <button type="button" className="button" onClick={() => load()} disabled={refreshing}>
        <RefreshCw className={refreshing ? 'spin' : ''} size={15}/>{refreshing ? 'Đang cập nhật...' : 'Làm mới'}
      </button>
    </header>

    {refreshing && !data && <div className="dashboard-quick-loading"><RefreshCw className="spin" size={15}/> Đang lấy dữ liệu phù hợp với vai trò...</div>}
    {error && <div className="v73-alert"><AlertTriangle size={15}/> {error} <button type="button" className="text-button" onClick={() => load()}>Thử lại</button></div>}

    <div className="enterprise-kpi-grid dashboard-kpi-strip">{cards}</div>

    {(canReports || canPayments || canSettlement) && <div className="enterprise-dashboard-grid">
      <section className="card enterprise-panel chart-panel">
        <header><div><h2>Doanh thu theo ngày</h2><p>14 ngày gần nhất</p></div><b>{data ? money(k.grossFare) : '—'}</b></header>
        {days.length ? <div className="enterprise-bars">{days.map((x) => <div className="enterprise-bar" key={x.date} title={`${x.date}: ${money(x.gross)}`}><span style={{ height: `${Math.max(5, Number(x.gross || 0) / max * 100)}%` }}></span><small>{String(x.date).slice(5)}</small></div>)}</div> : <PageEmpty title="Chưa có doanh thu" description="Chưa có chuyến hoàn thành trong kỳ báo cáo."/>}
      </section>
      <section className="card enterprise-panel">
        <header><div><h2>Cơ cấu dịch vụ</h2><p>Theo serviceCode chuẩn hóa</p></div><Car size={18}/></header>
        <div className="enterprise-service-list">{(data?.services || []).map((x) => <div key={x.serviceCode}><span><b>{x.serviceName || normalizeServiceCode(x)}</b><small>{x.completed || 0}/{x.trips || 0} chuyến hoàn thành</small></span><strong>{money(x.gross)}</strong></div>)}{!(data?.services || []).length && <PageEmpty/>}</div>
      </section>
    </div>}

    <div className="enterprise-dashboard-grid">
      {canBookings && <section className="card enterprise-panel">
        <header><div><h2>Chuyến gần đây</h2><p>Trạng thái từ Backend</p></div><Route size={18}/></header>
        <div className="enterprise-table-wrap"><table><thead><tr><th>Mã</th><th>Dịch vụ</th><th>Trạng thái</th><th>Khách trả</th></tr></thead><tbody>{recent.map((x) => <tr key={x.id}><td><code>{String(x.id).slice(-8)}</code></td><td>{normalizeServiceCode(x)}</td><td><span className={`v14-status ${String(x.status).toUpperCase() === 'COMPLETED' ? 'success' : 'pending'}`}>{STATUS_LABEL[String(x.status).toUpperCase()] || x.status || '—'}</span></td><td><b>{money(x.customerTotal)}</b></td></tr>)}</tbody></table></div>
        {!recent.length && !refreshing && <PageEmpty title="Chưa có chuyến"/>}
      </section>}

      {canSupport && <section className="card enterprise-panel">
        <header><div><h2>Chăm sóc khách hàng</h2><p>Khối lượng Chat Support</p></div><Headphones size={18}/></header>
        <div className="enterprise-mini-stats"><div><span>Đang mở</span><b>{support?.open ?? '—'}</b></div><div><span>Chưa đọc</span><b>{support?.unread ?? '—'}</b></div><div><span>Đã đóng</span><b>{support?.closed ?? '—'}</b></div><div><span>Tổng hội thoại</span><b>{support?.total ?? '—'}</b></div></div>
      </section>}

      {(canPayments || canSettlement) && <section className="card enterprise-panel">
        <header><div><h2>Thanh toán & đối soát</h2><p>Tổng hợp nhanh</p></div><CheckCircle2 size={18}/></header>
        <div className="enterprise-mini-stats"><div><span>PAID</span><b>{(data?.payments || []).filter((x) => paymentStatusGroup(x.status) === 'success').length}</b></div><div><span>Chuyến hoàn thành</span><b>{k.completed || 0}</b></div><div><span>Platform revenue</span><b>{money(k.platformRevenue)}</b></div><div><span>Driver net</span><b>{money(k.driverNet)}</b></div></div>
      </section>}

      {canDrivers && !canPayments && !canSettlement && !canSupport && <section className="card enterprise-panel">
        <header><div><h2>Hoạt động tài xế</h2><p>Dữ liệu GPS/online gần nhất</p></div><Activity size={18}/></header>
        <div className="enterprise-mini-stats"><div><span>Online</span><b>{online}</b></div><div><span>Tổng live</span><b>{live.length}</b></div><div><span>Điểm hôm nay</span><b>{todayPoints}</b></div><div><span>Chuyến hoàn thành</span><b>{completedToday.length}</b></div></div>
      </section>}
    </div>
  </section>;
}
