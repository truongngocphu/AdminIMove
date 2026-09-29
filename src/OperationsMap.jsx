import React from 'react';
import { Crosshair } from 'lucide-react';
import { validDriverPoint } from './operationsMapModel.js';
import { getTrackAsiaGL, getTrackAsiaStyleUrl, trackAsiaConfig, usesTrackAsiaPublicTestKey } from './trackAsiaConfig.js';

function fitMapToDrivers(map, points, { animate = true } = {}) {
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

function makeDriverMarker(driver) {
  const busy = String(driver.onlineStatus || '').toUpperCase() === 'BUSY';
  const age = Number.isFinite(Number(driver.locationAgeSeconds)) ? ` · GPS ${driver.locationAgeSeconds}s trước` : '';
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `trackasia-driver-marker ${busy ? 'busy' : 'online'}`;
  element.title = `Tài xế ${String(driver.id || '').slice(-6)} · ${driver.onlineStatus || '—'}${age}`;
  element.setAttribute('aria-label', element.title);
  return element;
}

export default function OperationsMap({ drivers = [] }) {
  const hostRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const markersRef = React.useRef([]);
  const fittedRef = React.useRef(false);
  const [mapReady, setMapReady] = React.useState(false);
  const [mapError, setMapError] = React.useState('');

  const points = React.useMemo(() => drivers.filter(validDriverPoint), [drivers]);
  const invalidCount = Math.max(0, drivers.length - points.length);

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
    markersRef.current = points.map((driver) => new trackasiagl.Marker({
      element: makeDriverMarker(driver),
      anchor: 'center',
    })
      .setLngLat([Number(driver.longitude), Number(driver.latitude)])
      .addTo(map));

    if (!fittedRef.current) {
      fitMapToDrivers(map, points, { animate: false });
      fittedRef.current = true;
    }
  }, [mapReady, points]);

  const resetView = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    fitMapToDrivers(map, points, { animate: true });
  }, [points]);

  const statusText = points.length
    ? `${points.length} tài xế có GPS trực tiếp${invalidCount ? ` · ${invalidCount} chưa có GPS mới` : ''}`
    : 'Chưa có GPS tài xế · đang hiển thị TP.HCM';

  return (
    <section className="operations-map-card">
      <header className="operations-map-header">
        <div>
          <strong>Bản đồ vận hành TrackAsia</strong>
          <span>GPS mới nhất do Driver gửi về Core Backend · kéo để di chuyển · lăn chuột/pinch để zoom.</span>
        </div>
        <span className={`operations-map-status ${points.length ? 'ok' : 'warn'}`}>{statusText}</span>
      </header>

      <div className="trackasia-map-shell">
        <div
          ref={hostRef}
          className="operations-map-canvas trackasia-operations-map"
          role="region"
          aria-label="Bản đồ TrackAsia hiển thị vị trí tài xế. Có thể kéo để di chuyển và lăn chuột để thu phóng."
        />
        <button className="trackasia-reset-control" type="button" onClick={resetView} title="Đưa bản đồ về khung tự động" aria-label="Đưa bản đồ về khung tự động">
          <Crosshair size={16} />
        </button>
        {!points.length && !mapError && <div className="operations-map-empty">Chưa nhận được GPS tài xế hợp lệ</div>}
        {mapError && <div className="trackasia-map-error">{mapError}</div>}
        {usesTrackAsiaPublicTestKey() && <span className="trackasia-key-badge">TrackAsia test key</span>}
      </div>
    </section>
  );
}
