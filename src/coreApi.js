import { CORE_BACKEND_URL, coreUrl } from './apiRuntime.js';

const ACCESS_KEY = 'imove_core_admin_access_token';
const USER_KEY = 'imove_core_admin_user';

function debug(label, data) {
  try { console.info(`[TH79 iMove Admin] ${label}`, data); } catch (_) {}
}

async function readResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch (_) { return { raw: text }; }
}

export function hasCoreAdminSession() {
  return Boolean(localStorage.getItem(ACCESS_KEY));
}

export function currentCoreAdmin() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
  catch (_) { return null; }
}

export function clearCoreAdminSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('imove_admin_session');
}

// Production Admin is a static Vite/Vercel app. There is no local /api/core-connection
// endpoint on Vercel, therefore health must be checked directly against Core Backend.
export async function getCoreConnection(refresh = false) {
  const url = coreUrl('/health');
  const startedAt = performance.now();
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const payload = await readResponse(response);
    const connected = response.ok && payload?.backend === true && payload?.database !== false;
    const result = {
      connected,
      configured: true,
      baseUrl: CORE_BACKEND_URL,
      healthUrl: url,
      status: response.status,
      source: 'DIRECT_CORE_BACKEND',
      refresh: Boolean(refresh),
      latencyMs: Math.round(performance.now() - startedAt),
      health: payload,
      message: connected ? 'Core Backend đang hoạt động.' : (payload?.message || `Core Backend trả HTTP ${response.status}.`),
    };
    debug('CORE HEALTH', result);
    return result;
  } catch (error) {
    const result = {
      connected: false,
      configured: true,
      baseUrl: CORE_BACKEND_URL,
      healthUrl: url,
      source: 'DIRECT_CORE_BACKEND',
      latencyMs: Math.round(performance.now() - startedAt),
      errorName: error?.name || 'Error',
      error: error?.message || String(error),
      message: `Không kết nối được Core Backend tại ${CORE_BACKEND_URL}.`,
      hint: 'Mở F12 > Console/Network. Nếu thấy Failed to fetch hoặc CORS, kiểm tra CORS_ORIGINS của backend và domain Admin đang chạy.',
    };
    console.error('[TH79 iMove Admin] CORE CONNECTION FAILED', result, error);
    return result;
  }
}

export async function coreAdminLogin({ login, password }) {
  const health = await getCoreConnection(true);
  if (!health.connected) {
    const status = health.status ? ` HTTP ${health.status}.` : '';
    const detail = health.health?.message || health.error || health.hint || '';
    throw new Error(`Không tìm thấy Core Backend.${status}${detail ? ` ${detail}` : ''}`);
  }

  const url = coreUrl('/api/admin-auth/login');
  debug('ADMIN LOGIN REQUEST', { url, login });
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ login, password }),
      cache: 'no-store',
    });
    const payload = await readResponse(response);
    debug('ADMIN LOGIN RESPONSE', { url, status: response.status, ok: response.ok, payload });

    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || `Đăng nhập thất bại (${response.status})`);
    }
    if (!payload?.accessToken) throw new Error('Backend không trả Access Token quản trị.');

    localStorage.setItem(ACCESS_KEY, payload.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user || null));
    localStorage.setItem('imove_admin_session', '1');
    return payload;
  } catch (error) {
    console.error('[TH79 iMove Admin] ADMIN LOGIN FAILED', { url, login, message: error?.message }, error);
    if (error instanceof TypeError || /failed to fetch|network/i.test(String(error?.message || ''))) {
      throw new Error(`Không gọi được API đăng nhập ${url}. Có thể do CORS, DNS, HTTPS hoặc backend không truy cập được từ trình duyệt. Chi tiết F12: ${error.message}`);
    }
    throw error;
  }
}

export function coreAdminLogout() { clearCoreAdminSession(); }

export async function coreApiRequest(path, options = {}) {
  const token = localStorage.getItem(ACCESS_KEY);
  if (!token) throw new Error('Chưa đăng nhập Core Admin.');

  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const url = coreUrl(path);
  const method = String(options.method || 'GET').toUpperCase();
  debug('CORE API REQUEST', { method, url });
  try {
    const response = await fetch(url, { ...options, headers, cache: 'no-store' });
    const payload = await readResponse(response);
    debug('CORE API RESPONSE', { method, url, status: response.status, ok: response.ok, payload });

    if (response.status === 401) {
      clearCoreAdminSession();
      window.dispatchEvent(new Event('imove:admin-auth-expired'));
    }
    if (!response.ok) {
      const missing = Array.isArray(payload?.missing) ? `\n• ${payload.missing.join('\n• ')}` : '';
      throw new Error((payload?.message || payload?.error || `API lỗi ${response.status}`) + missing);
    }
    return payload;
  } catch (error) {
    console.error('[TH79 iMove Admin] CORE API FAILED', { method, url, message: error?.message }, error);
    throw error;
  }
}

export async function openCorePrivateFile(fileId) {
  const token = localStorage.getItem(ACCESS_KEY);
  if (!token) throw new Error('Chưa đăng nhập Core Admin.');
  const popup = window.open('', '_blank');
  const url = coreUrl(`/api/kyc/files/${encodeURIComponent(fileId)}`);
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (response.status === 401) {
      clearCoreAdminSession();
      window.dispatchEvent(new Event('imove:admin-auth-expired'));
    }
    if (!response.ok) {
      const payload = await readResponse(response);
      throw new Error(payload?.message || `Không thể mở file (${response.status})`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    if (popup) popup.location.href = objectUrl;
    else window.open(objectUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    if (popup) popup.close();
    console.error('[TH79 iMove Admin] OPEN PRIVATE FILE FAILED', { url, fileId, message: error?.message }, error);
    throw error;
  }
}

export const CORE_API_URL = CORE_BACKEND_URL;
