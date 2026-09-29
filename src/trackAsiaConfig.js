const TRACKASIA_API_BASE = 'https://maps.track-asia.com';
const DEFAULT_CENTER = Object.freeze({ lat: 10.7769, lon: 106.7009 });

function readEnv(name, fallback = '') {
  const value = String(import.meta.env?.[name] ?? '').trim();
  return value || fallback;
}

export const trackAsiaConfig = Object.freeze({
  apiBaseUrl: readEnv('VITE_TRACKASIA_API_BASE_URL', TRACKASIA_API_BASE),
  apiKey: readEnv('VITE_TRACKASIA_API_KEY', 'public_key'),
  detailLevel: readEnv('VITE_TRACKASIA_DETAIL_LEVEL', 'enhanced'),
  styleUrlOverride: readEnv('VITE_TRACKASIA_STYLE_URL', ''),
  defaultCenter: DEFAULT_CENTER,
  minZoom: 5,
  maxZoom: 18,
});

export function getTrackAsiaStyleUrl() {
  if (trackAsiaConfig.styleUrlOverride) return trackAsiaConfig.styleUrlOverride;
  const params = new URLSearchParams({
    detailLevel: trackAsiaConfig.detailLevel,
    key: trackAsiaConfig.apiKey,
  });
  return `${trackAsiaConfig.apiBaseUrl}/styles/v2/streets.json?${params.toString()}`;
}

export function getTrackAsiaGL() {
  if (typeof window === 'undefined') return null;
  return window.trackasiagl || null;
}

export function usesTrackAsiaPublicTestKey() {
  return trackAsiaConfig.apiKey === 'public_key';
}
