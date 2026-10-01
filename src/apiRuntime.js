const normalizeBase = (value) => String(value || '').trim().replace(/\/+$/, '');

// Single production API origin: Core Backend on the VPS.
// Admin Gateway has been merged into Core, so every Admin request goes directly here.
export const CORE_BACKEND_URL = normalizeBase(
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_CORE_BACKEND_URL ||
  'https://backendimove.daututh79.com'
);

export const ADMIN_API_URL = CORE_BACKEND_URL;
// Backward-compatible alias for existing components. It intentionally points to Core.
export const ADMIN_GATEWAY_URL = ADMIN_API_URL;

export function coreUrl(path = '') {
  const suffix = String(path || '').startsWith('/') ? String(path || '') : `/${path}`;
  return `${CORE_BACKEND_URL}${suffix}`;
}

export function gatewayUrl(path = '') {
  const suffix = String(path || '').startsWith('/') ? String(path || '') : `/${path}`;
  return `${ADMIN_API_URL}${suffix}`;
}
