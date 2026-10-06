async function requestWithTimeout(url, options = {}, defaultTimeoutMs = 10000) {
  const timeoutMs = Math.max(1500, Number(options.timeoutMs || defaultTimeoutMs));
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  const { timeoutMs: _ignoredTimeout, ...fetchOptions } = options;
  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Yêu cầu quá thời gian (${Math.round(timeoutMs / 1000)} giây). Vui lòng thử lại.`);
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

const ACCESS_KEY = 'imove_core_admin_access_token';

export function adminAccessToken(){
  return localStorage.getItem(ACCESS_KEY) || '';
}

export async function adminApiRequest(path, options = {}){
  const token = adminAccessToken();
  if(!token) throw new Error('Chưa đăng nhập quản trị.');

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  if(options.body && !(options.body instanceof FormData)){
    headers['Content-Type'] = 'application/json';
  }

  const response = await requestWithTimeout(`/api${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  }, 10000);

  const payload = await response.json().catch(() => ({}));
  if(response.status === 401){
    window.dispatchEvent(new Event('imove:admin-auth-expired'));
  }
  if(!response.ok){
    throw new Error(payload?.message || `API lỗi ${response.status}`);
  }
  return payload;
}

export function hasPermission(access, permission){
  if(!permission) return true;
  const permissions = Array.isArray(access?.permissions) ? access.permissions : [];
  return permissions.includes('*') || permissions.includes(permission);
}
