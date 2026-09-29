const CORE_PROXY_BASE = '/core-api';
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

export async function getCoreConnection(refresh = false) {
  const response = await fetch(`/api/core-connection${refresh ? '?refresh=1' : ''}`, {
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || `Admin Gateway lỗi ${response.status}`);
  }

  return payload;
}

export async function coreAdminLogin({ login, password }) {
  // Trigger discovery before login so the UI gets a clear LAN error instead of ERR_CONNECTION_REFUSED.
  const connection = await getCoreConnection(false);
  if (!connection?.connected) {
    const detail = connection?.hint ? ` ${connection.hint}` : '';
    throw new Error((connection?.message || 'Không tìm thấy Core Backend.') + detail);
  }

  const response = await fetch(`${CORE_PROXY_BASE}/api/admin-auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.message || `Đăng nhập thất bại (${response.status})`
    );
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

  if (!token) {
    throw new Error('Chưa đăng nhập Core Admin.');
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${CORE_PROXY_BASE}${path}`, {
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

    throw new Error(
      (payload?.message || `API lỗi ${response.status}`) + missing
    );
  }

  return payload;
}

export async function openCorePrivateFile(fileId) {
  const token = localStorage.getItem(ACCESS_KEY);

  if (!token) {
    throw new Error('Chưa đăng nhập Core Admin.');
  }

  const popup = window.open('', '_blank');

  try {
    const response = await fetch(
      `${CORE_PROXY_BASE}/api/kyc/files/${encodeURIComponent(fileId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }
    );

    if (response.status === 401) {
      clearCoreAdminSession();
      window.dispatchEvent(new Event('imove:admin-auth-expired'));
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(
        payload?.message || `Không thể mở file (${response.status})`
      );
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    if (popup) {
      popup.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    if (popup) popup.close();
    throw error;
  }
}

export const CORE_API_URL = CORE_PROXY_BASE;
