import React from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Bike,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  History,
  IdCard,
  Image,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  UserRound,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react';

import { coreApiRequest, openCorePrivateFile } from './coreApi.js';

const STATUS_LABEL = {
  INCOMPLETE: 'Chưa hoàn tất',
  SUBMITTED: 'Chờ duyệt',
  UNDER_REVIEW: 'Đang xét duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Cần bổ sung',
  PENDING: 'Chờ duyệt',
  ONLINE: 'Đang online',
  OFFLINE: 'Offline',
  MISSING: 'Chưa có',
  UPLOADED: 'Đã tải lên',
};

const DOC_KEYS = [
  ['cccd', 'CCCD'],
  ['driverLicense', 'GPLX'],
  ['vehicleRegistration', 'Cà vẹt'],
  ['criminalRecord', 'LLTP'],
  ['vehiclePhotos', 'Ảnh xe'],
  ['bankAccount', 'Ngân hàng'],
  ['avatar', 'Avatar'],
];

function s(value) {
  return String(value || '').toUpperCase();
}

function label(value) {
  return STATUS_LABEL[s(value)] || value || '—';
}

function badgeClass(value) {
  const key = s(value);
  if (key === 'APPROVED' || key === 'ONLINE') return 'success';
  if (key === 'REJECTED') return 'danger';
  if (key === 'SUBMITTED' || key === 'UNDER_REVIEW' || key === 'PENDING') {
    return 'warning';
  }
  return 'neutral';
}

function StatusBadge({ value }) {
  return (
    <span className={`dm-status dm-${badgeClass(value)}`}>
      {label(value)}
    </span>
  );
}

function fileId(value) {
  if (!value || typeof value !== 'object') return '';
  return String(value.id || value.fileId || '');
}

function findDoc(detail, type) {
  return (detail?.documents || []).find(
    item => s(item?.type) === type
  );
}

function progressFrom(row) {
  const d = row?.documentsStatus || {};
  const complete = DOC_KEYS.filter(([key]) => {
    const value = s(d[key]);
    return value && value !== 'MISSING';
  }).length;

  return { complete, total: DOC_KEYS.length };
}

function Metric({ icon: Icon, value, label: title, type = 'default' }) {
  return (
    <article className={`dm-metric dm-metric-${type}`}>
      <div className="dm-metric-icon"><Icon size={19} /></div>
      <div>
        <strong>{value}</strong>
        <span>{title}</span>
      </div>
    </article>
  );
}

function DriverAvatar({ name }) {
  const text = String(name || '?').trim();
  const letter = text.split(/\s+/).slice(-1)[0]?.charAt(0)?.toUpperCase() || '?';

  return <span className="dm-avatar">{letter}</span>;
}

function DocProgress({ row }) {
  const { complete, total } = progressFrom(row);
  const percent = Math.round((complete / total) * 100);

  return (
    <div className="dm-progress">
      <div>
        <b>{complete}/{total}</b>
        <span>{percent}%</span>
      </div>
      <i><em style={{ width: `${percent}%` }} /></i>
    </div>
  );
}

function FileTile({ value, title, subtitle, onOpen }) {
  const id = fileId(value);
  const exists = Boolean(id);

  return (
    <button
      type="button"
      className={`dm-file-tile ${exists ? 'ready' : 'missing'}`}
      disabled={!exists}
      onClick={() => exists && onOpen(id)}
    >
      <span className="dm-file-icon">
        {exists ? <FileCheck2 size={18} /> : <FileText size={18} />}
      </span>
      <span className="dm-file-copy">
        <b>{title}</b>
        <small>{exists ? subtitle || 'Nhấn để xem file' : 'Chưa tải lên'}</small>
      </span>
      {exists && <Eye size={16} />}
    </button>
  );
}

function DataItem({ title, value, mono = false }) {
  return (
    <div className="dm-data-item">
      <span>{title}</span>
      <b className={mono ? 'mono' : ''}>{value || '—'}</b>
    </div>
  );
}

