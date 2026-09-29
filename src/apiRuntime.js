const normalizeBase = (value) => String(value || '').trim().replace(/\/+$/, '');

// Production defaults: frontend on Vercel, Core + Admin Gateway on VPS.
export const CORE_BACKEND_URL = normalizeBase(
  import.meta.env.VITE_CORE_BACKEND_URL || 'https://backendimove.daututh79.com'
);

export const ADMIN_GATEWAY_URL = normalizeBase(
  import.meta.env.VITE_ADMIN_GATEWAY_URL || `${CORE_BACKEND_URL}/admin-gateway`
);

export function coreUrl(path = '') {
  const suffix = String(path || '').startsWith('/') ? String(path || '') : `/${path}`;
  return `${CORE_BACKEND_URL}${suffix}`;
}

export function gatewayUrl(path = '') {
  const suffix = String(path || '').startsWith('/') ? String(path || '') : `/${path}`;
  return `${ADMIN_GATEWAY_URL}${suffix}`;
}
