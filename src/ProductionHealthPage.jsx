import React from 'react';
import {
  Activity,
  Database,
  RadioTower,
  BellRing,
  Cable,
  ServerCog,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  WalletCards,
  Save,
  Smartphone,
  Gauge,
  ShieldAlert,
  Sparkles,
  LockKeyhole,
  Shield,
  ScanFace,
  SmartphoneNfc,
  Fingerprint,
  CheckCircle2,
  Clock3,
  Wrench,
} from 'lucide-react';
import { coreApiRequest } from './coreApi.js';

const money = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0)) + ' ₫';
const number = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));

const SECURITY_ITEMS = [
  ['enforceKyc', 'KYC & hồ sơ', ShieldCheck, 'Giữ bắt buộc hồ sơ tài xế được duyệt trước khi Online.'],
  ['requireFcm', 'FCM Push', BellRing, 'Yêu cầu token nhận cuốc và thông báo nền.'],
  ['requireTrustedDevice', 'Thiết bị tin cậy', SmartphoneNfc, 'Chỉ cho Online trên thiết bị đã đánh dấu trusted.'],
  ['requireIntegrity', 'Play Integrity', LockKeyhole, 'Bắt buộc xác minh tính toàn vẹn bản cài đặt app.'],
  ['requireFace', 'Xác thực khuôn mặt', ScanFace, 'Yêu cầu face/liveness trước khi Online theo chính sách.'],
  ['requireBiometric', 'Biometric Unlock', Fingerprint, 'Yêu cầu vân tay/Face ID khi mở ứng dụng tài xế.'],
  ['enforceRiskRestriction', 'Trust & Safety', ShieldAlert, 'Chặn Online khi risk score đạt ngưỡng hạn chế.'],
];

function ComponentCard({ name, icon: Icon, value }) {
  const ok = value?.ok === true;
  return (
    <div className={`v73-component ${ok ? 'ok' : 'bad'}`}>
      <span className="v73-component-icon"><Icon size={20} /></span>
      <div>
        <b>{name}</b>
        <small>{value?.status || 'UNKNOWN'}{value?.latencyMs != null ? ` · ${value.latencyMs} ms` : ''}</small>
      </div>
      <span className={`v73-dot ${ok ? 'ok' : 'bad'}`}></span>
    </div>
  );
}

function ModePill({ active, title, subtitle, onClick, icon: Icon, tone = 'default' }) {
  return (
    <button type="button" className={`security-mode-pill ${active ? 'active' : ''} ${tone}`} onClick={onClick}>
      <span className="security-mode-pill-icon"><Icon size={18} /></span>
      <span>
        <b>{title}</b>
        <small>{subtitle}</small>
      </span>
    </button>
  );
}

