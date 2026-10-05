import { CORE_BACKEND_URL, coreUrl } from './apiRuntime.js';

const ACCESS_KEY = 'imove_core_admin_access_token';
const USER_KEY = 'imove_core_admin_user';

async function requestWithTimeout(url, options = {}, defaultTimeoutMs = 10000) {
  const timeoutMs = Math.max(1500, Number(options.timeoutMs || defaultTimeoutMs));
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  const { timeoutMs: _ignoredTimeout, ...fetchOptions } = options;
  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Yêu cầu Core Backend quá thời gian (${Math.round(timeoutMs / 1000)} giây).`);
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timer);
  }
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

// VPS production: Admin gọi trực tiếp Core Backend. Không phụ thuộc Admin Gateway 5060.
export async function getCoreConnection(refresh = false) {
  const url = coreUrl('/health');
  const startedAt = performance.now();
  try {
    const response = await requestWithTimeout(url, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      timeoutMs: 6000,
    }, 6000);
    const payload = await readResponse(response);
    const connected = response.ok && payload?.backend === true && payload?.database !== false;
    return {
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
  } catch (error) {
    return {
      connected: false,
      configured: true,
      baseUrl: CORE_BACKEND_URL,
      healthUrl: url,
      source: 'DIRECT_CORE_BACKEND',
      latencyMs: Math.round(performance.now() - startedAt),
      errorName: error?.name || 'Error',
      error: error?.message || String(error),
      message: `Không kết nối được Core Backend tại ${CORE_BACKEND_URL}.`,
      hint: 'Kiểm tra backend /health, HTTPS/DNS và CORS_ORIGINS cho domain Admin.',
    };
  }
}

export async function coreAdminLogin({ login, password }) {
  const health = await getCoreConnection(true);
  if (!health.connected) {
    const status = health.status ? ` HTTP ${health.status}.` : '';
    const detail = health.health?.message || health.error || health.hint || '';
    throw new Error(`Không tìm thấy Core Backend.${status}${detail ? ` ${detail}` : ''}`);
  }

  const response = await requestWithTimeout(coreUrl('/api/admin-auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ login, password }),
    cache: 'no-store',
    timeoutMs: 10000,
  });
  const payload = await readResponse(response);

  if (!response.ok) throw new Error(payload?.message || payload?.error || `Đăng nhập thất bại (${response.status})`);
  if (!payload?.accessToken) throw new Error('Backend không trả Access Token quản trị.');

  localStorage.setItem(ACCESS_KEY, payload.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(payload.user || null));
  localStorage.setItem('imove_admin_session', '1');
  return payload;
}

export function coreAdminLogout() { clearCoreAdminSession(); }

export async function coreApiRequest(path, options = {}) {
  const token = localStorage.getItem(ACCESS_KEY);
  if (!token) throw new Error('Chưa đăng nhập Core Admin.');

  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const response = await requestWithTimeout(coreUrl(path), {
    ...options,
    headers,
    cache: 'no-store',
  }, Number(options.timeoutMs || 10000));
  const payload = await readResponse(response);

  if (response.status === 401) {
    clearCoreAdminSession();
    window.dispatchEvent(new Event('imove:admin-auth-expired'));
  }
  if (!response.ok) {
    const missing = Array.isArray(payload?.missing) ? `\n• ${payload.missing.join('\n• ')}` : '';
    throw new Error((payload?.message || payload?.error || `API lỗi ${response.status}`) + missing);
  }
  return payload;
}

export async function openCorePrivateFile(fileId) {
  const token = localStorage.getItem(ACCESS_KEY);
  if (!token) throw new Error('Chưa đăng nhập Core Admin.');
  const popup = window.open('', '_blank');
  try {
    const response = await requestWithTimeout(coreUrl(`/api/kyc/files/${encodeURIComponent(fileId)}`), {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      timeoutMs: 20000,
    }, 20000);
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
    throw error;
  }
}

export const CORE_API_URL = CORE_BACKEND_URL;
