import { coreUrl } from './apiRuntime.js';
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

  const url = coreUrl(`/api${path}`);
  console.info('[TH79 iMove Admin] ADMIN API REQUEST', { method: options.method || 'GET', url });
  const response = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  console.info('[TH79 iMove Admin] ADMIN API RESPONSE', { url, status: response.status, ok: response.ok, payload });
  if(response.status === 401){
    window.dispatchEvent(new Event('imove:admin-auth-expired'));
  }
  if(!response.ok){
    console.error('[TH79 iMove Admin] ADMIN API FAILED', { url, status: response.status, payload });
    throw new Error(payload?.message || payload?.error || `API lỗi ${response.status}`);
  }
  return payload;
}

export function hasPermission(access, permission){
  if(!permission) return true;
  const permissions = Array.isArray(access?.permissions) ? access.permissions : [];
  return permissions.includes('*') || permissions.includes(permission);
}