function OverviewTab({ detail, onFile }) {
  const user = detail?.user || {};
  const driver = detail?.driver || {};
  const avatar = user.avatar || null;
  const vehicle = detail?.vehicle || {};
  const bank = detail?.bankAccount || {};

  return (
    <div className="dm-tab-grid">
      <section className="dm-panel">
        <header>
          <div><h3>Thông tin tài xế</h3><p>Tài khoản và trạng thái vận hành</p></div>
          <CircleUserRound size={19} />
        </header>

        <div className="dm-profile-head">
          <DriverAvatar name={user.fullName} />
          <div>
            <h4>{user.fullName || 'Chưa cập nhật tên'}</h4>
            <p>{user.phone || '—'}</p>
            <p>{user.email || 'Chưa có email'}</p>
          </div>
        </div>

        <div className="dm-data-grid">
          <DataItem title="KYC" value={label(driver.kycStatus)} />
          <DataItem title="Tài khoản" value={label(driver.approvalStatus)} />
          <DataItem title="Vận hành" value={label(driver.onlineStatus)} />
          <DataItem title="Driver ID" value={String(driver._id || '')} mono />
        </div>

        <div className="dm-file-single">
          <FileTile
            value={avatar}
            title="Ảnh đại diện"
            subtitle="File ảnh riêng tư"
            onOpen={onFile}
          />
        </div>
      </section>

      <section className="dm-panel">
        <header>
          <div><h3>Tổng hợp hồ sơ</h3><p>7 nhóm thông tin bắt buộc</p></div>
          <ShieldCheck size={19} />
        </header>

        <div className="dm-checklist">
          {DOC_KEYS.map(([key, title]) => {
            const value = driver.documentsStatus?.[key] || 'MISSING';
            const done = s(value) !== 'MISSING';

            return (
              <div key={key} className={done ? 'done' : ''}>
                <span>
                  {done ? <Check size={14} /> : <X size={14} />}
                </span>
                <b>{title}</b>
                <StatusBadge value={value} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="dm-panel">
        <header>
          <div><h3>Xe đang đăng ký</h3><p>Thông tin phương tiện chính</p></div>
          <Bike size={19} />
        </header>

        <div className="dm-data-grid">
          <DataItem title="Biển số" value={vehicle.plateNumber} />
          <DataItem title="Hãng xe" value={vehicle.brand} />
          <DataItem title="Dòng xe" value={vehicle.model} />
          <DataItem title="Màu xe" value={vehicle.color} />
          <DataItem title="Năm sản xuất" value={vehicle.year} />
          <DataItem
            title="Xác minh"
            value={label(vehicle.verificationStatus)}
          />
        </div>
      </section>

      <section className="dm-panel">
        <header>
          <div><h3>Nhận thanh toán</h3><p>Thông tin ngân hàng đã được che số</p></div>
          <Banknote size={19} />
        </header>

        <div className="dm-data-grid">
          <DataItem title="Ngân hàng" value={bank.bankName} />
          <DataItem title="Mã NH" value={bank.bankCode} />
          <DataItem title="Chủ tài khoản" value={bank.accountName} />
          <DataItem title="Số tài khoản" value={bank.accountNumberMasked} mono />
        </div>
      </section>
    </div>
  );
}

function DocumentsTab({ detail, onFile }) {
  const cccd = findDoc(detail, 'CCCD');
  const license = findDoc(detail, 'DRIVER_LICENSE');
  const registration = findDoc(detail, 'VEHICLE_REGISTRATION');
  const criminal = findDoc(detail, 'CRIMINAL_RECORD');

  const blocks = [
    {
      title: 'Căn cước công dân',
      icon: IdCard,
      doc: cccd,
      number: cccd?.documentNumberMasked,
      rows: [
        ['Họ tên', cccd?.fullName],
        ['Ngày sinh', cccd?.dateOfBirth],
        ['Ngày cấp', cccd?.issueDate],
        ['Nơi cấp', cccd?.issuedBy],
      ],
      files: [
        ['front', 'CCCD mặt trước'],
        ['back', 'CCCD mặt sau'],
      ],
    },
    {
      title: 'Giấy phép lái xe',
      icon: BadgeCheck,
      doc: license,
      number: license?.licenseNumberMasked,
      rows: [
        ['Hạng GPLX', license?.licenseClass],
        ['Ngày cấp', license?.issueDate],
        ['Hết hạn', license?.expiryDate],
      ],
      files: [
        ['front', 'GPLX mặt trước'],
        ['back', 'GPLX mặt sau'],
      ],
    },
    {
      title: 'Cà vẹt / Đăng ký xe',
      icon: FileText,
      doc: registration,
      number: registration?.registrationNumberMasked,
      rows: [
        ['Biển số', registration?.plateNumber],
        ['Chủ xe', registration?.ownerName],
      ],
      files: [
        ['front', 'Cà vẹt mặt trước'],
        ['back', 'Cà vẹt mặt sau'],
      ],
    },
    {
      title: 'Lý lịch tư pháp',
      icon: ShieldCheck,
      doc: criminal,
      number: criminal?.documentNumberMasked,
      rows: [['Ngày cấp', criminal?.issueDate]],
      files: [['document', 'Ảnh / PDF LLTP']],
    },
  ];

  return (
    <div className="dm-documents">
      {blocks.map(block => {
        const Icon = block.icon;

        return (
          <section className="dm-panel dm-document-panel" key={block.title}>
            <header>
              <div className="dm-document-title">
                <span><Icon size={18} /></span>
                <div>
                  <h3>{block.title}</h3>
                  <p>
                    {block.number
                      ? `Số: ${block.number}`
                      : 'Chưa có số giấy tờ'}
                  </p>
                </div>
              </div>
              <StatusBadge value={block.doc?.status || 'MISSING'} />
            </header>

            <div className="dm-data-grid">
              {block.rows.map(([title, value]) => (
                <DataItem key={title} title={title} value={value} />
              ))}
            </div>

            <div className="dm-file-grid">
              {block.files.map(([key, title]) => (
                <FileTile
                  key={key}
                  value={block.doc?.files?.[key]}
                  title={title}
                  onOpen={onFile}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function VehicleTab({ detail, onFile }) {
  const vehicle = detail?.vehicle || {};

  return (
    <div className="dm-tab-grid">
      <section className="dm-panel">
        <header>
          <div><h3>Thông tin phương tiện</h3><p>Xe tài xế đăng ký hoạt động</p></div>
          <Bike size={19} />
        </header>

        <div className="dm-data-grid">
          <DataItem title="Biển số" value={vehicle.plateNumber} />
          <DataItem title="Loại dịch vụ" value={(Array.isArray(vehicle.serviceCodes)&&vehicle.serviceCodes.length?vehicle.serviceCodes.join(', '):vehicle.serviceCode)||'BIKE'} />
          <DataItem title="Hãng xe" value={vehicle.brand} />
          <DataItem title="Dòng xe" value={vehicle.model} />
          <DataItem title="Màu xe" value={vehicle.color} />
          <DataItem title="Năm sản xuất" value={vehicle.year} />
          <DataItem title="Trạng thái" value={label(vehicle.status)} />
          <DataItem
            title="Xác minh"
            value={label(vehicle.verificationStatus)}
          />
        </div>
      </section>

      <section className="dm-panel dm-span-2">
        <header>
          <div><h3>4 ảnh phương tiện</h3><p>Phải đủ bốn góc để xét duyệt</p></div>
          <Image size={19} />
        </header>

        <div className="dm-vehicle-files">
          {[
            ['front', 'Chính diện'],
            ['left', 'Hông trái'],
            ['right', 'Hông phải'],
            ['rear', 'Phía sau'],
          ].map(([key, title]) => (
            <FileTile
              key={key}
              value={vehicle?.photos?.[key]}
              title={title}
              subtitle="Xem ảnh xe"
              onOpen={onFile}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function BankTab({ detail }) {
  const bank = detail?.bankAccount || {};

  return (
    <section className="dm-panel dm-bank-panel">
      <header>
        <div><h3>Tài khoản ngân hàng</h3><p>Dùng cho thanh toán và đối soát tài xế</p></div>
        <Banknote size={19} />
      </header>

      <div className="dm-security-notice">
        <ShieldCheck size={18} />
        <div>
          <b>Dữ liệu nhạy cảm được bảo vệ</b>
          <p>
            Trang quản trị chỉ hiển thị số tài khoản đã che. Không hiển thị
            dữ liệu mã hóa hoặc số tài khoản đầy đủ.
          </p>
        </div>
      </div>

      <div className="dm-data-grid dm-bank-grid">
        <DataItem title="Tên ngân hàng" value={bank.bankName} />
        <DataItem title="Mã ngân hàng" value={bank.bankCode} />
        <DataItem title="Chủ tài khoản" value={bank.accountName} />
        <DataItem title="Số tài khoản" value={bank.accountNumberMasked} mono />
        <DataItem
          title="Trạng thái xác minh"
          value={label(bank.verificationStatus)}
        />
      </div>
    </section>
  );
}

function AuditTab({ detail }) {
  const logs = detail?.verificationLogs || [];

  return (
    <section className="dm-panel">
      <header>
        <div><h3>Lịch sử xét duyệt</h3><p>Dữ liệu audit từ verification_logs</p></div>
        <History size={19} />
      </header>

      <div className="dm-timeline">
        {logs.length === 0 && (
          <div className="dm-empty-small">Chưa có lịch sử xét duyệt.</div>
        )}

        {logs.map((item, index) => (
          <article key={String(item._id || index)}>
            <span className="dm-timeline-dot" />
            <div>
              <div className="dm-timeline-head">
                <b>{label(item.action || item.decision || item.status)}</b>
                <small>
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString('vi-VN')
                    : '—'}
                </small>
              </div>
              {item.reason && <p>{item.reason}</p>}
              {item.reviewedBy && (
                <code>Admin: {String(item.reviewedBy)}</code>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DriverDrawer({
  driverId,
  detail,
  loading,
  reviewing,
  onClose,
  onReload,
  onReviewDone,
}) {
  const [tab, setTab] = React.useState('overview');
  const [fileBusy, setFileBusy] = React.useState(false);

  React.useEffect(() => setTab('overview'), [driverId]);

  if (!driverId) return null;

  const user = detail?.user || {};
  const driver = detail?.driver || {};
  const canReview = ['SUBMITTED', 'UNDER_REVIEW'].includes(s(driver.kycStatus));

  async function openFile(id) {
    setFileBusy(true);
    try {
      await openCorePrivateFile(id);
    } catch (error) {
      window.alert(`Không thể mở file: ${error.message}`);
    } finally {
      setFileBusy(false);
    }
  }

  async function approve() {
    if (!window.confirm(
      'Xác nhận DUYỆT hồ sơ này? Hãy chắc chắn bạn đã kiểm tra đầy đủ giấy tờ.'
    )) return;

    await onReviewDone('APPROVE');
  }

  async function reject() {
    const reason = window.prompt(
      'Nhập rõ lý do từ chối / yêu cầu tài xế bổ sung:'
    );

    if (reason === null) return;

    if (!reason.trim()) {
      window.alert('Bắt buộc phải nhập lý do từ chối.');
      return;
    }

    await onReviewDone('REJECT', reason.trim());
  }

  const tabs = [
    ['overview', 'Tổng quan', UserRound],
    ['documents', 'Giấy tờ', IdCard],
    ['vehicle', 'Phương tiện', Bike],
    ['bank', 'Ngân hàng', Banknote],
    ['audit', 'Lịch sử', History],
  ];

  return (
    <div className="dm-drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="dm-drawer"
        onMouseDown={event => event.stopPropagation()}
        aria-label="Quản lý hồ sơ tài xế"
      >
        <header className="dm-drawer-header">
          <div className="dm-driver-title">
            <DriverAvatar name={user.fullName} />
            <div>
              <small>HỒ SƠ TÀI XẾ</small>
              <h2>{user.fullName || 'Đang tải...'}</h2>
              <p>{user.phone || '—'} · {user.email || 'Chưa có email'}</p>
            </div>
          </div>

          <div className="dm-drawer-head-actions">
            <button type="button" onClick={onReload} title="Làm mới">
              <RefreshCw size={17} />
            </button>
            <button type="button" onClick={onClose} title="Đóng">
              <X size={19} />
            </button>
          </div>
        </header>

        {loading ? (
          <div className="dm-loading">
            <RefreshCw className="spin" size={28} />
            <span>Đang tải hồ sơ...</span>
          </div>
        ) : (
          <>
            <div className="dm-drawer-status">
              <div><span>KYC</span><StatusBadge value={driver.kycStatus} /></div>
              <div><span>Tài khoản</span><StatusBadge value={driver.approvalStatus} /></div>
              <div><span>Vận hành</span><StatusBadge value={driver.onlineStatus} /></div>
              <div><span>Driver ID</span><code>{String(driver._id || driverId)}</code></div>
            </div>

            {driver.kycRejectionReason && (
              <div className="dm-rejection">
                <AlertTriangle size={18} />
                <div>
                  <b>Hồ sơ cần bổ sung</b>
                  <p>{driver.kycRejectionReason}</p>
                </div>
              </div>
            )}

            <nav className="dm-tabs">
              {tabs.map(([key, title, Icon]) => (
                <button
                  type="button"
                  key={key}
                  className={tab === key ? 'active' : ''}
                  onClick={() => setTab(key)}
                >
                  <Icon size={15} />
                  {title}
                </button>
              ))}
            </nav>

            <div className="dm-drawer-body">
              {tab === 'overview' && (
                <OverviewTab detail={detail} onFile={openFile} />
              )}
              {tab === 'documents' && (
                <DocumentsTab detail={detail} onFile={openFile} />
              )}
              {tab === 'vehicle' && (
                <VehicleTab detail={detail} onFile={openFile} />
              )}
              {tab === 'bank' && <BankTab detail={detail} />}
              {tab === 'audit' && <AuditTab detail={detail} />}

              {fileBusy && (
                <div className="dm-floating-loading">
                  <RefreshCw className="spin" size={15} /> Đang mở file...
                </div>
              )}
            </div>

            <footer className="dm-review-bar">
              <div>
                <b>
                  {canReview
                    ? 'Hồ sơ đang chờ quyết định'
                    : `Trạng thái: ${label(driver.kycStatus)}`}
                </b>
                <span>
                  {canReview
                    ? 'Kiểm tra đủ 7 nhóm hồ sơ trước khi duyệt.'
                    : 'Chỉ hồ sơ đã gửi mới có thể Duyệt / Từ chối.'}
                </span>
              </div>

              <div>
                <button
                  type="button"
                  className="dm-btn dm-btn-danger"
                  disabled={!canReview || reviewing}
                  onClick={reject}
                >
                  <XCircle size={16} /> Từ chối
                </button>
                <button
                  type="button"
                  className="dm-btn dm-btn-primary"
                  disabled={!canReview || reviewing}
                  onClick={approve}
                >
                  <CheckCircle2 size={16} />
                  {reviewing ? 'Đang xử lý...' : 'Duyệt hồ sơ'}
                </button>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

export default function DriverManagement() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [tab, setTab] = React.useState('ALL');
  const [selectedId, setSelectedId] = React.useState('');
  const [detail, setDetail] = React.useState(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [reviewing, setReviewing] = React.useState(false);

  const loadRows = React.useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await coreApiRequest('/api/kyc/admin/drivers');
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(error.message || String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadRows();
  }, [loadRows]);

  async function loadDetail(driverId) {
    setSelectedId(driverId);
    setDetailLoading(true);

    try {
      const data = await coreApiRequest(
        `/api/kyc/admin/drivers/${encodeURIComponent(driverId)}`
      );
      setDetail(data);
    } catch (error) {
      window.alert(`Không tải được hồ sơ: ${error.message}`);
      setSelectedId('');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function reloadDetail() {
    if (!selectedId) return;
    await loadDetail(selectedId);
  }

  async function review(decision, reason = null) {
    if (!selectedId) return;

    setReviewing(true);

    try {
      await coreApiRequest(
        `/api/kyc/admin/drivers/${encodeURIComponent(selectedId)}/review`,
        {
          method: 'POST',
          body: JSON.stringify({ decision, reason }),
        }
      );

      await loadRows();
      await reloadDetail();

      window.alert(
        decision === 'APPROVE'
          ? 'Đã duyệt hồ sơ tài xế.'
          : 'Đã từ chối hồ sơ và lưu lý do yêu cầu bổ sung.'
      );
    } catch (error) {
      window.alert(error.message || 'Không thể xét duyệt hồ sơ.');
    } finally {
      setReviewing(false);
    }
  }

  const stats = React.useMemo(() => {
    const result = {
      total: rows.length,
      waiting: 0,
      approved: 0,
      rejected: 0,
      online: 0,
    };

    rows.forEach(row => {
      const kyc = s(row.kycStatus);
      if (['SUBMITTED', 'UNDER_REVIEW'].includes(kyc)) result.waiting += 1;
      if (kyc === 'APPROVED') result.approved += 1;
      if (kyc === 'REJECTED') result.rejected += 1;
      if (s(row.onlineStatus) === 'ONLINE') result.online += 1;
    });

    return result;
  }, [rows]);

  const filteredRows = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter(row => {
      const kyc = s(row.kycStatus);

      const tabOk =
        tab === 'ALL' ||
        (tab === 'WAITING' && ['SUBMITTED', 'UNDER_REVIEW'].includes(kyc)) ||
        (tab === 'APPROVED' && kyc === 'APPROVED') ||
        (tab === 'REJECTED' && kyc === 'REJECTED') ||
        (tab === 'INCOMPLETE' && kyc === 'INCOMPLETE');

      if (!tabOk) return false;
      if (!q) return true;

      const search = [
        row.user?.fullName,
        row.user?.phone,
        row.user?.email,
        row.driverId,
        row.kycStatus,
        row.approvalStatus,
      ].join(' ').toLowerCase();

      return search.includes(q);
    });
  }, [rows, query, tab]);

  function exportCsv() {
    const lines = [
      [
        'Tên tài xế',
        'Số điện thoại',
        'Email',
        'KYC',
        'Tài khoản',
        'Online',
        'Hoàn thành hồ sơ',
        'Cập nhật',
      ],
      ...filteredRows.map(row => {
        const p = progressFrom(row);
        return [
          row.user?.fullName || '',
          row.user?.phone || '',
          row.user?.email || '',
          row.kycStatus || '',
          row.approvalStatus || '',
          row.onlineStatus || '',
          `${p.complete}/${p.total}`,
          row.updatedAt || '',
        ];
      }),
    ];

    const csv = '\uFEFF' + lines
      .map(line => line.map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `TH79_iMove_Driver_KYC_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();

    URL.revokeObjectURL(url);
  }

  const filterTabs = [
    ['ALL', 'Tất cả', stats.total],
    ['WAITING', 'Chờ duyệt', stats.waiting],
    ['INCOMPLETE', 'Chưa hoàn tất', rows.filter(x => s(x.kycStatus) === 'INCOMPLETE').length],
    ['APPROVED', 'Đã duyệt', stats.approved],
    ['REJECTED', 'Cần bổ sung', stats.rejected],
  ];

  return (
    <>
      <header className="page-intro dm-page-intro">
        <div>
          <p className="eyebrow">DRIVER OPERATIONS · KYC</p>
          <h1>Quản lý hồ sơ tài xế</h1>
          <p>
            Quản lý tài khoản tài xế, tiến độ KYC, giấy tờ định danh,
            phương tiện, ngân hàng và lịch sử xét duyệt trên một màn hình.
          </p>
        </div>

        <div className="page-actions">
          <button type="button" className="button" onClick={exportCsv}>
            <Download size={16} /> Xuất CSV
          </button>
          <button type="button" className="button button-primary" onClick={loadRows}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Làm mới
          </button>
        </div>
      </header>

      <section className="dm-metrics">
        <Metric icon={UsersRound} value={stats.total} label="Tổng tài xế" />
        <Metric icon={Clock3} value={stats.waiting} label="Đang chờ duyệt" type="warning" />
        <Metric icon={BadgeCheck} value={stats.approved} label="Đã duyệt KYC" type="success" />
        <Metric icon={XCircle} value={stats.rejected} label="Cần bổ sung" type="danger" />
        <Metric icon={Smartphone} value={stats.online} label="Đang online" type="online" />
      </section>

      <section className="dm-filter-card">
        <div className="dm-filter-tabs">
          {filterTabs.map(([key, title, count]) => (
            <button
              key={key}
              type="button"
              className={tab === key ? 'active' : ''}
              onClick={() => setTab(key)}
            >
              {title}
              <span>{count}</span>
            </button>
          ))}
        </div>

        <div className="dm-search-row">
          <label className="dm-search">
            <Search size={17} />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Tìm tên tài xế, số điện thoại, email, Driver ID..."
            />
          </label>

          <span className="dm-result-count">
            <Filter size={14} /> {filteredRows.length} kết quả
          </span>
        </div>
      </section>

      {error && (
        <div className="dm-error">
          <AlertTriangle size={19} />
          <div>
            <b>Không tải được dữ liệu Core Backend</b>
            <p>{error}</p>
          </div>
        </div>
      )}

      <section className="card data-card dm-table-card">
        {loading ? (
          <div className="dm-loading">
            <RefreshCw className="spin" size={27} />
            <span>Đang tải danh sách tài xế...</span>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="dm-table">
              <thead>
                <tr>
                  <th>Tài xế</th>
                  <th>KYC</th>
                  <th>Hồ sơ</th>
                  <th>Tài khoản</th>
                  <th>Vận hành</th>
                  <th>Cập nhật</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map(row => (
                  <tr key={row.driverId}>
                    <td>
                      <div className="person dm-person">
                        <DriverAvatar name={row.user?.fullName} />
                        <span>
                          <b>{row.user?.fullName || 'Chưa cập nhật tên'}</b>
                          <small>{row.user?.phone || '—'}</small>
                          <small>{row.user?.email || 'Chưa có email'}</small>
                        </span>
                      </div>
                    </td>

                    <td><StatusBadge value={row.kycStatus} /></td>
                    <td><DocProgress row={row} /></td>
                    <td><StatusBadge value={row.approvalStatus} /></td>
                    <td><StatusBadge value={row.onlineStatus} /></td>
                    <td className="dm-date">
                      {row.updatedAt
                        ? new Date(row.updatedAt).toLocaleString('vi-VN')
                        : '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="dm-view-btn"
                        onClick={() => loadDetail(row.driverId)}
                      >
                        Quản lý <ChevronRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan="7">
                      <div className="dm-empty">
                        <UsersRound size={30} />
                        <b>Không có tài xế phù hợp</b>
                        <span>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <DriverDrawer
        driverId={selectedId}
        detail={detail}
        loading={detailLoading}
        reviewing={reviewing}
        onClose={() => {
          setSelectedId('');
          setDetail(null);
        }}
        onReload={reloadDetail}
        onReviewDone={review}
      />
    </>
  );
}