import React from 'react';
import { Crosshair, MapPin } from 'lucide-react';
import { getTrackAsiaGL, getTrackAsiaStyleUrl, trackAsiaConfig, usesTrackAsiaPublicTestKey } from './trackAsiaConfig.js';

function validPoint(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon)
    && Math.abs(lat) <= 85.0511 && Math.abs(lon) <= 180
    && !(lat === 0 && lon === 0);
}

function pointFromValue(value) {
  if (!value) return null;
  if (typeof value === 'object') {
    const directLat = Number(value.latitude ?? value.lat);
    const directLon = Number(value.longitude ?? value.lng ?? value.lon);
    if (validPoint(directLat, directLon)) return { lat: directLat, lon: directLon };

    const candidates = [value.coordinates, value.location?.coordinates, value.geo?.coordinates, value.geometry?.coordinates];
    for (const coords of candidates) {
      if (!Array.isArray(coords) || coords.length < 2) continue;
      const lon = Number(coords[0]);
      const lat = Number(coords[1]);
      if (validPoint(lat, lon)) return { lat, lon };
    }

    for (const key of ['address', 'addressText', 'name', 'label']) {
      if (typeof value[key] === 'string') {
        const parsed = pointFromValue(value[key]);
        if (parsed) return parsed;
      }
    }
    return null;
  }

  if (typeof value === 'string') {
    const match = value.match(/(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)/);
    if (!match) return null;
    const lat = Number(match[1]);
    const lon = Number(match[2]);
    return validPoint(lat, lon) ? { lat, lon } : null;
  }
  return null;
}

function tripPoint(trip) {
  const directLat = Number(trip?.latitude ?? trip?.pickupLatitude ?? trip?.pickupLat);
  const directLon = Number(trip?.longitude ?? trip?.pickupLongitude ?? trip?.pickupLng ?? trip?.pickupLon);
  if (validPoint(directLat, directLon)) return { lat: directLat, lon: directLon };

  const sources = [
    trip?._pickupRaw,
    trip?.pickupLocation,
    trip?.pickup,
    trip?.origin,
    trip?.startLocation,
    trip?.pickupPoint,
    trip?.pickupCoordinates,
    trip?.pickupCoords,
    trip?._destinationRaw,
    trip?.destinationLocation,
    trip?.destination,
  ];
  for (const source of sources) {
    const point = pointFromValue(source);
    if (point) return point;
  }
  return null;
}