function SecurityToggle({ title, subtitle, icon: Icon, checked, disabled, onChange }) {
  return (
    <div className={`security-toggle-card ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}>
      <div className="security-toggle-card-head">
        <span className="security-toggle-card-icon"><Icon size={18} /></span>
        <label className="security-switch">
          <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
          <span />
        </label>
      </div>
      <b>{title}</b>
      <p>{subtitle}</p>
      <small>{checked ? 'Đang bật' : 'Đang tắt'}</small>
    </div>
  );
}

function cloneConfig(config) {
  return {
    ...config,
    driverRequirements: { ...(config?.driverRequirements || {}) },
    securityPolicy: { ...(config?.securityPolicy || {}) },
  };
}

function forceProductionPolicy(config) {
  const next = cloneConfig(config);
  next.securityMode = 'PRODUCTION';
  next.securityPolicy = {
    ...(next.securityPolicy || {}),
    enforceKyc: true,
    enforceRiskRestriction: true,
    requireFcm: true,
    requireTrustedDevice: true,
    requireIntegrity: true,
    requireFace: true,
    requireBiometric: true,
  };
  return next;
}

function enterTestMode(config) {
  const next = cloneConfig(config);
  next.securityMode = 'TEST';
  next.securityPolicyVersion = 2;
  next.securityPolicy = {
    ...(next.securityPolicy || {}),
    enforceKyc: true,
    enforceRiskRestriction: true,
    requireFcm: false,
    requireTrustedDevice: false,
    requireIntegrity: false,
    requireFace: false,
    requireBiometric: false,
  };
  return next;
}

export default function ProductionHealthPage() {
  const [health, setHealth] = React.useState(null);
  const [finance, setFinance] = React.useState(null);
  const [config, setConfig] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [h, f, c] = await Promise.all([
        coreApiRequest('/api/v73/admin/health'),
        coreApiRequest('/api/v73/admin/finance/summary'),
        coreApiRequest('/api/v73/admin/config'),
      ]);
      setHealth(h);
      setFinance(f);
      setConfig(c);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 15000);
    return () => clearInterval(timer);
  }, [load]);

  async function persistConfig(nextConfig) {
    setSaving(true);
    setError('');
    try {
      const payload = nextConfig?.securityMode === 'PRODUCTION' ? forceProductionPolicy(nextConfig) : nextConfig;
      const next = await coreApiRequest('/api/v73/admin/config', { method: 'PUT', body: JSON.stringify(payload) });
      setConfig(next);
      return next;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (!config) return;
    try { await persistConfig(config); } catch (_) {}
  }

  async function switchSecurityMode(mode) {
    if (!config || saving) return;
    const next = mode === 'TEST' ? enterTestMode(config) : forceProductionPolicy(config);
    setConfig(next);
    try { await persistConfig(next); } catch (_) { await load(); }
  }

  async function toggleSecurityFlag(key, checked) {
    if (!config || saving) return;
    const next = { ...config, securityPolicyVersion: 2, securityPolicy: { ...policy, [key]: checked } };
    setConfig(next);
    try { await persistConfig(next); } catch (_) { await load(); }
  }

  async function reconcile() {
    if (!window.confirm('Đối soát và tạo ledger cho các chuyến COMPLETED chưa được ghi nhận?')) return;
    try {
      const result = await coreApiRequest('/api/v73/admin/finance/reconcile', { method: 'POST', body: '{}' });
      window.alert(`Đã quét ${result.scanned || 0} chuyến. App settlement: ${result.appSettled || 0} hoàn tất, ${result.appPartial || 0} cần retry. Platform ledger: ${result.ledgerPosted || 0} đã đối soát.`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  const components = health?.components || {};
  const metrics = health?.metrics || {};
  const req = config?.driverRequirements || {};
  const policy = config?.securityPolicy || {};
  const securityMode = String(config?.securityMode || 'PRODUCTION').toUpperCase();
  const testMode = securityMode === 'TEST';
  const disabledByMode = !testMode;

  const blockingCount = SECURITY_ITEMS.reduce((count, [key]) => count + (policy[key] ? 1 : 0), 0);

  return (
    <section className="security-page">
      <header className="security-hero">
        <div>
          <span className="security-eyebrow">TH79 iMove 1.4.0</span>
          <h1>Security Test Mode Center</h1>
          <p>
            Quản lý Production Health, Security Test Mode và điều kiện cho tài xế Online từ một nguồn cấu hình duy nhất.
          </p>
        </div>
        <div className="page-actions">
          <button className="button" onClick={load} disabled={loading}><RefreshCw size={15} />{loading ? 'Đang tải' : 'Làm mới'}</button>
          <button className="button button-primary" onClick={save} disabled={saving || !config}><Save size={15} />{saving ? 'Đang lưu...' : 'Lưu cấu hình'}</button>
        </div>
      </header>

      {error && <div className="v73-alert"><AlertTriangle size={18} /><span>{error}</span></div>}

      <div className="security-summary-grid">
        <div className="security-summary-card primary">
          <div className="security-summary-head"><Shield size={18} /><span>Trạng thái bảo mật</span></div>
          <strong>{testMode ? 'TEST MODE' : 'PRODUCTION MODE'}</strong>
          <p>{testMode ? 'Admin có thể bật/tắt từng lớp xác thực để phục vụ kiểm thử.' : 'Toàn bộ lớp bảo mật tiền điều kiện Online đang được cưỡng chế đầy đủ.'}</p>
          <div className="security-badge-row">
            <span className={`status ${testMode ? 'status-pending' : 'status-active'}`}>{testMode ? 'KIỂM THỬ' : 'PRODUCTION'}</span>
            <span className="security-mini-chip">{blockingCount}/7 lớp đang bật</span>
          </div>
        </div>
        <div className="security-summary-card">
          <div className="security-summary-head"><Smartphone size={18} /><span>Driver / GPS</span></div>
          <strong>{number(metrics.freshGps)} / {number(metrics.onlineDrivers)}</strong>
          <p>GPS fresh / Driver online-busy</p>
          <small>Tài xế có GPS tươi mới và phiên hoạt động thật.</small>
        </div>
        <div className="security-summary-card">
          <div className="security-summary-head"><Activity size={18} /><span>API latency TB</span></div>
          <strong>{Number(metrics.avgLatencyMs || 0).toFixed(1)} ms</strong>
          <p>Max {Number(metrics.maxLatencyMs || 0).toFixed(1)} ms · {number(metrics.requests)} request</p>
          <small>{number(metrics.errors)} lỗi 5xx kể từ lúc backend khởi động.</small>
        </div>
        <div className="security-summary-card">
          <div className="security-summary-head"><WalletCards size={18} /><span>Đối soát tài chính</span></div>
          <strong>{number(finance?.unsettledBookings)}</strong>
          <p>Chuyến COMPLETED chưa POST ledger</p>
          <small>Platform Revenue {money(finance?.ledger?.PLATFORM_REVENUE?.amount)}</small>
        </div>
      </div>

      <div className="v73-health-banner">
        <div>
          <span className={`v73-health-orb ${health?.ok ? 'ok' : 'bad'}`}><ShieldCheck size={26} /></span>
          <div>
            <b>{health?.ok ? 'Hệ thống sẵn sàng' : 'Cần xử lý trước khi production'}</b>
            <small>Backend {health?.version || '1.4.0'} · {health?.environment || '—'} · uptime {number(health?.uptimeSeconds)} giây</small>
          </div>
        </div>
        <span className={`status ${health?.ok ? 'status-active' : 'status-cancelled'}`}>{health?.ok ? 'READY' : 'ATTENTION'}</span>
      </div>

      <div className="v73-components">
        <ComponentCard name="Core API" icon={ServerCog} value={components.api} />
        <ComponentCard name="MongoDB" icon={Database} value={components.mongodb} />
        <ComponentCard name="Redis" icon={Cable} value={components.redis} />
        <ComponentCard name="FCM" icon={BellRing} value={components.fcm} />
        <ComponentCard name="Matching" icon={Gauge} value={components.matching} />
        <ComponentCard name="Dispatch" icon={RadioTower} value={components.dispatch} />
        <ComponentCard name="Socket.IO" icon={Activity} value={components.socket} />
      </div>

      <div className="security-layout-grid">
        <section className="card v73-panel security-panel-wide">
          <header className="card-heading security-heading">
            <div>
              <h2>Security Test Mode</h2>
              <p>Chỉ một nguồn cấu hình cho Driver Online: MongoDB app_settings → Backend → Admin → Driver.</p>
            </div>
            <Sparkles size={18} />
          </header>

          <div className="security-mode-strip">
            <ModePill
              active={!testMode}
              title="Production Mode"
              subtitle="Khóa toàn bộ lớp bảo mật chuẩn production"
              icon={ShieldCheck}
              tone="success"
              onClick={() => switchSecurityMode('PRODUCTION')}
            />
            <ModePill
              active={testMode}
              title="Test Mode"
              subtitle="Cho phép Admin nới lỏng xác thực để test"
              icon={ShieldAlert}
              tone="warning"
              onClick={() => switchSecurityMode('TEST')}
            />
          </div>

          <div className={`security-mode-banner ${testMode ? 'test' : 'production'}`}>
            <div>
              <b>{testMode ? 'Đang ở chế độ kiểm thử' : 'Đang ở chế độ production'}</b>
              <p>{testMode ? 'Trong Test Mode, chỉ các công tắc bên dưới mới quyết định Driver có bị chặn Online hay không.' : 'Các lớp bảo mật cốt lõi luôn bật. Muốn nới lỏng để test, hãy chuyển sang Test Mode.'}</p>
            </div>
            {testMode ? <Clock3 size={18} /> : <CheckCircle2 size={18} />}
          </div>

          <div className="security-toggle-grid">
            {SECURITY_ITEMS.map(([key, label, Icon, description]) => (
              <SecurityToggle
                key={key}
                title={label}
                subtitle={description}
                icon={Icon}
                checked={!!policy[key]}
                disabled={disabledByMode}
                onChange={(e) => toggleSecurityFlag(key, e.target.checked)}
              />
            ))}
          </div>
        </section>

        <section className="card v73-panel">
          <header className="card-heading security-heading">
            <div>
              <h2>Maintenance & Version Gate</h2>
              <p>Điều khiển splash gate cho User/Driver.</p>
            </div>
            <Wrench size={18} />
          </header>
          {config && <div className="v73-form">
            <label className="v73-toggle"><input type="checkbox" checked={!!config.maintenanceMode} onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })} /><span></span><div><b>Maintenance Mode</b><small>Chặn User/Driver ngay từ Splash khi hệ thống bảo trì.</small></div></label>
            <label className="v73-toggle"><input type="checkbox" checked={!!config.forceUpdateEnabled} onChange={(e) => setConfig({ ...config, forceUpdateEnabled: e.target.checked })} /><span></span><div><b>Force Update</b><small>Buộc app thấp hơn minimum version phải cập nhật.</small></div></label>
            <div className="v73-fields"><label>User tối thiểu<input value={config.minUserVersion || ''} onChange={(e) => setConfig({ ...config, minUserVersion: e.target.value })} /></label><label>Driver tối thiểu<input value={config.minDriverVersion || ''} onChange={(e) => setConfig({ ...config, minDriverVersion: e.target.value })} /></label></div>
            <div className="v73-fields"><label>User mới nhất<input value={config.latestUserVersion || ''} onChange={(e) => setConfig({ ...config, latestUserVersion: e.target.value })} /></label><label>Driver mới nhất<input value={config.latestDriverVersion || ''} onChange={(e) => setConfig({ ...config, latestDriverVersion: e.target.value })} /></label></div>
            <label className="v73-full">Thông báo bảo trì<textarea value={config.maintenanceMessage || ''} onChange={(e) => setConfig({ ...config, maintenanceMessage: e.target.value })} /></label>
          </div>}
        </section>

        <section className="card v73-panel">
          <header className="card-heading security-heading">
            <div>
              <h2>Realtime Freshness</h2>
              <p>Hai điều kiện nền vẫn nên giữ kể cả khi đang test.</p>
            </div>
            <RadioTower size={18} />
          </header>
          {config && <div className="v73-form">
            <div className="v73-fields"><label>GPS fresh (giây)<input type="number" min="15" value={req.gpsFreshSeconds || 60} onChange={(e) => setConfig({ ...config, driverRequirements: { ...req, gpsFreshSeconds: Number(e.target.value) } })} /></label><label>Heartbeat fresh (giây)<input type="number" min="15" value={req.heartbeatFreshSeconds || 60} onChange={(e) => setConfig({ ...config, driverRequirements: { ...req, heartbeatFreshSeconds: Number(e.target.value) } })} /></label></div>
            <div className="security-help-box">
              <Smartphone size={16} />
              <div>
                <b>Khuyến nghị</b>
                <p>Trong giai đoạn test, bạn có thể tắt FCM / Face / Integrity, nhưng vẫn nên giữ GPS và heartbeat để hệ thống vận hành đúng luồng thời gian thực.</p>
              </div>
            </div>
          </div>}
        </section>

        <section className="card v73-panel">
          <header className="card-heading security-heading">
            <div>
              <h2>Financial Integrity</h2>
              <p>Fare Snapshot + immutable platform ledger + Driver earning.</p>
            </div>
            <WalletCards size={18} />
          </header>
          <div className="v73-finance">
            <div><span>Chuyến COMPLETED</span><b>{number(finance?.completedBookings)}</b></div>
            <div className={finance?.unsettledBookings ? 'warn' : ''}><span>Chưa POST ledger</span><b>{number(finance?.unsettledBookings)}</b></div>
            <div><span>Platform Revenue</span><b>{money(finance?.ledger?.PLATFORM_REVENUE?.amount)}</b></div>
            <div><span>Driver Net Ledger</span><b>{money(finance?.ledger?.DRIVER_NET_EARNING?.amount)}</b></div>
          </div>
          <div className="v73-note"><ShieldCheck size={18} /><div><b>Không sửa balance trực tiếp</b><p>V1.4 đối soát theo booking, fareSnapshot, wallet_transactions và platform_ledger_entries.</p></div></div>
          <button className="button" onClick={reconcile}><RefreshCw size={15} />Đối soát các chuyến chưa POST</button>
        </section>
      </div>
    </section>
  );
}
