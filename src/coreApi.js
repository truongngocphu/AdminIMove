import { CORE_BACKEND_URL, coreUrl } from './apiRuntime.js';

const ACCESS_KEY = 'imove_core_admin_access_token';
const USER_KEY = 'imove_core_admin_user';

export function hasCoreAdminSession() {
  return Boolean(localStorage.getItem(ACCESS_KEY));
}

export function currentCoreAdmin() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch (_) {
    return null;
  }
}

export function clearCoreAdminSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('imove_admin_session');
}

// Production no longer discovers Core through the Vercel origin.
// The Core endpoint is explicit and fixed to the VPS URL.
export async function getCoreConnection(_refresh = false) {
  return {
    connected: true,
    configured: true,
    baseUrl: CORE_BACKEND_URL,
    source: 'VPS_BACKEND_URL',
  };
}

export async function coreAdminLogin({ login, password }) {
  const response = await fetch(coreUrl('/api/admin-auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || `Đăng nhập thất bại (${response.status})`);
  }

  if (!payload?.accessToken) {
    throw new Error('Backend không trả Access Token quản trị.');
  }

  localStorage.setItem(ACCESS_KEY, payload.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(payload.user || null));
  localStorage.setItem('imove_admin_session', '1');
  return payload;
}

export function coreAdminLogout() {
  clearCoreAdminSession();
}

export async function coreApiRequest(path, options = {}) {
  const token = localStorage.getItem(ACCESS_KEY);
  if (!token) throw new Error('Chưa đăng nhập Core Admin.');

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(coreUrl(path), {
    ...options,
    headers,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));

  if (response.status === 401) {
    clearCoreAdminSession();
    window.dispatchEvent(new Event('imove:admin-auth-expired'));
  }

  if (!response.ok) {
    const missing = Array.isArray(payload?.missing)
      ? `\n• ${payload.missing.join('\n• ')}`
      : '';
    throw new Error((payload?.message || `API lỗi ${response.status}`) + missing);
  }
  return payload;
}

export async function openCorePrivateFile(fileId) {
  const token = localStorage.getItem(ACCESS_KEY);
  if (!token) throw new Error('Chưa đăng nhập Core Admin.');

  const popup = window.open('', '_blank');
  try {
    const response = await fetch(
      coreUrl(`/api/kyc/files/${encodeURIComponent(fileId)}`),
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );

    if (response.status === 401) {
      clearCoreAdminSession();
      window.dispatchEvent(new Event('imove:admin-auth-expired'));
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.message || `Không thể mở file (${response.status})`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    if (popup) popup.location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    if (popup) popup.close();
    throw error;
  }
}

export const CORE_API_URL = CORE_BACKEND_URL;
