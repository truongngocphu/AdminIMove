function parsePort(value, fallback) {
  const parsed = Number(value ?? fallback);

  return Number.isInteger(parsed) &&
    parsed > 0 &&
    parsed <= 65535
    ? parsed
    : fallback;
}

function normalizeHttpBaseUrl(value, fallback = '') {
  const clean = String(value || fallback || '')
    .trim()
    .replace(/\/+$/, '');

  if (!clean) return '';

  try {
    const parsed = new URL(clean);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('unsupported protocol');
    }

    return clean;
  } catch (_) {
    throw new Error(`URL không hợp lệ: ${clean}`);
  }
}

function normalizeHost(value, fallback = '127.0.0.1') {
  const clean = String(value || fallback).trim();

  if (!clean) return fallback;

  return clean;
}

export function resolveAdminPort({
  adminPort,
  corePort,
  fallbackPort = 5060,
}) {
  const core = parsePort(corePort, 5050);
  const requested = parsePort(adminPort, fallbackPort);

  if (requested === core) {
    throw new Error(
      `ADMIN_PORT=${requested} trùng CORE_HTTP_PORT=${core}. ` +
      'Admin Gateway và Core Backend phải dùng hai cổng khác nhau.'
    );
  }

  return {
    port: requested,
    corrected: false,
    reason: null,
  };
}

export function resolveRuntimeConfig(env = process.env) {
  const production =
    String(env.NODE_ENV || '').trim().toLowerCase() === 'production';

  const corePort = parsePort(
    env.CORE_HTTP_PORT,
    5050
  );

  const adminPort = resolveAdminPort({
    adminPort: env.ADMIN_PORT,
    corePort,
  }).port;

  const adminHost = normalizeHost(
    env.ADMIN_HOST,
    production ? '127.0.0.1' : '0.0.0.0'
  );

  const explicitCoreUrl =
    String(env.CORE_BACKEND_URL || '').trim();

  // Production không nên tự fallback sang localhost,
  // vì lỗi ENV sẽ rất khó phát hiện.
  if (production && !explicitCoreUrl) {
    throw new Error(
      'Thiếu CORE_BACKEND_URL trong môi trường production.'
    );
  }

  const coreBackendUrl = normalizeHttpBaseUrl(
    explicitCoreUrl,
    `http://127.0.0.1:${corePort}`
  );

  return {
    adminPort,
    adminHost,
    corePort,
    coreBackendUrl,
  };
}

export function localCoreCandidate(corePort = 5050) {
  const port = parsePort(corePort, 5050);

  return `http://127.0.0.1:${port}`;
}

export function resolveAdminProxyTarget({
  explicitUrl,
  fallbackPort = 5060,
} = {}) {
  return normalizeHttpBaseUrl(
    explicitUrl,
    `http://127.0.0.1:${fallbackPort}`
  );
}
