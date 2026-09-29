export const HCM_CENTER = Object.freeze({ lat: 10.7769, lon: 106.7009 });
const TILE = 256;

export function validDriverPoint(row) {
  if (row?.locationValid === false) return false;
  const lat = Number(row?.latitude);
  const lon = Number(row?.longitude);
  return Number.isFinite(lat)
    && Number.isFinite(lon)
    && Math.abs(lat) <= 85.0511
    && Math.abs(lon) <= 180
    && !(lat === 0 && lon === 0);
}

export function projectPoint(lat, lon, zoom) {
  const scale = TILE * (2 ** zoom);
  const x = (lon + 180) / 360 * scale;
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const sin = Math.sin(clampedLat * Math.PI / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

export function unprojectPoint(x, y, zoom) {
  const scale = TILE * (2 ** zoom);
  const lon = (Number(x) / scale) * 360 - 180;
  const mercator = Math.PI - (2 * Math.PI * Number(y)) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(mercator));
  return {
    lat: Math.max(-85.0511, Math.min(85.0511, lat)),
    lon: ((lon + 540) % 360) - 180,
  };
}

function centerOf(points) {
  const minLat = Math.min(...points.map((point) => Number(point.latitude)));
  const maxLat = Math.max(...points.map((point) => Number(point.latitude)));
  const minLon = Math.min(...points.map((point) => Number(point.longitude)));
  const maxLon = Math.max(...points.map((point) => Number(point.longitude)));
  return { lat: (minLat + maxLat) / 2, lon: (minLon + maxLon) / 2 };
}

export function computeMapView(rows, width = 900, height = 360) {
  const points = (Array.isArray(rows) ? rows : []).filter(validDriverPoint);
  if (!points.length) return { center: HCM_CENTER, zoom: 12 };
  if (points.length === 1) {
    return {
      center: { lat: Number(points[0].latitude), lon: Number(points[0].longitude) },
      zoom: 14,
    };
  }

  const center = centerOf(points);
  const usableWidth = Math.max(160, Number(width) - 96);
  const usableHeight = Math.max(160, Number(height) - 96);

  for (let zoom = 16; zoom >= 5; zoom -= 1) {
    const projected = points.map((point) => projectPoint(Number(point.latitude), Number(point.longitude), zoom));
    const xs = projected.map((point) => point.x);
    const ys = projected.map((point) => point.y);
    if ((Math.max(...xs) - Math.min(...xs)) <= usableWidth
      && (Math.max(...ys) - Math.min(...ys)) <= usableHeight) {
      return { center, zoom };
    }
  }
  return { center, zoom: 5 };
}

export function validLivePoint(row, now = Date.now()) {
  if (row?.locationValid === false) return false;
  const lat = Number(row?.latitude ?? row?.lat);
  const lon = Number(row?.longitude ?? row?.lng ?? row?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (Math.abs(lat) > 85.0511 || Math.abs(lon) > 180 || (lat === 0 && lon === 0)) return false;
  const updated = row?.updatedAt ? new Date(row.updatedAt).getTime() : null;
  if (updated !== null && Number.isNaN(updated)) return false;
  // Stale GPS is still a valid point for display; the page marks it stale separately.
  void now;
  return true;
}