function fitMapToPoints(map, points, { animate = true } = {}) {
  if (!map) return;
  if (!points.length) {
    map.easeTo({
      center: [trackAsiaConfig.defaultCenter.lon, trackAsiaConfig.defaultCenter.lat],
      zoom: 12,
      duration: animate ? 320 : 0,
    });
    return;
  }
  if (points.length === 1) {
    map.easeTo({
      center: [Number(points[0].longitude), Number(points[0].latitude)],
      zoom: 14,
      duration: animate ? 320 : 0,
    });
    return;
  }

  const lons = points.map((point) => Number(point.longitude));
  const lats = points.map((point) => Number(point.latitude));
  map.fitBounds(
    [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
    { padding: 54, maxZoom: 15, duration: animate ? 380 : 0 },
  );
}

function makeTripMarker(trip) {
  const code = String(trip.id || trip.bookingCode || '').trim() || 'Chuyến xe';
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'trackasia-trip-marker';
  element.title = `${code}${trip.pickup ? ` · ${trip.pickup}` : ''}`;
  element.setAttribute('aria-label', `Chuyến ${code}`);

  const dot = document.createElement('span');
  dot.className = 'trackasia-pin-dot';
  dot.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'trackasia-pin-label';
  label.textContent = code;

  element.append(dot, label);
  return element;
}

export default function TripOperationsMap({ trips = [] }) {
  const hostRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const markersRef = React.useRef([]);
  const fittedRef = React.useRef(false);
  const [mapReady, setMapReady] = React.useState(false);
  const [mapError, setMapError] = React.useState('');

  const points = React.useMemo(() => trips.map((trip) => {
    const point = tripPoint(trip);
    return point ? { ...trip, latitude: point.lat, longitude: point.lon } : null;
  }).filter(Boolean), [trips]);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const trackasiagl = getTrackAsiaGL();
    if (!trackasiagl) {
      setMapError('Không tải được TrackAsia GL JS. Kiểm tra kết nối Internet hoặc CDN TrackAsia.');
      return undefined;
    }

    let map;
    try {
      map = new trackasiagl.Map({
        container: host,
        style: getTrackAsiaStyleUrl(),
        center: [trackAsiaConfig.defaultCenter.lon, trackAsiaConfig.defaultCenter.lat],
        zoom: 12,
        minZoom: trackAsiaConfig.minZoom,
        maxZoom: trackAsiaConfig.maxZoom,
        attributionControl: true,
        localIdeographFontFamily: "'Inter', 'Arial Unicode MS', sans-serif",
      });
      mapRef.current = map;

      if (trackasiagl.NavigationControl) {
        map.addControl(new trackasiagl.NavigationControl({ showCompass: false }), 'top-left');
      }
      if (trackasiagl.FullscreenControl) {
        map.addControl(new trackasiagl.FullscreenControl(), 'top-right');
      }

      map.scrollZoom?.enable?.();
      map.dragPan?.enable?.();
      map.doubleClickZoom?.enable?.();
      map.touchZoomRotate?.enable?.();

      map.once('load', () => {
        setMapError('');
        setMapReady(true);
        map.resize?.();
      });
    } catch (error) {
      setMapError(`Không khởi tạo được bản đồ TrackAsia: ${error?.message || 'Lỗi không xác định'}`);
      return undefined;
    }

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => map?.resize?.())
      : null;
    observer?.observe(host);

    return () => {
      observer?.disconnect();
      markersRef.current.forEach((marker) => marker.remove?.());
      markersRef.current = [];
      mapRef.current = null;
      map?.remove?.();
    };
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    const trackasiagl = getTrackAsiaGL();
    if (!map || !trackasiagl || !mapReady) return;

    markersRef.current.forEach((marker) => marker.remove?.());
    markersRef.current = [];

    const visiblePoints = points.slice(0, 50);
    markersRef.current = visiblePoints.map((trip) => new trackasiagl.Marker({
      element: makeTripMarker(trip),
      anchor: 'bottom',
    })
      .setLngLat([Number(trip.longitude), Number(trip.latitude)])
      .addTo(map));

    if (!fittedRef.current) {
      fitMapToPoints(map, visiblePoints, { animate: false });
      fittedRef.current = true;
    }
  }, [mapReady, points]);

  const resetView = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    fitMapToPoints(map, points.slice(0, 50), { animate: true });
  }, [points]);

  return (
    <section className="trip-map-card" aria-labelledby="trip-map-title">
      <header className="trip-map-header">
        <div>
          <h2 id="trip-map-title">Bản đồ điều hành TrackAsia</h2>
          <p>Kéo để di chuyển · lăn chuột/pinch để zoom · dữ liệu vị trí lấy trực tiếp từ chuyến xe.</p>
        </div>
        <div className="trip-map-state">
          <span className="live-badge"><span /> Live</span>
          <span className="trip-map-count">{points.length}/{trips.length} chuyến có tọa độ</span>
        </div>
      </header>

      <div className="trackasia-map-shell">
        <div
          ref={hostRef}
          className="trackasia-trip-map"
          role="region"
          aria-label="Bản đồ TrackAsia hiển thị vị trí các chuyến xe. Có thể kéo để di chuyển và lăn chuột để thu phóng."
        />

        <button className="trackasia-reset-control" type="button" onClick={resetView} title="Đưa bản đồ về khung tự động" aria-label="Đưa bản đồ về khung tự động">
          <Crosshair size={16} />
        </button>

        {!points.length && !mapError && (
          <div className="trackasia-map-empty">
            <MapPin size={20} />
            <span>Chưa có tọa độ hợp lệ trong dữ liệu chuyến</span>
            <small>Bản đồ TrackAsia vẫn hiển thị khu vực TP.HCM.</small>
          </div>
        )}

        {mapError && <div className="trackasia-map-error">{mapError}</div>}
        {usesTrackAsiaPublicTestKey() && <span className="trackasia-key-badge">TrackAsia test key</span>}
      </div>
    </section>
  );
}
