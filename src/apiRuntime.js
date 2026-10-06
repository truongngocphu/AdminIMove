const FALLBACK_CORE_BACKEND_URL = 'https://backendimove.daututh79.com';

function cleanBaseUrl(value) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '');
}

export const CORE_BACKEND_URL = cleanBaseUrl(
  import.meta.env?.VITE_CORE_BACKEND_URL ||
  import.meta.env?.VITE_API_URL ||
  FALLBACK_CORE_BACKEND_URL
);

export function coreUrl(path = '') {
  const value = String(path || '').trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (!value) return CORE_BACKEND_URL;
  return `${CORE_BACKEND_URL}${value.startsWith('/') ? value : `/${value}`}`;
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const externalSignal = options.signal;

  const abortFromExternal = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', abortFromExternal, { once: true });
  }

  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', abortFromExternal);
    }
  }
}
